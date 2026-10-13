"use client";

import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Lock } from "lucide-react";
import ArcadeSpaceBackdrop from "@/components/ArcadeSpaceBackdrop";
import { CircuitGrid } from "@/components/CircuitGrid";
import { getNode, STATUS_LABEL } from "@/lib/universe";

/**
 * NodeBriefing — what this Node is, what it is built out of, who it is for.
 *
 * Blocks in order: what it is, the stack, the key pieces, what I am learning,
 * the audience. Pieces and learning are optional — a Node shows the one it has.
 * Then two exits: Launch (to the live thing, when there is a live thing) and
 * Back (to the Press Start screen). A Node with no URL and no public face gets
 * a disabled Launch with the reason stated, not a dead link.
 */

const STATUS_COLOR: Record<string, string> = {
  LIVE: "#4ade80",
  STANDING: "#e3941a",
  BENCHED: "#ef4444",
};

const DISABLED_REASON: Record<string, string> = {
  BENCHED: "Cold. Nothing public yet.",
  STANDING: "Not the desk.",
  LIVE: "",
};

export function NodeBriefing({ id }: { id: string }) {
  const node = getNode(id);

  if (!node) {
    return (
      <main className="arcade">
        <ArcadeSpaceBackdrop />
        <div className="arcade-inner">
          <div className="brief">
            <h1 className="brief-title">No such Node</h1>
            <p className="tight-top" style={{ color: "var(--mute)" }}>
              Nothing answers to that name in the Grid.
            </p>
            <div className="brief-actions">
              <Link className="btn ghost" href="/select">
                <ArrowLeft size={14} /> Back to Select
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  const blocked = DISABLED_REASON[node.status];

  return (
    <main className="arcade">
      <ArcadeSpaceBackdrop />
      <CircuitGrid />

      <div className="arcade-inner is-scrolling">
        <div className="brief">
          <div className="brief-top">
            <Link href="/select" className="brief-back" aria-label="Back to Select">
              <span className="brief-back-text">&#8592; Select</span>
            </Link>
            <span className="brief-badge" style={{ borderColor: node.color, color: node.color }}>
              {STATUS_LABEL[node.status]}
            </span>
          </div>

          <header className="brief-head roomy-top">
            <p
              className="status-pill"
              style={{ color: STATUS_COLOR[node.status], borderColor: STATUS_COLOR[node.status] }}
            >
              {node.statusText}
            </p>
            <h1 className="brief-title">{node.name}</h1>
            {node.title ? (
              <p className="brief-what" style={{ color: "var(--mute)", fontSize: 18 }}>
                {node.title}
              </p>
            ) : null}
          </header>

          <section className="brief-block">
            <h2>What it is</h2>
            <p className="brief-what">{node.brief.what}</p>
          </section>

          <section className="brief-block">
            <h2>The stack</h2>
            <ul className="chips">
              {node.brief.stack.map((item) => (
                <li className="chip" key={item}>
                  {item}
                </li>
              ))}
            </ul>
          </section>

          {node.brief.pieces?.length ? (
            <section className="brief-block">
              <h2>Key pieces</h2>
              <ul className="pieces">
                {node.brief.pieces.map((piece) => (
                  <li key={piece}>{piece}</li>
                ))}
              </ul>
            </section>
          ) : null}

          {node.brief.learning?.length ? (
            <section className="brief-block">
              <h2>What I&rsquo;m learning</h2>
              <ul className="pieces">
                {node.brief.learning.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className="brief-block">
            <h2>Who it is for</h2>
            <p className="brief-what" style={{ fontSize: 19 }}>
              {node.brief.audience}
            </p>
          </section>

          <div className="brief-actions">
            {node.exploreUrl ? (
              <a className="btn primary" href={node.exploreUrl} target="_blank" rel="noreferrer">
                Launch <ArrowUpRight size={14} />
              </a>
            ) : (
              <span className="btn" aria-disabled="true">
                <Lock size={13} /> No public Node
              </span>
            )}
            <Link className="btn ghost" href="/">
              <ArrowLeft size={14} /> Back
            </Link>
          </div>

          {!node.exploreUrl && blocked ? (
            <p className="arcade-kicker tight-top">{blocked}</p>
          ) : null}
        </div>
      </div>
    </main>
  );
}

export default NodeBriefing;
