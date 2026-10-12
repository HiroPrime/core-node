"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import ArcadeSpaceBackdrop from "@/components/ArcadeSpaceBackdrop";
import { CircuitGrid } from "@/components/CircuitGrid";
import { MACHINERY, OPERATOR, STACK_STORY } from "@/lib/lore-data";
import "./stack-rack.css";

/**
 * StackPage — The Rack.
 *
 * The tech stack as hardware. Every group is a bay with a mounting rail, screws
 * and an engraved plate; every machine sits in a slot with a live LED, its name
 * inside the world, and the real part number underneath.
 *
 * Above the rack, the story — because the machines only make sense once you know
 * who runs them. Not a trained coder: a product person who multiplies with AI
 * and runs the whole house on one desk until it pays its way. The Operator line
 * from the old page lives up top now, where the name belongs.
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
          <Link href="/" className="page-back arcade-label">
            &#8592; Press Start
          </Link>

          <p className="arcade-kicker roomy-top">The Machinery</p>
          <h1 className="brief-title">The Rack</h1>
          <p className="brief-what" style={{ color: "var(--mute)", fontSize: 19 }}>
            {OPERATOR.intro} This is the rack that runs my house.
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
