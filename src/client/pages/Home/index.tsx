import { Suspense, use, version } from 'react';
import { browser } from 'react-dom';
import webpackLogo from '@/client/assets/webpack.png';
import { isSSR } from '@/client/util/renderMode';
import style from "./index.module.scss"

const Home = () => {
  return (
    <section className={style.container}>
      <title>Webpack SSR Template - Home</title>
      <h1>Webpack SSR Template</h1>
      <div>
        App Version: <code>{__VERSION__}</code>
      </div>
      <Suspense>
        <BrowserOnly />
      </Suspense>
      <p>React {version} + React Router, rendered on the server and hydrated on the client.</p>
      <p>Render Mode: {isSSR ? 'SSR' : 'Static'}</p>
      <img loading="lazy" src={webpackLogo} alt="Webpack Logo" className={style.webpack} />
    </section>
  );
};

function BrowserOnly() {
  use(browser('This component requires browser APIs.'));
  return <h2>{window?.__env?.NAME}</h2>;
}

export default Home;
