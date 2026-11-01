import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import Root from '@/client/Root';
import { basename } from '@/client/routes';
import '@/client/index.css';

const container = document.getElementById('root')!;
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
