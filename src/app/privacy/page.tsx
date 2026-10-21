import type { Metadata } from "next";
import Link from "next/link";
import ArcadeSpaceBackdrop from "@/components/ArcadeSpaceBackdrop";
import { CircuitGrid } from "@/components/CircuitGrid";
import { ME } from "@/lib/me";

export const metadata: Metadata = {
  title: "Privacy",
  description: "What Core Node and the Arcade collect, why, and how to get it deleted. Plain English.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <main className="arcade">
      <ArcadeSpaceBackdrop className="is-faint" />
      <CircuitGrid />

      <div className="arcade-inner is-scrolling">
        <header className="page-head">
          <Link href="/" className="page-back arcade-label">
            &#8592; Core Node
          </Link>
          <p className="arcade-kicker">Privacy</p>
          <h1 className="page-title">Privacy policy</h1>
          <p className="page-lede">
            Core Node (corenode.nexus) is built and run by one person, BasicHiro. This is what the site
            collects and why, in plain words. Last updated October 20, 2026.
          </p>
        </header>

        <section className="stack-group">
          <h2>Signing in</h2>
          <p className="machine-reality">
            You can browse the site and play the arcade as a guest without an account. To save scores to
            the leaderboard you sign in with Google, Discord, or an email and password. Sign-in is handled
            by Supabase Auth; I never see your Google or Discord password.
          </p>
        </section>

        <section className="stack-group">
          <h2>What is stored</h2>
          <p className="machine-reality">
            For signed-in players, stored in Supabase: your account id, email address, the display name or
            username your sign-in provider shares, your avatar if the provider gives one, the arcade
            character you pick, and your high scores per game with the time they were set and the season.
          </p>
          <p className="machine-reality">
            Guests: scores stay in your own browser (localStorage) and are never sent to me.
          </p>
          <p className="machine-reality">
            Your browser also keeps a small single-session login stamp in localStorage so the same account
            is only active in one place at a time, plus your chosen character and local high scores.
          </p>
        </section>

        <section className="stack-group">
          <h2>Live on the arcade floor</h2>
          <p className="machine-reality">
            While you are on the arcade floor, your position, direction, character, and name are broadcast
            in real time to other signed-in players so they can see you walk around. This is live only and
            is not stored.
          </p>
        </section>

        <section className="stack-group">
          <h2>Spectator mode</h2>
          <p className="machine-reality">
            While you play a game, other signed-in players standing near your machine can choose to watch a
            live video of your game screen along with your name and score. Only the game canvas is shared,
            never your camera, microphone, or other tabs. The video goes peer-to-peer between browsers
            (WebRTC), using a public Google STUN server only to help the two browsers connect. It is not
            recorded or saved.
          </p>
        </section>

        <section className="stack-group">
          <h2>Visitor count</h2>
          <p className="machine-reality">
            On your first visit the site sets a cookie with a random id (cn_vid) and adds one to a total
            unique-visitor count stored in Supabase (site_metrics). The public stats only show that total
            number.
          </p>
        </section>

        <section className="stack-group">
          <h2>Who else is involved</h2>
          <p className="machine-reality">
            The site is hosted on Vercel. Accounts and scores live in Supabase. Google and Discord handle
            sign-in if you choose them. That is it: no ads, no selling personal data, no using it for
            advertising or third-party marketing, and no sharing beyond the services needed to run the site.
          </p>
        </section>

        <section className="stack-group">
          <h2>How long it is kept</h2>
          <p className="machine-reality">
            Account data and scores are kept while your account exists. Leaderboards and seasons may be
            reset by admins. If you ask, I will delete your account and its data.
          </p>
        </section>

        <section className="stack-group">
          <h2>Kids</h2>
          <p className="machine-reality">The site is not directed at children under 13.</p>
        </section>

        <section className="stack-group">
          <h2>Questions or deletion</h2>
          <p className="machine-reality">
            Email <a className="contact-link" href={`mailto:${ME.email}`}>{ME.email}</a> or use the{" "}
            <Link className="contact-link" href="/contact">contact page</Link>. If this policy changes, the
            date above changes with it. See also the{" "}
            <Link className="contact-link" href="/terms">terms</Link>.
          </p>
        </section>
      </div>
    </main>
  );
}