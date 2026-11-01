import { version } from 'react';
import webpackLogo from '@/client/assets/webpack.png';
import style from "./index.module.css"
import useIsClient from '@/client/hooks/useIsClient';


const Home = () => {
  const isClient = useIsClient()
  return (
    <section className={style.container}>
      <title>Webpack SSR Template - Home</title>
      <h1>Webpack SSR Template</h1>
      <div>
        App Version: <code>{__VERSION__}</code>
      </div>
      {isClient && <h2>{window?.__env?.NAME}</h2>}
      <p>React {version} + React Router, rendered on the server and hydrated on the client.</p>
      <img loading="lazy" src={webpackLogo} alt="Webpack Logo" className={style.webpack} />
    </section>
  );
};

export default Home;
