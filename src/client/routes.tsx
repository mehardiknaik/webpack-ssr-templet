import type { RouteObject } from 'react-router';
import Layout from '@/client/components/Layout';
import { lazy } from 'react';

// Code-split pages; the Suspense boundary lives in Layout around <Outlet />.
// webpackChunkName must match the route's handle.chunk: the SSR server uses it to
// link only the current page's CSS/JS (see scripts/ChunksManifestPlugin.ts).
const Home = lazy(() => import(/* webpackChunkName: "page-home" */ '@/client/pages/Home'));
const About = lazy(() => import(/* webpackChunkName: "page-about" */ '@/client/pages/About'));
const Users = lazy(() => import(/* webpackChunkName: "page-users" */ '@/client/pages/Users'));
const UserDetail = lazy(
  () => import(/* webpackChunkName: "page-user-detail" */ '@/client/pages/UserDetail')
);
const NotFound = lazy(
  () => import(/* webpackChunkName: "page-not-found" */ '@/client/pages/NotFound')
);

export interface RouteHandle {
  /** Lazy chunk name (webpackChunkName) of the page rendered by this route */
  chunk?: string;
}

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
      { index: true, element: <Home />, handle: { chunk: 'page-home' } },
      { path: 'about', element: <About />, handle: { chunk: 'page-about' } },
      { path: 'users', element: <Users />, handle: { chunk: 'page-users' } },
      { path: 'users/:id', element: <UserDetail />, handle: { chunk: 'page-user-detail' } },
      { path: '*', element: <NotFound />, handle: { chunk: 'page-not-found' } }
    ]
  }
];

export default routes;
