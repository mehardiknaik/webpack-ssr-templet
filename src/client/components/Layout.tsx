import { Suspense } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router';
import style from './Layout.module.css';
import { ErrorBoundary } from './ErrorBoundary';

const links = [
  { to: '/', label: 'Home' },
  { to: '/about', label: 'About' },
  { to: '/users', label: 'Users' }
];

const Layout = () => {
  const { pathname } = useLocation()
  return (
    <div className={style.layout}>
      <nav className={style.nav}>
        {links.map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => (isActive ? `${style.link} ${style.active}` : style.link)}
          >
            {label}
          </NavLink>
        ))}
      </nav>
      <main className={style.main}>
        {/* Stays mounted across navigations, so router transitions keep the old page until the next chunk loads */}
        <Suspense fallback={<p>Loading...</p>}>
          <ErrorBoundary resetKeys={[pathname]}>
            <Outlet />
          </ErrorBoundary>
        </Suspense>
      </main>
    </div>
  );
};

export default Layout;
