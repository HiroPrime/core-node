import type { Metadata } from "next";
import Link from "next/link";
import ArcadeSpaceBackdrop from "@/components/ArcadeSpaceBackdrop";
import { CircuitGrid } from "@/components/CircuitGrid";
import { ME } from "@/lib/me";

export const metadata: Metadata = {
  title: "Terms",
  description: "The simple rules for using Core Node and the Arcade.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <main className="arcade">
      <ArcadeSpaceBackdrop className="is-faint" />
      <CircuitGrid />

      <div className="arcade-inner is-scrolling">
        <header className="page-head">
          <Link href="/" className="page-back arcade-label">
            &#8592; Core Node
          </Link>
          <p className="arcade-kicker">Terms</p>
          <h1 className="page-title">Terms of use</h1>
          <p className="page-lede">
            Short and plain. By using corenode.nexus you agree to these. Last updated October 20, 2026.
          </p>
        </header>

        <section className="stack-group">
          <h2>What this is</h2>
          <p className="machine-reality">
            Core Node is the personal site of BasicHiro, a solo developer. The Arcade is a small online
            arcade where you walk the floor, play games, and chase high scores on a shared leaderboard. It
            is free to play.
          </p>
        </section>

        <section className="stack-group">
          <h2>Be decent</h2>
          <p className="machine-reality">
            No cheating, no exploiting bugs or tampering with scores, no attacking or overloading the site,
            and no offensive or impersonating names. If you find a bug, telling me beats abusing it.
          </p>
        </section>

        <section className="stack-group">
          <h2>Scores and accounts</h2>
          <p className="machine-reality">
            Leaderboards and seasons can be reset. I may remove scores, or remove accounts, that abuse the
            arcade or break these rules.
          </p>
        </section>

        <section className="stack-group">
          <h2>No warranty</h2>
          <p className="machine-reality">
            The site and games are provided as-is, without any warranty. Things may break, change, go
            offline, or disappear, and scores may be lost.
          </p>
        </section>

        <section className="stack-group">
          <h2>Your privacy</h2>
          <p className="machine-reality">
            What is collected and why is in the <Link className="contact-link" href="/privacy">privacy policy</Link>.
            The site is not directed at children under 13.
          </p>
        </section>

        <section className="stack-group">
          <h2>Changes</h2>
          <p className="machine-reality">
            These terms may change. When they do, the date above is updated, and continuing to use the site
            means you accept the new version.
          </p>
        </section>

        <section className="stack-group">
          <h2>Contact</h2>
          <p className="machine-reality">
            Email <a className="contact-link" href={`mailto:${ME.email}`}>{ME.email}</a> or use the{" "}
            <Link className="contact-link" href="/contact">contact page</Link>.
          </p>
        </section>
      </div>
    </main>
  );
}