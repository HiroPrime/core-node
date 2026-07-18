"use client";

import ArcadeSpaceBackdrop from "@/components/ArcadeSpaceBackdrop";
import { ExternalLink } from "lucide-react";

const SISTER_NODES = [
  { name: "Prime Portal", status: "TCG ANALYTICS", href: "https://primeportal.nexus", color: "#3b82f6" },
  { name: "Grimm Fracture", status: "AI GENERATIVE WEB COMIC", href: "https://grimmfracture.nexus", color: "#ef4444" },
  { name: "Nexus Prime", status: "TECH STACK", href: "https://nexusprime.nexus", color: "#a855f7" },
  { name: "Save Point", status: "FREE ARCADE (RETRO)", href: "https://savepoint.nexus", color: "#FF00FF" },
];

export default function PlanetOnePager() {
  return (
    <main
      className="relative min-h-dvh text-white overflow-x-hidden"
      style={{
        fontFamily: "var(--font-space), ui-sans-serif, system-ui, sans-serif",
      }}
    >
      {/* HERO — full-bleed arcade universe */}
      <section className="relative min-h-dvh flex flex-col justify-end md:justify-center overflow-hidden">
        <ArcadeSpaceBackdrop />

        <div className="relative z-10 px-6 pb-16 pt-28 md:px-12 md:pb-20 md:pt-0 max-w-5xl mx-auto w-full">
          <p
            className="text-[11px] md:text-xs font-bold uppercase tracking-[0.35em] text-[#FF5F1F] mb-4"
            style={{ fontFamily: "var(--font-orbitron), sans-serif" }}
          >
            Nexus Constellation
          </p>
          <h1
            className="text-5xl sm:text-6xl md:text-8xl font-black tracking-tight leading-[0.95] mb-5"
            style={{
              fontFamily: "var(--font-orbitron), sans-serif",
              textShadow: "0 0 40px rgba(255,95,31,0.45)",
            }}
          >
            CORE NODE
          </h1>
          <p className="max-w-md text-base md:text-lg text-white/70 leading-relaxed mb-8">
            Central command of the constellation — the living hub where every Nexus world connects.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <a
              href="/"
              className="inline-flex items-center justify-center px-8 py-3.5 rounded-full font-black text-sm uppercase tracking-widest bg-[#FF5F1F] text-[#050505] shadow-[0_0_28px_rgba(255,95,31,0.45)] hover:scale-[1.02] transition-transform"
              style={{ fontFamily: "var(--font-orbitron), sans-serif" }}
            >
              Enter Map
            </a>
            <a
              href="#signal"
              className="inline-flex items-center justify-center px-8 py-3.5 rounded-full font-black text-sm uppercase tracking-widest border border-white/25 text-white/90 hover:border-white/50 hover:bg-white/5 transition-colors"
              style={{ fontFamily: "var(--font-orbitron), sans-serif" }}
            >
              Read Signal
            </a>
          </div>
        </div>

        <div
          className="pointer-events-none absolute bottom-0 inset-x-0 h-32 z-[5]"
          style={{
            background: "linear-gradient(to top, #030303, transparent)",
          }}
        />
      </section>

      {/* SIGNAL */}
      <section id="signal" className="relative z-10 bg-[#030303] px-6 py-20 md:px-12 md:py-28">
        <div className="max-w-3xl mx-auto">
          <p
            className="text-[11px] font-bold uppercase tracking-[0.3em] text-cyan-300/80 mb-3"
            style={{ fontFamily: "var(--font-orbitron), sans-serif" }}
          >
            Status // Central Node
          </p>
          <h2
            className="text-3xl md:text-5xl font-black tracking-tight mb-6"
            style={{ fontFamily: "var(--font-orbitron), sans-serif" }}
          >
            One core. Many worlds.
          </h2>
          <p className="text-white/65 text-base md:text-lg leading-relaxed">
            Core Node is the mothership surface of the Nexus — a digital foundry that routes signal,
            identity, and discovery across every planet in the grid. From arcade checkpoints to TCG
            analytics, this is where the constellation stays online.
          </p>

          <div className="mt-10 grid grid-cols-2 gap-3 max-w-md">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
              <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold mb-1">Mass</p>
              <p className="text-3xl font-black text-[#FF5F1F]" style={{ fontFamily: "var(--font-orbitron), sans-serif" }}>
                19
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
              <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold mb-1">Role</p>
              <p className="text-lg font-bold text-white" style={{ fontFamily: "var(--font-orbitron), sans-serif" }}>
                Hub
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CONSTELLATION LINKS */}
      <section className="relative z-10 px-6 pb-20 md:px-12 md:pb-28">
        <div className="max-w-3xl mx-auto">
          <h2
            className="text-2xl md:text-4xl font-black tracking-tight mb-3"
            style={{ fontFamily: "var(--font-orbitron), sans-serif" }}
          >
            Linked planets
          </h2>
          <p className="text-white/55 mb-8 max-w-lg">
            Jump to another world in the Nexus grid.
          </p>

          <ul className="flex flex-col gap-3">
            {SISTER_NODES.map((node) => (
              <li key={node.name}>
                <a
                  href={node.href}
                  target="_blank"
                  rel="noreferrer"
                  className="group flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4 hover:bg-white/[0.06] transition-colors"
                  style={{ borderColor: `${node.color}44` }}
                >
                  <div>
                    <p
                      className="text-lg font-bold tracking-tight"
                      style={{ fontFamily: "var(--font-orbitron), sans-serif", color: node.color }}
                    >
                      {node.name}
                    </p>
                    <p className="text-[11px] uppercase tracking-[0.2em] text-white/40 font-bold mt-1">
                      {node.status}
                    </p>
                  </div>
                  <ExternalLink
                    size={18}
                    className="shrink-0 text-white/35 group-hover:text-white/80 transition-colors"
                  />
                </a>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <footer className="relative z-10 border-t border-white/10 px-6 py-8 md:px-12">
        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-[10px] uppercase tracking-[0.25em] text-white/35 font-bold">
          <span style={{ fontFamily: "var(--font-orbitron), sans-serif" }}>Core Node // 2026</span>
          <a href="/" className="hover:text-white/70 transition-colors">
            Return to map
          </a>
        </div>
      </footer>
    </main>
  );
}
