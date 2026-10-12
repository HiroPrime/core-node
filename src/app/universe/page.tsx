import type { Metadata } from "next";
import Link from "next/link";
import ArcadeSpaceBackdrop from "@/components/ArcadeSpaceBackdrop";
import { CircuitGrid } from "@/components/CircuitGrid";
import { ControllerBadge } from "@/components/ControllerBadge";
import { CREED } from "@/lib/lore-data";
import { MANIFESTO } from "@/lib/universe";

export const metadata: Metadata = {
  title: "My Universe — BasicHiro",
  description:
    "The manifesto. Why I do what I do — product designer first, developer second, and an AI vibe coder who talks more than she types.",
};

/**
 * My Universe — the manifesto page.
 *
 * The first item on the Press Start menu. All copy comes from MANIFESTO in
 * lib/universe.ts, which is sourced from content/lore.md — nothing here is
 * invented. Scrolling page: this is the one screen where reading is the point.
 */
export default function UniversePage() {
  return (
    <main className="arcade">
      <ArcadeSpaceBackdrop className="opacity-50" />
      <CircuitGrid />

      <div className="arcade-inner is-scrolling">
        <header className="page-head">
          <Link href="/" className="page-back arcade-label">
            &#8592; Core Node
          </Link>
          <p className="arcade-kicker">My Universe</p>
          <h1 className="page-title">Why I do what I do</h1>
          <p className="page-lede">
            The Nexus is not a portfolio. It is a machine that builds itself, one Node
            at a time, with a person at the center who mostly talks.
          </p>
        </header>

        {MANIFESTO.map((section) => (
          <section key={section.heading} className="stack-group">
            <h2>{section.heading}</h2>
            {section.lines.map((line) => (
              <p key={line} className="machine-reality">
                {line}
              </p>
            ))}
          </section>
        ))}

        <section className="stack-group">
          <h2>The Creed</h2>
          <p className="stack-note">Five rules the house runs on.</p>
          <ul className="creed">
            {CREED.map((item) => (
              <li key={item.line}>
                <span className="creed-line">{item.line}</span>
                <p className="creed-note">{item.note}</p>
              </li>
            ))}
          </ul>
        </section>

        <div className="brief-actions">
          <Link href="/select" className="btn primary">
            Enter the Level Select
          </Link>
          <Link href="/stack" className="btn ghost">
            See the Tech Stack
          </Link>
        </div>
      </div>

      <ControllerBadge />
    </main>
  );
}
