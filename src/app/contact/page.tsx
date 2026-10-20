import type { Metadata } from "next";
import Link from "next/link";
import ArcadeSpaceBackdrop from "@/components/ArcadeSpaceBackdrop";
import { CircuitGrid } from "@/components/CircuitGrid";
import { ME, PROJECTS } from "@/lib/me";

export const metadata: Metadata = {
  title: "Contact",
  description: "Reach BasicHiro: email, LinkedIn, and X.",
};

export default function ContactPage() {
  return (
    <main className="arcade">
      <ArcadeSpaceBackdrop className="is-faint" />
      <CircuitGrid />

      <div className="arcade-inner is-scrolling">
        <header className="page-head">
          <Link href="/" className="page-back arcade-label">
            &#8592; Core Node
          </Link>
          <p className="arcade-kicker">Contact</p>
          <h1 className="page-title">Say hi</h1>
          <p className="page-lede">It&apos;s just me here, so every message lands with me.</p>
        </header>

        <section className="stack-group">
          <h2>Signal</h2>
          <p className="machine-reality">
            Email: <a className="contact-link" href={`mailto:${ME.email}`}>{ME.email}</a>
          </p>
          <p className="machine-reality">
            LinkedIn:{" "}
            <a className="contact-link" href={ME.linkedin} target="_blank" rel="noopener noreferrer me">
              {ME.linkedin.replace("https://www.", "")}
            </a>
          </p>
          <p className="machine-reality">
            X:{" "}
            <a className="contact-link" href={ME.x} target="_blank" rel="noopener noreferrer me">
              @basic_hiro
            </a>
          </p>
        </section>

        <section className="stack-group">
          <h2>What I&apos;m building</h2>
          {PROJECTS.map((project) => (
            <p key={project.name} className="machine-reality">
              <a
                className="contact-link"
                href={project.href}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: project.color }}
              >
                {project.name}
              </a>{" "}
              &middot; {project.tag}. {project.blurb}
            </p>
          ))}
        </section>
      </div>
    </main>
  );
}