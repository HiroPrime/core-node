import { JoinList } from "@/components/JoinList";
import { ME, PROJECTS } from "@/lib/me";

export default function Home() {
  return (
    <>
      <main className="page">
        <figure className="panel start">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/charlie/sit-bar.png" alt="Start here." />
        </figure>

        <header className="names">
          <h1>Charlie</h1>
          <h1>Jacob</h1>
          <h1>BasicHiro</h1>
        </header>

        <section className="say">
          <p>I&apos;m a non-binary solo developer.</p>
          <p>I vibe code with Cursor and paint with local Comfy.</p>
          <p>This is my Core.</p>
        </section>

        <figure className="panel look-down">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/charlie/look-down.png" alt="Hey. Look down here." />
        </figure>

        <section id="working-on">
          <h2 className="gold-head">Working on</h2>
          <div className="doors">
            {PROJECTS.map((project) => (
              <a key={project.href} className="door" href={project.href}>
                <h3>{project.name}</h3>
                <p>{project.blurb}</p>
              </a>
            ))}
          </div>
        </section>

        <nav className="social" aria-label="Social">
          <a href={ME.linkedin} target="_blank" rel="noreferrer">
            LinkedIn
          </a>
          <a href={ME.x} target="_blank" rel="noreferrer">
            X
          </a>
        </nav>
      </main>

      <JoinList />

      <div className="page close">
        <p className="bye">Thanks for coming. Hope to see you on the other side.</p>
        <footer className="sign">
          <p>CoreNode</p>
          <p>&copy; {new Date().getFullYear()} CoreNode</p>
        </footer>
      </div>
    </>
  );
}
