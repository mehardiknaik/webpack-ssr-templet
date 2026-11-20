import {
  createContext,
  startTransition,
  use,
  useCallback,
  useContext,
  useEffect,
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
  /** Date.now() when the promise settled, for the cache max age */
  settledAt?: number;
  /** A background refetch of this stale entry is running */
  revalidating?: boolean;
  /** Not streamed to the client in window.__API_DATA__ (cache: false) */
  skipDehydrate?: boolean;
};

export interface UseApiOptions {
  /**
   * How long the result stays cached:
   * - true (default): for the whole session, until refresh() / invalidate
   * - false: until the last component using the key unmounts; the next mount refetches
   * - number: max age in ms. An older value is still returned while it refetches in the
   *   background, then consumers re-render with the new value (stale-while-revalidate)
   */
  cache?: boolean | number;

  /**
   * true: return the cached promise instead of suspending, e.g. to pass it to a child
   * that calls use() on it
   */
  asPromise?: boolean;
}

interface ApiCacheContextValue {
  cache: ApiCache;
  /** Drops cached entries (all when no key) so the next render refetches them */
  invalidate: (key?: string) => void;
  /** Mounted consumers per key, for cache: false */
  refs: Map<string, number>;
  /** Re-renders every useApi consumer, e.g. after a background refetch */
  notify: () => void;
}

const ApiCacheContext = createContext<ApiCacheContextValue | null>(null);

/** Drops cached entries (all when no key), including data streamed by the server */
function drop(store: ApiCache, key?: string) {
  if (key === undefined) store.clear();
  else store.delete(key);

  // Also drop streamed server data, or serverData() would return the stale value
  if (typeof window !== 'undefined' && window.__API_DATA__) {
    if (key === undefined) window.__API_DATA__ = {};
    else delete window.__API_DATA__[key];
  }
}

/**
 * Holds request promises so use() gets the same promise across re-renders.
 * Mounted in Root: one cache per server request, one per browser session.
 * The server passes its own cache so entry-ssr can stream the resolved data.
 */
export const ApiCacheProvider = ({ cache, children }: { cache?: ApiCache; children: ReactNode }) => {
  const [store] = useState<ApiCache>(() => cache ?? new Map());
  // Bumped on invalidate so every useApi consumer re-renders and refetches
  const [version, setVersion] = useState(0);
  const [refs] = useState(() => new Map<string, number>());

  const invalidate = useCallback(
    (key?: string) => {
      drop(store, key);
      setVersion((v) => v + 1);
    },
    [store]
  );

  // Transition: the new data is already resolved, so nothing suspends or flashes a fallback
  const notify = useCallback(() => startTransition(() => setVersion((v) => v + 1)), []);

  // version in deps gives consumers a new context value after each invalidate / notify
  const value = useMemo(
    () => ({ cache: store, invalidate, refs, notify }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [store, invalidate, refs, notify, version]
  );
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
  const [isRefreshing, startRefresh] = useTransition();
  const refresh = useCallback((key?: string) => startRefresh(() => invalidate(key)), [invalidate]);
  return { refresh, isRefreshing };
}

function track<T>(promise: Promise<T>): TrackedPromise<T> {
  const tracked = promise as TrackedPromise<T>;
  tracked.status = 'pending';
  tracked.then(
    (value) => {
      tracked.status = 'fulfilled';
      tracked.value = value;
      tracked.settledAt = Date.now();
    },
    (reason) => {
      tracked.status = 'rejected';
      tracked.reason = reason;
      tracked.settledAt = Date.now();
    }
  );
  return tracked;
}

function fulfilled<T>(value: T): TrackedPromise<T> {
  const promise = Promise.resolve(value) as TrackedPromise<T>;
  promise.status = 'fulfilled';
  promise.value = value;
  promise.settledAt = Date.now();
  return promise;
}

/** Fulfilled entry older than maxAge. Client only: the server cache lives for one request. */
function isStale(promise: TrackedPromise<unknown>, maxAge: number) {
  return (
    typeof window !== 'undefined' &&
    promise.status === 'fulfilled' &&
    Date.now() - (promise.settledAt ?? 0) > maxAge
  );
}

/** Refetches a stale entry in the background; consumers keep the old value until it resolves */
function revalidate<T>(
  { cache, notify }: ApiCacheContextValue,
  key: string,
  stale: TrackedPromise<T>,
  fetcher: () => Promise<T>
) {
  if (stale.revalidating) return;
  stale.revalidating = true;
  fetcher().then(
    (value) => {
      // Skip if the entry was invalidated or replaced meanwhile
      if (cache.get(key) !== stale) return;
      cache.set(key, fulfilled(value));
      notify();
    },
    () => {
      // Keep the stale value; retry once it is maxAge old again
      stale.revalidating = false;
      stale.settledAt = Date.now();
    }
  );
}

/** Data the server streamed into the page (see dehydrate), so hydration doesn't refetch */
function serverData(key: string): { value: unknown } | undefined {
  if (typeof window === 'undefined') return undefined;
  const data = window.__API_DATA__;
  return data && key in data ? { value: data[key] } : undefined;
}

/**
 * Suspends until fetcher() resolves. Wrap the caller in <Suspense>.
 * See UseApiOptions.cache for how long the result is kept.
 */
export function useApi<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: UseApiOptions & { asPromise: true }
): Promise<T>;
export function useApi<T>(
  key: string,
  fetcher: () => Promise<T>,
  options?: UseApiOptions & { asPromise?: false }
): T;
export function useApi<T>(
  key: string,
  fetcher: () => Promise<T>,
  options?: UseApiOptions
): T | Promise<T>;
export function useApi<T>(
  key: string,
  fetcher: () => Promise<T>,
  { cache: cacheOption = true, asPromise = false }: UseApiOptions = {}
): T | Promise<T> {
  const ctx = useContext(ApiCacheContext);
  if (!ctx) throw new Error('useApi must be used inside <ApiCacheProvider>');
  const { cache, refs } = ctx;

  // cache: false -> drop the entry once no mounted component uses the key
  useEffect(() => {
    if (cacheOption !== false) return;
    refs.set(key, (refs.get(key) ?? 0) + 1);
    return () => {
      const count = (refs.get(key) ?? 1) - 1;
      if (count > 0) {
        refs.set(key, count);
        return;
      }
      refs.delete(key);
      // Deferred so an immediate remount (StrictMode, moved component) keeps the entry
      setTimeout(() => {
        if (!refs.has(key)) drop(cache, key);
      }, 0);
    };
  }, [key, cacheOption, cache, refs]);

  let promise = cache.get(key) as TrackedPromise<T> | undefined;
  if (!promise) {
    const data = serverData(key);
    promise = data ? fulfilled(data.value as T) : track(fetcher());
    cache.set(key, promise);
  } else if (typeof cacheOption === 'number' && isStale(promise, cacheOption)) {
    revalidate(ctx, key, promise, fetcher);
  }
  // cache: false -> the server doesn't stream this data; the client fetches it itself
  if (cacheOption === false) promise.skipDehydrate = true;
  if (asPromise) return promise;
  return use(promise as Promise<T>);
}

/**
 * <script> tags that copy newly resolved cache entries into window.__API_DATA__.
 * Keys already in `sent` are skipped; failed requests are left for the client to retry.
 * Entries used with cache: false are never sent.
 */
export function dehydrate(cache: ApiCache, sent: Set<string>): string {
  let html = '';
  for (const [key, promise] of cache) {
    const tracked = promise as TrackedPromise<unknown>;
    if (sent.has(key) || tracked.skipDehydrate || tracked.status !== 'fulfilled') continue;
    sent.add(key);
    // Escape "<" so the JSON can't close the <script> tag
    const js = `(window.__API_DATA__=window.__API_DATA__||{})[${JSON.stringify(key)}]=${JSON.stringify(tracked.value) ?? 'undefined'}`;
    html += `<script>${js.replace(/</g, '\\u003c')}</script>`;
  }
  return html;
}
