"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import ArcadeSpaceBackdrop from "@/components/ArcadeSpaceBackdrop";
import { ControllerBadge } from "@/components/ControllerBadge";
import { CoreNodeLogo } from "@/components/CoreNodeLogo";
import { SELECT_SPOTS, STATUS_LABEL, getNode } from "@/lib/universe";
import "./node-select.css";

/**
 * NodeSelect — the level select.
 *
 * Two doors, one screen. The selected planet sits dead centre in a round glass
 * shell and takes up roughly 60% of the viewport; the other one waits behind an
 * arrow. Everything — header, planet, caption, dots — is sized in viewport units
 * so the whole screen lands above the fold on a phone, no scrolling at any width.
 *
 * Input is deliberately redundant: click, wheel, touch, arrows, or a pad.
 */

const STATUS_COLOR: Record<string, string> = {
  LIVE: "#4ade80",
  STANDING: "#e3941a",
  BENCHED: "#ef4444",
};

/** Resolve the select spots against the Node table, skipping anything missing. */
const SPOTS = SELECT_SPOTS.map((spot) => getNode(spot.id)).filter(
  (node): node is NonNullable<typeof node> => Boolean(node)
);

export function NodeSelect() {
  const [index, setIndex] = useState(0);
  const lockRef = useRef(false);
  const touchRef = useRef<{ x: number; y: number } | null>(null);

  const active = SPOTS[index];

  const goTo = useCallback(
    (next: number) => {
      if (lockRef.current) return;
      const wrapped = ((next % SPOTS.length) + SPOTS.length) % SPOTS.length;
      if (wrapped === index) return;
      lockRef.current = true;
      setIndex(wrapped);
      window.setTimeout(() => {
        lockRef.current = false;
      }, 380);
    },
    [index]
  );

  const goNext = useCallback(() => goTo(index + 1), [goTo, index]);
  const goPrev = useCallback(() => goTo(index - 1), [goTo, index]);

  const confirm = useCallback(() => {
    window.location.assign(`/node/${SPOTS[index].id}`);
  }, [index]);

  const back = useCallback(() => {
    window.location.assign("/");
  }, []);

  // Keyboard.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (["ArrowRight", "ArrowDown"].includes(event.key)) {
        event.preventDefault();
        goNext();
      } else if (["ArrowLeft", "ArrowUp"].includes(event.key)) {
        event.preventDefault();
        goPrev();
      } else if (event.key === "Enter") {
        event.preventDefault();
        confirm();
      } else if (event.key === "Escape") {
        event.preventDefault();
        back();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goNext, goPrev, confirm, back]);

  // Wheel.
  useEffect(() => {
    const onWheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaY) < 8 && Math.abs(event.deltaX) < 8) return;
      const delta = Math.abs(event.deltaY) > Math.abs(event.deltaX) ? event.deltaY : event.deltaX;
      if (delta > 0) goNext();
      else goPrev();
    };
    window.addEventListener("wheel", onWheel, { passive: true });
    return () => window.removeEventListener("wheel", onWheel);
  }, [goNext, goPrev]);

  // Touch — swipe either axis.
  const onTouchStart = (event: React.TouchEvent) => {
    const t = event.touches[0];
    if (t) touchRef.current = { x: t.clientX, y: t.clientY };
  };
  const onTouchEnd = (event: React.TouchEvent) => {
    const start = touchRef.current;
    if (!start) return;
    const end = event.changedTouches[0];
    touchRef.current = null;
    if (!end) return;
    const delta = start.x - end.clientX || start.y - end.clientY;
    if (Math.abs(delta) < 40) return;
    if (delta > 0) goNext();
    else goPrev();
  };

  // Gamepad — A confirm, B back, dpad/shoulders cycle.
  useEffect(() => {
    let frame = 0;
    const held = new Set<number>();
    const lastRepeat = new Map<number, number>();

    const poll = () => {
      const pad = Array.from(navigator.getGamepads?.() ?? []).find(
        (p): p is Gamepad => Boolean(p?.connected)
      );

      if (pad) {
        const now = performance.now();
        const pressed = pad.buttons.map((b) => b.pressed);

        if (pressed[0] && !held.has(0)) confirm();
        if (pressed[1] && !held.has(1)) back();

        for (const [btn, dir] of [
          [13, 1],
          [15, 1],
          [5, 1],
          [12, -1],
          [14, -1],
          [4, -1],
        ] as [number, 1 | -1][]) {
          if (!pressed[btn]) {
            held.delete(btn);
            lastRepeat.delete(btn);
            continue;
          }
          const last = lastRepeat.get(btn);
          if (last === undefined || now - last > 300) {
            if (dir === 1) goNext();
            else goPrev();
            lastRepeat.set(btn, now);
          }
          held.add(btn);
        }
      }

      frame = requestAnimationFrame(poll);
    };

    frame = requestAnimationFrame(poll);
    return () => cancelAnimationFrame(frame);
  }, [confirm, back, goNext, goPrev]);

  if (!active) return null;


  return (
    <main className="ns-screen" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <ArcadeSpaceBackdrop className="opacity-80" />

      {/* Header — brand, and the way back. */}
      <header className="ns-head">
        <a href="/" className="ns-brand" aria-label="Back to Core Node">
          <CoreNodeLogo size={26} />
          <span className="ns-brand-text">Core Node</span>
        </a>
        <p className="ns-step arcade-label">
          {String(index + 1).padStart(2, "0")} / {String(SPOTS.length).padStart(2, "0")}
        </p>
      </header>

      {/* The stage — one planet, round glass, dead centre. */}
      <div className="ns-stage">
        <button type="button" className="select-arrow prev" onClick={goPrev} aria-label="Previous node">
          <ChevronLeft size={22} />
        </button>

        <div className="ns-orb-wrap">
          <button
            type="button"
            className="ns-orb"
            onClick={confirm}
            aria-label={`Open the ${active.name} briefing`}
            key={active.id}
          >
            <span className="ns-orb-glow" style={{ background: active.glow }} aria-hidden />
            <span className="ns-orb-shell">
              <img className="ns-orb-img" src={active.planet} alt="" draggable={false} />
              {/* Specular streak across the glass */}
              <span className="ns-orb-shine" aria-hidden />
              {/* Rim light, so the glass reads as glass and not a disc */}
              <span className="ns-orb-rim" style={{ borderColor: `${active.color}66` }} aria-hidden />
            </span>
          </button>
        </div>

        <button type="button" className="select-arrow next" onClick={goNext} aria-label="Next node">
          <ChevronRight size={22} />
        </button>
      </div>

      {/* Caption — name, what it is, and the door in. */}
      <div className="ns-foot">
        <p className="ns-node-kicker" style={{ color: active.color }} key={`${active.id}-k`}>
          {active.statusText}
        </p>
        <h1 className="select-name" key={active.id}>
          {active.name}
        </h1>
        <p className="ns-title">{active.title}</p>

        <button
          type="button"
          className="ns-go"
          style={{ background: active.color, color: "#08060a" }}
          onClick={confirm}
        >
          Brief me
        </button>

        <div className="select-dots">
          {SPOTS.map((node, i) => (
            <button
              key={node.id}
              type="button"
              className="select-dot"
              style={{
                backgroundColor: i === index ? node.color : "rgba(255,255,255,0.22)",
                transform: i === index ? "scale(1.45)" : "scale(1)",
                boxShadow: i === index ? `0 0 12px ${node.glow}` : "none",
              }}
              onClick={() => goTo(i)}
              aria-label={`Go to ${node.name}`}
              aria-current={i === index}
            />
          ))}
        </div>

        <p className="ns-hint">Arrows to move · Enter to open</p>
      </div>

      <ControllerBadge />
    </main>
  );
}

export default NodeSelect;
