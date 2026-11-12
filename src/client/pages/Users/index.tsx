import { Suspense } from 'react';
import { Link } from 'react-router';
import { useApi, useApiRefresh } from '@/client/api/ApiCache';
import { fetchUsers } from '@/client/api/users';
import style from "./index.module.css"

const UserList = () => {
  const users = useApi('users', fetchUsers);

  return (
    <>
      <ul>
        {users.map((user) => (
          <li key={user.id}>
            <Link to={`/users/${user.id}`}>{user.name}</Link>
          </li>
        ))}
      </ul>
    </>
  );
};

const Users = () => {
  const { refresh, isRefreshing } = useApiRefresh();
  return (
    <section className={style.container}>
      <title>Webpack SSR Template - Users</title>
      <div className={style.header}>
        <h1>Users</h1>
        <button type="button" onClick={() => refresh('users')} disabled={isRefreshing}>
          {isRefreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>
      {/* Heading is sent in the shell; the list streams in when fetchUsers() resolves */}
      <Suspense fallback={<p>Loading users...</p>}>
        <UserList />
      </Suspense>
    </section>
  );
};

export default Users;
