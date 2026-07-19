/* eslint-disable @next/next/no-img-element */
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import ArcadeSpaceBackdrop from "@/components/ArcadeSpaceBackdrop";
import CoreNodeLogo from "@/components/CoreNodeLogo";
import NexusAuthModal, { NexusAuthTrigger } from "@/components/NexusAuthModal";

interface NodeData {
  id: string;
  name: string;
  x: number;
  y: number;
  color: string;
  glow: string;
  statusText: string;
  level: number;
  exp: number;
  imageLayers: string[];
  exploreUrl: string;
}

const NODES: NodeData[] = [
  { id: "core", name: "Core Node", x: 0, y: 0, color: "#FF5F1F", glow: "rgba(255,95,31,0.5)", statusText: "CENTRAL NODE", level: 19, exp: 0, imageLayers: ["/planets/core-planet.png"], exploreUrl: "/" },
  { id: "prime", name: "Prime Portal", x: -1600, y: -1200, color: "#3b82f6", glow: "rgba(59,130,246,0.5)", statusText: "TCG ANALYTICS", level: 34, exp: 0, imageLayers: ["/planets/prime-planet.png"], exploreUrl: "https://primeportal.nexus" },
  { id: "grimm", name: "Grimm Fracture", x: 2000, y: -600, color: "#ef4444", glow: "rgba(239,68,68,0.5)", statusText: "AI GENERATIVE WEB COMIC", level: 6, exp: 0, imageLayers: ["/planets/grimm-planet.png"], exploreUrl: "https://grimmfracture.nexus" },
  { id: "shipyard", name: "Nexus Prime", x: -800, y: 2400, color: "#a855f7", glow: "rgba(168,85,247,0.5)", statusText: "TECH STACK", level: 15, exp: 0, imageLayers: ["/planets/shipyard-planet.png"], exploreUrl: "https://nexusprime.nexus" },
  { id: "savepoint", name: "Save Point", x: 1600, y: 1400, color: "#FF00FF", glow: "rgba(255,0,255,0.5)", statusText: "FREE ARCADE (RETRO)", level: 4, exp: 0, imageLayers: ["/planets/savepoint-planet.png"], exploreUrl: "https://savepoint.nexus" },
];

const CONNECTIONS: { from: string; to: string }[] = [
  { from: "core", to: "prime" },
  { from: "core", to: "grimm" },
  { from: "core", to: "shipyard" },
  { from: "core", to: "savepoint" },
];

function planetSize(level: number, focused: boolean) {
  const base = Math.min(200, Math.max(88, 64 + level * 3.5));
  return focused ? base : base * 0.45;
}

export default function ConstellationGrid() {
  const [isMounted, setIsMounted] = useState(false);
  const [nodes, setNodes] = useState<NodeData[]>(NODES);
  const [index, setIndex] = useState(0);
  const [user, setUser] = useState<User | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const lockRef = useRef(false);
  const touchStartY = useRef<number | null>(null);

  const trackExplore = useCallback(async (planetId: string, exploreUrl: string) => {
    try {
      await fetch("/api/track/explore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planetId }),
      });
    } catch {
      // Tracking is best-effort
    }
    if (planetId === "core") {
      window.location.href = exploreUrl;
    } else {
      window.open(exploreUrl, "_blank", "noopener,noreferrer");
    }
  }, []);

  const active = nodes[index];
  const camera = useMemo(() => ({ x: active.x, y: active.y }), [active.x, active.y]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Keep Population sync running in the background (HUD still hidden)
  useEffect(() => {
    let cancelled = false;

    const pullPopulation = async () => {
      try {
        const res = await fetch("/api/population");
        if (!res.ok) return;
        const data = (await res.json()) as {
          nodes?: Record<string, { population?: number; ok?: boolean }>;
        };
        if (cancelled || !data.nodes) return;

        setNodes((prev) =>
          prev.map((node) => {
            const stats = data.nodes?.[node.id];
            if (!stats?.ok || typeof stats.population !== "number") return node;
            return { ...node, exp: stats.population };
          })
        );
      } catch {
        // Keep last known values
      }
    };

    pullPopulation();
    const interval = setInterval(pullPopulation, 60_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const goTo = useCallback((next: number) => {
    if (lockRef.current) return;
    const wrapped = ((next % nodes.length) + nodes.length) % nodes.length;
    if (wrapped === index) return;

    lockRef.current = true;
    setIndex(wrapped);
    window.setTimeout(() => {
      lockRef.current = false;
    }, 650);
  }, [index, nodes.length]);

  const goNext = useCallback(() => goTo(index + 1), [goTo, index]);
  const goPrev = useCallback(() => goTo(index - 1), [goTo, index]);

  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (Math.abs(e.deltaY) < 8) return;
      if (e.deltaY > 0) goNext();
      else goPrev();
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (["ArrowDown", "ArrowRight", "PageDown", " "].includes(e.key)) {
        e.preventDefault();
        goNext();
      }
      if (["ArrowUp", "ArrowLeft", "PageUp"].includes(e.key)) {
        e.preventDefault();
        goPrev();
      }
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [goNext, goPrev]);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0]?.clientY ?? null;
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartY.current == null) return;
    const endY = e.changedTouches[0]?.clientY ?? touchStartY.current;
    const delta = touchStartY.current - endY;
    touchStartY.current = null;
    if (Math.abs(delta) < 40) return;
    if (delta > 0) goNext();
    else goPrev();
  };

  if (!isMounted) return <div className="bg-[#030303] h-dvh w-screen" />;

  return (
    <main
      className="relative bg-[#030303] h-dvh w-screen overflow-hidden text-white font-sans selection:bg-[#FF5F1F] selection:text-white flex flex-col"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* TOP — Planet + Space */}
      <section className="relative flex-[1.15] min-h-0 overflow-hidden">
        <ArcadeSpaceBackdrop />
        <div
          className="absolute inset-0 pointer-events-none transition-opacity duration-700 z-[1]"
          style={{
            background: `radial-gradient(ellipse 70% 55% at 50% 45%, ${active.glow}, transparent 70%)`,
          }}
        />

        <a
          href="/"
          className="absolute top-3 left-3 md:top-5 md:left-5 z-30 hover:opacity-90 transition-opacity"
          aria-label="Core Node home"
        >
          <CoreNodeLogo width={240} className="md:hidden drop-shadow-[0_0_12px_rgba(255,95,31,0.35)]" />
          <CoreNodeLogo width={280} className="hidden md:flex drop-shadow-[0_0_12px_rgba(255,95,31,0.35)]" />
        </a>

        <div className="absolute top-3 right-3 md:top-5 md:right-5 z-30">
          <NexusAuthTrigger user={user} onOpen={() => setAuthOpen(true)} />
        </div>
        <NexusAuthModal
          open={authOpen}
          onClose={() => setAuthOpen(false)}
          user={user}
          onUserChange={setUser}
        />

        <div className="absolute top-1/2 left-1/2 w-0 h-0 z-10">
          <div
            className="absolute w-0 h-0 will-change-transform transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
            style={{ transform: `translate(${-camera.x}px, ${-camera.y}px)` }}
          >
            <svg
              className="absolute overflow-visible pointer-events-none"
              style={{ left: 0, top: 0, width: 1, height: 1 }}
            >
              {CONNECTIONS.map(({ from, to }) => {
                const fromNode = nodes.find((n) => n.id === from);
                const toNode = nodes.find((n) => n.id === to);
                if (!fromNode || !toNode) return null;
                return (
                  <line
                    key={`${from}-${to}`}
                    x1={fromNode.x}
                    y1={fromNode.y}
                    x2={toNode.x}
                    y2={toNode.y}
                    stroke={fromNode.color}
                    strokeWidth="1.5"
                    strokeOpacity="0.28"
                    strokeDasharray="6 10"
                  />
                );
              })}
            </svg>

            {nodes.map((node) => {
              const focused = node.id === active.id;
              const size = planetSize(node.level, focused);

              return (
                <div
                  key={node.id}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-700 ${
                    focused ? "z-20 scale-100 opacity-100" : "z-10 scale-90 opacity-35"
                  }`}
                  style={{ left: node.x, top: node.y }}
                >
                  <div
                    className="rounded-full relative overflow-hidden"
                    style={{
                      width: size,
                      height: size,
                      backgroundColor: "#030303",
                      boxShadow: focused
                        ? `inset -16px -16px 24px rgba(0,0,0,0.8), inset 4px 4px 10px rgba(255,255,255,0.3), 0 0 ${28 + node.level}px ${node.glow}`
                        : `0 0 18px ${node.glow}`,
                    }}
                  >
                    {node.imageLayers.map((layerPath, layerIndex) => (
                      <div
                        key={layerIndex}
                        className="absolute inset-0 w-full h-full pointer-events-none"
                        style={{
                          backgroundImage: `url(${layerPath})`,
                          backgroundSize: "cover",
                          backgroundPosition: "center",
                          zIndex: layerIndex + 1,
                          mixBlendMode: "screen",
                        }}
                      />
                    ))}
                    <div className="absolute inset-0 rounded-full shadow-[inset_-10px_-10px_20px_rgba(0,0,0,0.6)] pointer-events-none z-50" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="absolute bottom-3 left-0 right-0 z-30 flex flex-col items-center gap-2 pointer-events-none">
          <p className="text-[10px] md:text-xs font-black uppercase tracking-[0.25em] text-white/45 animate-pulse">
            Scroll or tap arrows
          </p>
          <div className="flex items-center gap-2">
            {nodes.map((node, i) => (
              <button
                key={node.id}
                type="button"
                aria-label={`Go to ${node.name}`}
                onClick={() => goTo(i)}
                className="pointer-events-auto w-2 h-2 rounded-full transition-all duration-300"
                style={{
                  backgroundColor: i === index ? node.color : "rgba(255,255,255,0.25)",
                  transform: i === index ? "scale(1.35)" : "scale(1)",
                  boxShadow: i === index ? `0 0 10px ${node.glow}` : "none",
                }}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Prev / Next — vertically centered on left/right edges; scale with viewport */}
      <button
        type="button"
        aria-label="Previous planet"
        onClick={goPrev}
        className="z-40 rounded-full border border-white/15 bg-black/50 backdrop-blur-md text-white/80 hover:text-white hover:border-white/40 transition-colors"
        style={{
          position: "fixed",
          left: "clamp(0.75rem, 2.5vw, 1.75rem)",
          top: "50%",
          transform: "translateY(-50%)",
          width: "clamp(2.5rem, 5.5vw, 4.25rem)",
          height: "clamp(2.5rem, 5.5vw, 4.25rem)",
        }}
      >
        <ChevronLeft style={{ width: "clamp(1.15rem, 2.6vw, 2rem)", height: "clamp(1.15rem, 2.6vw, 2rem)" }} />
      </button>
      <button
        type="button"
        aria-label="Next planet"
        onClick={goNext}
        className="z-40 rounded-full border border-white/15 bg-black/50 backdrop-blur-md text-white/80 hover:text-white hover:border-white/40 transition-colors"
        style={{
          position: "fixed",
          right: "clamp(0.75rem, 2.5vw, 1.75rem)",
          top: "50%",
          transform: "translateY(-50%)",
          width: "clamp(2.5rem, 5.5vw, 4.25rem)",
          height: "clamp(2.5rem, 5.5vw, 4.25rem)",
        }}
      >
        <ChevronRight style={{ width: "clamp(1.15rem, 2.6vw, 2rem)", height: "clamp(1.15rem, 2.6vw, 2rem)" }} />
      </button>

      {/* BOTTOM — Details */}
      <section className="relative shrink-0 border-t border-white/10 bg-[#050505]/95 backdrop-blur-xl px-5 pt-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:px-8 md:pt-5">
        <div
          className="mx-auto w-full max-w-xl flex flex-col items-center text-center gap-2 transition-all duration-500"
          key={active.id}
        >
          <p
            className="text-[10px] font-black uppercase tracking-[0.22em]"
            style={{ color: active.color }}
          >
            {active.statusText}
          </p>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight leading-tight">
            {active.name}
          </h1>

          <div className="mt-3 w-full flex items-center justify-center gap-3">
            <div className="min-w-[7.5rem] bg-black/50 px-4 py-3 rounded-2xl border border-white/5">
              <p className="text-[10px] text-gray-500 font-black tracking-widest uppercase mb-1">Mass</p>
              <p className="text-2xl font-black" style={{ color: active.color }}>
                {active.level}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void trackExplore(active.id, active.exploreUrl)}
            className="mt-4 inline-flex items-center justify-center gap-2 w-full max-w-sm px-6 py-3.5 rounded-full font-black text-sm uppercase tracking-widest transition-transform hover:scale-[1.02]"
            style={{
              backgroundColor: active.color,
              color: "#050505",
              boxShadow: `0 0 24px ${active.glow}`,
            }}
          >
            Explore <ExternalLink size={16} />
          </button>

          <p className="mt-2 text-[10px] text-white/30 font-bold uppercase tracking-[0.2em]">
            {index + 1} / {nodes.length}
          </p>
        </div>

        <footer className="mt-4 pt-3 border-t border-white/10 text-center">
          <p
            className="text-[9px] md:text-[10px] uppercase tracking-[0.22em] text-white/30 font-bold"
            style={{ fontFamily: "var(--font-orbitron), sans-serif" }}
          >
            © 2026 Core Node · By BASICHIRO
          </p>
        </footer>
      </section>
    </main>
  );
}
