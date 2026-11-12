import {
  createContext,
  use,
  useCallback,
  useContext,
  useMemo,
  useState,
  useTransition,
  type ReactNode,
} from 'react';

export type ApiCache = Map<string, Promise<unknown>>;

/** Promise fields React's use() reads: a settled promise returns without suspending */
type TrackedPromise<T> = Promise<T> & {
  status?: 'pending' | 'fulfilled' | 'rejected';
  value?: T;
  reason?: unknown;
};

interface ApiCacheContextValue {
  cache: ApiCache;
  /** Drops cached entries (all when no key) so the next render refetches them */
  invalidate: (key?: string) => void;
}

const ApiCacheContext = createContext<ApiCacheContextValue | null>(null);

/**
 * Holds request promises so use() gets the same promise across re-renders.
 * Mounted in Root: one cache per server request, one per browser session.
 * The server passes its own cache so entry-ssr can stream the resolved data.
 */
export const ApiCacheProvider = ({ cache, children }: { cache?: ApiCache; children: ReactNode }) => {
  const [store] = useState<ApiCache>(() => cache ?? new Map());
  // Bumped on invalidate so every useApi consumer re-renders and refetches
  const [version, setVersion] = useState(0);

  const invalidate = useCallback(
    (key?: string) => {
      if (key === undefined) store.clear();
      else store.delete(key);

      // Also drop streamed server data, or serverData() would return the stale value
      if (typeof window !== 'undefined' && window.__API_DATA__) {
        if (key === undefined) window.__API_DATA__ = {};
        else delete window.__API_DATA__[key];
      }
      setVersion((v) => v + 1);
    },
    [store]
  );

  // version in deps gives consumers a new context value after each invalidate
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const value = useMemo(() => ({ cache: store, invalidate }), [store, invalidate, version]);
  return <ApiCacheContext value={value}>{children}</ApiCacheContext>;
};

/**
 * Manual refresh for cached API data.
 * refresh('users') refetches one key; refresh() refetches everything.
 * Runs in a transition, so the current data stays on screen while the new request loads.
 */
export function useApiRefresh(): { refresh: (key?: string) => void; isRefreshing: boolean } {
  const ctx = useContext(ApiCacheContext);
  if (!ctx) throw new Error('useApiRefresh must be used inside <ApiCacheProvider>');

  const { invalidate } = ctx;
  const [isRefreshing, startTransition] = useTransition();
  const refresh = useCallback(
    (key?: string) => startTransition(() => invalidate(key)),
    [invalidate]
  );
  return { refresh, isRefreshing };
}

function track<T>(promise: Promise<T>): TrackedPromise<T> {
  const tracked = promise as TrackedPromise<T>;
  tracked.status = 'pending';
  tracked.then(
    (value) => {
      tracked.status = 'fulfilled';
      tracked.value = value;
    },
    (reason) => {
      tracked.status = 'rejected';
      tracked.reason = reason;
    }
  );
  return tracked;
}

function fulfilled<T>(value: T): TrackedPromise<T> {
  const promise = Promise.resolve(value) as TrackedPromise<T>;
  promise.status = 'fulfilled';
  promise.value = value;
  return promise;
}

/** Data the server streamed into the page (see dehydrate), so hydration doesn't refetch */
function serverData(key: string): { value: unknown } | undefined {
  if (typeof window === 'undefined') return undefined;
  const data = window.__API_DATA__;
  return data && key in data ? { value: data[key] } : undefined;
}

/**
 * Suspends until fetcher() resolves. Wrap the caller in <Suspense>.
 */
export function useApi<T>(key: string, fetcher: () => Promise<T>): T {
  const ctx = useContext(ApiCacheContext);
  if (!ctx) throw new Error('useApi must be used inside <ApiCacheProvider>');
  const { cache } = ctx;

  let promise = cache.get(key) as Promise<T> | undefined;
  if (!promise) {
    const data = serverData(key);
    promise = data ? fulfilled(data.value as T) : track(fetcher());
    cache.set(key, promise);
  }
  return use(promise);
}

/**
 * <script> tags that copy newly resolved cache entries into window.__API_DATA__.
 * Keys already in `sent` are skipped; failed requests are left for the client to retry.
 */
export function dehydrate(cache: ApiCache, sent: Set<string>): string {
  let html = '';
  for (const [key, promise] of cache) {
    const tracked = promise as TrackedPromise<unknown>;
    if (sent.has(key) || tracked.status !== 'fulfilled') continue;
    sent.add(key);
    // Escape "<" so the JSON can't close the <script> tag
    const js = `(window.__API_DATA__=window.__API_DATA__||{})[${JSON.stringify(key)}]=${JSON.stringify(tracked.value) ?? 'undefined'}`;
    html += `<script>${js.replace(/</g, '\\u003c')}</script>`;
  }
  return html;
}
