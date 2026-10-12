"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import ArcadeSpaceBackdrop from "@/components/ArcadeSpaceBackdrop";
import { CircuitGrid } from "@/components/CircuitGrid";
import { CoreNodeLogo } from "@/components/CoreNodeLogo";
import { CREED, MACHINERY, OPERATOR, STACK_STORY } from "@/lib/lore-data";
import "./stack-rack.css";

/**
 * StackPage — The Rack.
 *
 * The tech stack as hardware. Every group is a bay with a mounting rail, screws
 * and an engraved plate; every machine sits in a slot with a live LED, its name
 * inside the world, and the real part number underneath.
 *
 * Above the rack, the story — because the machines only make sense once you know
 * who runs them: not a trained coder, a product person who multiplies herself
 * with AI and runs the whole house on her own boxes until it pays its way.
 */

/** Bay accent per group. The LED and the plate take this color. */
const BAY_COLOR: Record<string, string> = {
  "The Forge": "#FF5F1F",
  "The Desk": "#e3941a",
  "The House": "#2ee6d6",
  "The Machines": "#a855f7",
};

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

          <p className="arcade-kicker roomy-top">The Machinery</p>
          <h1 className="brief-title">The Rack</h1>
          <p className="brief-what" style={{ color: "var(--mute)", fontSize: 19 }}>
            Every machine in the house, bolted in. A name inside the world, a real
            part number outside it.
          </p>
        </header>

        {/* The story first. The rack is the proof; this is the why. */}
        <section className="rack-story" aria-label="Why this rack exists">
          <p className="rack-story-lead">{STACK_STORY[0]}</p>
          {STACK_STORY.slice(1).map((line) => (
            <p key={line}>{line}</p>
          ))}
        </section>

        {MACHINERY.map((group) => {
          const color = BAY_COLOR[group.group] ?? "#e3941a";
          return (
            <section
              className="rack-bay"
              key={group.group}
              style={{ "--bay": color } as CSSProperties}
            >
              <header className="rack-plate">
                <span className="rack-led" aria-hidden />
                <h2>{group.group}</h2>
                <p>{group.note}</p>
              </header>

              <div className="rack-slots">
                {group.machines.map((machine) => (
                  <article className="rack-module" key={machine.name}>
                    <span className="rack-led" aria-hidden />
                    <h3 className="rack-name">{machine.name}</h3>
                    <p className="rack-reality">{machine.reality}</p>
                  </article>
                ))}
              </div>
            </section>
          );
        })}

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
          <Link className="btn primary" href="/select">
            Open the Level Select <ArrowUpRight size={14} />
          </Link>
          <Link className="btn ghost" href="/">
            <ArrowLeft size={14} /> Back
          </Link>
        </div>
      </div>
    </main>
  );
}

export default StackPage;
