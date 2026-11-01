import { Suspense } from 'react';
import { NavLink, Outlet } from 'react-router';
import style from './Layout.module.css';

const links = [
  { to: '/', label: 'Home' },
  { to: '/about', label: 'About' },
  { to: '/users', label: 'Users' }
];

const Layout = () => {
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
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
};

export default Layout;
