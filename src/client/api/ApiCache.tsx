import { createContext, use, useContext, useState, type ReactNode } from 'react';

type Cache = Map<string, Promise<unknown>>;

const ApiCacheContext = createContext<Cache | null>(null);

/**
 * Holds request promises so use() gets the same promise across re-renders.
 * Mounted in Root: one cache per server request, one per browser session.
 */
export const ApiCacheProvider = ({ children }: { children: ReactNode }) => {
  const [cache] = useState<Cache>(() => new Map());
  return <ApiCacheContext value={cache}>{children}</ApiCacheContext>;
};

/**
 * Suspends until fetcher() resolves. Wrap the caller in <Suspense>.
 */
export function useApi<T>(key: string, fetcher: () => Promise<T>): T {
  const cache = useContext(ApiCacheContext);
  if (!cache) throw new Error('useApi must be used inside <ApiCacheProvider>');

  let promise = cache.get(key) as Promise<T> | undefined;
  if (!promise) {
    promise = fetcher();
    cache.set(key, promise);
  }
  return use(promise);
}
