import { useRoutes } from 'react-router';
import routes from '@/client/routes';

const App = () => {
  return useRoutes(routes);
};

export default App;
