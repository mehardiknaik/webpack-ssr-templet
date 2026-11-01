import App from '@/client/App';
import { ApiCacheProvider, type ApiCache } from '@/client/api/ApiCache';
import { ErrorBoundary } from '@/client/components/ErrorBoundary';

/**
 * App root shared by the client (index.tsx) and the server (entry-ssr.tsx),
 * so both render an identical tree for hydration.
 * The server passes apiCache so it can stream the fetched data to the client.
 */
const Root = ({ apiCache }: { apiCache?: ApiCache }) => (
  <ApiCacheProvider cache={apiCache}>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </ApiCacheProvider>
);

export default Root;
