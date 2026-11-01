import App from '@/client/App';
import { ApiCacheProvider } from '@/client/api/ApiCache';
import { ErrorBoundary } from '@/client/components/ErrorBoundary';

/**
 * App root shared by the client (index.tsx) and the server (entry-ssr.tsx),
 * so both render an identical tree for hydration.
 */
const Root = () => (
  <ApiCacheProvider>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </ApiCacheProvider>
);

export default Root;
