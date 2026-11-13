// Must stay first: sets __webpack_public_path__ before anything else loads
import '@/client/publicPath';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import Root from '@/client/Root';
import { getBasename } from '@/client/routes';
import '@/client/index.scss';

const container = document.getElementById('root')!;
// Same value the server used (window.__PUBLIC_PATH__), or the auto-detected one
const basename = getBasename(__webpack_public_path__);
const app = (
  <BrowserRouter basename={basename}>
    <Root />
  </BrowserRouter>
);

// Hydrate when the server rendered markup, otherwise render from scratch (CSR)
if (container.firstElementChild) {
  ReactDOM.hydrateRoot(container, app);
} else {
  ReactDOM.createRoot(container).render(app);
}
