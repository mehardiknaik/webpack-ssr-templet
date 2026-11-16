import { lazy, Suspense } from 'react';
import { useApi, useApiRefresh } from '@/client/api/ApiCache';
import { fetchUsers } from '@/client/api/users';
import style from "./index.module.css"

const User = lazy(() => import("@/client/components/User"))

const UserList = () => {
  const users = useApi('users', fetchUsers);

  return (
    <>
      <ul>
        {users.map((user) => (
          <User key={user.id} user={user} />
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
