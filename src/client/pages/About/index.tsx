
import style from "./index.module.css"

const About = () => {
  return (
    <section className={style.container}>
      <h1>About</h1>
      <p>Version {__VERSION__}</p>
    </section>
  );
};

export default About;
