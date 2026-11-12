import { Suspense } from 'react';
import { Link, useParams } from 'react-router';
import { useApi, useApiRefresh } from '@/client/api/ApiCache';
import { fetchUser } from '@/client/api/users';
import style from "./index.module.css"

const UserInfo = ({ id }: { id: string }) => {
  const user = useApi(`user:${id}`, () => fetchUser(id));

  if (!user) {
    return <h1>User not found</h1>;
  }

  return (
    <div>
      <title>{`Webpack SSR Template - ${user.name}`}</title>
      <h1>{user.name}</h1>
      <p>{user.email}</p>
    </div>
  );
};

const UserDetail = () => {
  const { id = '' } = useParams();
  const { refresh, isRefreshing } = useApiRefresh();
  return (
    <section className={style.container}>
      <Suspense fallback={<p>Loading user...</p>}>
        <UserInfo id={id} />
      </Suspense>
      <Link to="/users">Back to users</Link>
      <button type="button" onClick={() => refresh(`user:${id}`)} disabled={isRefreshing}>
        {isRefreshing ? 'Refreshing...' : 'Refresh'}
      </button>
    </section>
  );
};

export default UserDetail;
