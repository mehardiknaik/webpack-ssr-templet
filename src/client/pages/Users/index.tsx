import { Suspense, lazy } from 'react';
import { useApi, useApiRefresh } from '@/client/api/ApiCache';
import { fetchUsers } from '@/client/api/users';
// import { Skeleton, User } from "@/client/components/User"
import style from "./index.module.scss"

const User = lazy(() => import("@/client/components/User"))

const sk = Array.from({ length: 10 }).fill(1)

const UserList = () => {
  const users = useApi('users', fetchUsers, { cache: typeof window !== "undefined" });
  return (
    <>
      {users?.map((user, index) => (
        <User key={index} user={user} />
      ))}
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
      <div className={style.gridContainer}>
        <Suspense fallback={sk.map((_, x) => <Skeleton key={x} />)}>
          <UserList />
        </Suspense>
      </div>
    </section>
  );
};

const Skeleton = () => {
  return (<div className={`${style.card} ${style.skeleton}`}></div>)
}

export default Users;
