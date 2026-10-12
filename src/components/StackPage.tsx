"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import ArcadeSpaceBackdrop from "@/components/ArcadeSpaceBackdrop";
import { CircuitGrid } from "@/components/CircuitGrid";
import { CoreNodeLogo } from "@/components/CoreNodeLogo";
import { CREED, MACHINERY, OPERATOR } from "@/lib/lore-data";

/**
 * StackPage — the OPTIONS screen.
 *
 * The Machinery, grouped by what it does: the Forge that makes pictures, the Desk
 * that turns talking into building, the House that remembers and charges, and the
 * two Machines the whole thing runs on. Then the Creed — the five rules — and the
 * Operator at the bottom, since this whole page is really about who runs it.
 */

export function StackPage() {
  return (
    <main className="arcade">
      <ArcadeSpaceBackdrop />
      <CircuitGrid />

      <div className="arcade-inner is-scrolling">
        <header className="brief">
          <div className="ns-head" style={{ position: "static", padding: 0 }}>
            <Link href="/" className="ns-brand" aria-label="Back to Core Node">
              <CoreNodeLogo size={24} />
              <span className="ns-brand-text">Core Node</span>
            </Link>
            <span className="arcade-kicker">Options</span>
          </div>

          <h1 className="brief-title mt-8">The Machinery</h1>
          <p className="brief-what mt-4" style={{ color: "var(--mute)", fontSize: 19 }}>
            Every piece has a name inside the world and a real name outside it. This is
            both.
          </p>
        </header>

        {MACHINERY.map((group) => (
          <section className="stack-group" key={group.group}>
            <h2>{group.group}</h2>
            <p className="stack-note">{group.note}</p>
            {group.machines.map((machine) => (
              <div className="machine" key={machine.name}>
                <p className="machine-name">{machine.name}</p>
                <p className="machine-reality">{machine.reality}</p>
              </div>
            ))}
          </section>
        ))}

        <section className="stack-group">
          <h2>The Creed</h2>
          <p className="stack-note">Five rules. They do not bend.</p>
          <ul className="creed">
            {CREED.map((rule) => (
              <li key={rule.line}>
                <span className="creed-line">{rule.line}</span>
                <p className="creed-note">{rule.note}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="stack-group" style={{ borderBottom: "none" }}>
          <h2>The Operator</h2>
          <p className="stack-note">{OPERATOR.creed}</p>
          <div className="machine">
            <p className="machine-name">Also known as</p>
            <p className="machine-reality">{OPERATOR.names.join(" · ")}</p>
          </div>
          <div className="machine">
            <p className="machine-name">What I do</p>
            <p className="machine-reality">{OPERATOR.role}</p>
          </div>
          <div className="machine">
            <p className="machine-name">Reach me</p>
            <p className="machine-reality">
              <a href={`mailto:${OPERATOR.email}`} style={{ color: "var(--gold)" }}>
                {OPERATOR.email}
              </a>
            </p>
          </div>
        </section>

        <div className="brief-actions">
          <Link className="btn ghost" href="/">
            <ArrowLeft size={14} /> Back
          </Link>
        </div>
      </div>
    </main>
  );
}

export default StackPage;
