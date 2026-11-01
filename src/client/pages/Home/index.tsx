import { version } from 'react';
import webpackLogo from '@/client/assets/webpack.png';
import style from "./index.module.css"


const Home = () => {
  return (
    <section className={style.container}>
      <h1>Webpack SSR Template</h1>
      <div>
        App Version: <code>{__VERSION__}</code>
      </div>
      <p>React {version} + React Router, rendered on the server and hydrated on the client.</p>
      <img loading="lazy" src={webpackLogo} alt="Webpack Logo" className={style.webpack} />
    </section>
  );
};

export default Home;
