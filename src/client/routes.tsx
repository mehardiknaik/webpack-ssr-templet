import type { RouteObject } from 'react-router';
import Layout from '@/client/components/Layout';
import { lazy } from 'react';
import withSuspense from './components/withSuspense';

// Code-split pages; the Suspense boundary lives in Layout around <Outlet />.
// scripts/babel-plugin-lazy-chunk.js names each chunk and makes SSR link only the
// rendered page's CSS/JS.
// const Home = lazy(() => import('@/client/pages/Home'));
// const About = lazy(() => import('@/client/pages/About'));
// const Users = lazy(() => import('@/client/pages/Users'));
// const UserDetail = lazy(() => import('@/client/pages/UserDetail'));
// const NotFound = lazy(() => import('@/client/pages/NotFound'));

const Home = withSuspense(
  lazy(() => import('@/client/pages/Home')),
  <div>Loading Home....</div>
);
const About = withSuspense(
  lazy(() => import('@/client/pages/About')),
  <div>Loading About....</div>
);
const Users = withSuspense(
  lazy(() => import('@/client/pages/Users')),
  <div>Loading Users....</div>
);
const UserDetail = withSuspense(
  lazy(() => import('@/client/pages/UserDetail')),
  <div>Loading UserDetail....</div>
);
const NotFound = withSuspense(
  lazy(() => import('@/client/pages/NotFound')),
  <div>Loading NotFound....</div>
);

/**
 * Router basename derived from a public path ("/app/" -> "/app").
 * Accepts absolute URLs too ("https://host/app/" -> "/app"), as produced by publicPath "auto".
 */
export const getBasename = (publicPath = '/') => {
  const pathname = /^[a-z][a-z\d+.-]*:\/\//i.test(publicPath)
    ? new URL(publicPath).pathname
    : publicPath;
  return pathname.replace(/\/$/, '') || '/';
};

/**
 * Route config shared by the client and the server.
 * The server uses it with matchRoutes() to send a 404 status for unknown URLs.
 */
const routes: RouteObject[] = [
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <Home /> },
      { path: 'about', element: <About /> },
      { path: 'users', element: <Users /> },
      { path: 'users/:id', element: <UserDetail /> },
      { path: '*', element: <NotFound /> }
    ]
  }
];

export default routes;
