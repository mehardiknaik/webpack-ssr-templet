import { createContext, use, useContext, useState, type ReactNode } from 'react';

export type ApiCache = Map<string, Promise<unknown>>;

/** Promise fields React's use() reads: a settled promise returns without suspending */
type TrackedPromise<T> = Promise<T> & {
  status?: 'pending' | 'fulfilled' | 'rejected';
  value?: T;
  reason?: unknown;
};

const ApiCacheContext = createContext<ApiCache | null>(null);

/**
 * Holds request promises so use() gets the same promise across re-renders.
 * Mounted in Root: one cache per server request, one per browser session.
 * The server passes its own cache so entry-ssr can stream the resolved data.
 */
export const ApiCacheProvider = ({ cache, children }: { cache?: ApiCache; children: ReactNode }) => {
  const [value] = useState<ApiCache>(() => cache ?? new Map());
  return <ApiCacheContext value={value}>{children}</ApiCacheContext>;
};

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
  const cache = useContext(ApiCacheContext);
  if (!cache) throw new Error('useApi must be used inside <ApiCacheProvider>');

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
