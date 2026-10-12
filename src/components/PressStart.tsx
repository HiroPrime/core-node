"use client";

import { useEffect, useRef, useState } from "react";
import ArcadeSpaceBackdrop from "@/components/ArcadeSpaceBackdrop";
import { CircuitGrid } from "@/components/CircuitGrid";
import { ControllerBadge } from "@/components/ControllerBadge";
import { OPERATOR } from "@/lib/lore-data";

/**
 * PressStart — the front door.
 *
 * A SNES title screen: the title boots in, the menu appears, arrows and the pad
 * both drive it. The whole thing is built to land above the fold on a phone —
 * no scrolling required to reach any menu item.
 *
 * The boot plays once per browser, not on every reload.
 */

const BOOT_LINES: { key: string; value: string }[] = [
  { key: "Core", value: "corenode.nexus" },
  { key: "Operator", value: "Charlie · Jacob · BasicHiro" },
  { key: "The Furnace", value: "local · 8188" },
  { key: "Grid", value: "3 Live · 2 Resting" },
];

type MenuId = "universe" | "start" | "stack";

/** Plain labels only — the old "#" and description lines are gone. */
const MENU: { id: MenuId; label: string; href: string }[] = [
  { id: "universe", label: "My Universe", href: "/universe" },
  { id: "start", label: "Press Start", href: "/select" },
  { id: "stack", label: "Tech Stack", href: "/stack" },
];

const BOOT_KEY = "nexus-booted";

export function PressStart() {
  const [booted, setBooted] = useState(false);
  const [visibleLines, setVisibleLines] = useState(0);
  const [cursor, setCursor] = useState<MenuId>("start");
  const [pad, setPad] = useState(false);
  const cursorRef = useRef<MenuId>("start");

  // Boot once per browser. Session storage, so a reload skips it.
  useEffect(() => {
    let seen = false;
    try {
      seen = window.sessionStorage.getItem(BOOT_KEY) === "1";
    } catch {
      seen = false;
    }

    if (seen) {
      setVisibleLines(BOOT_LINES.length);
      setBooted(true);
      return;
    }

    const timers: number[] = [];
    BOOT_LINES.forEach((_, i) => {
      timers.push(window.setTimeout(() => setVisibleLines(i + 1), 420 + i * 340));
    });
    timers.push(
      window.setTimeout(() => {
        setBooted(true);
        try {
          window.sessionStorage.setItem(BOOT_KEY, "1");
        } catch {
          // Private mode — the boot just plays again next time.
        }
      }, 420 + BOOT_LINES.length * 340)
    );

    return () => timers.forEach((t) => window.clearTimeout(t));
  }, []);

  const move = (dir: 1 | -1) => {
    const i = MENU.findIndex((item) => item.id === cursorRef.current);
    const next = MENU[(i + dir + MENU.length) % MENU.length];
    cursorRef.current = next.id;
    setCursor(next.id);
  };

  const activate = () => {
    const item = MENU.find((m) => m.id === cursorRef.current);
    if (item) window.location.assign(item.href);
  };

  // Keyboard.
  useEffect(() => {
    if (!booted) return;
    const onKey = (event: KeyboardEvent) => {
      if (["ArrowDown", "ArrowRight", "Tab"].includes(event.key)) {
        event.preventDefault();
        move(1);
      } else if (["ArrowUp", "ArrowLeft"].includes(event.key)) {
        event.preventDefault();
        move(-1);
      } else if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        activate();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [booted]);

  // Gamepad — dpad to move, A to confirm.
  useEffect(() => {
    if (!booted) return;
    let frame = 0;
    const held = new Set<number>();
    const lastRepeat = new Map<number, number>();

    const poll = () => {
      const padDevice = Array.from(navigator.getGamepads?.() ?? []).find(
        (p): p is Gamepad => Boolean(p?.connected)
      );
      setPad(Boolean(padDevice));

      if (padDevice) {
        const now = performance.now();
        const pressed = padDevice.buttons.map((b) => b.pressed);

        if (pressed[0] && !held.has(0)) activate();

        for (const [btn, dir] of [
          [13, 1],
          [15, 1],
          [12, -1],
          [14, -1],
        ] as [number, 1 | -1][]) {
          if (!pressed[btn]) {
            held.delete(btn);
            lastRepeat.delete(btn);
            continue;
          }
          const last = lastRepeat.get(btn);
          if (last === undefined || now - last > 260) {
            move(dir);
            lastRepeat.set(btn, now);
          }
          held.add(btn);
        }
      }

      frame = requestAnimationFrame(poll);
    };

    frame = requestAnimationFrame(poll);
    return () => cancelAnimationFrame(frame);
  }, [booted]);

  return (
    <main className="arcade">
      {/* The universe: arcade space, with the circuit plane lit over it. Both are
          position:fixed and paint the whole viewport, so .arcade itself must stay
          transparent or it would cover them. */}
      <ArcadeSpaceBackdrop />
      <CircuitGrid />

      <div className="arcade-inner">
        <div className="press-hero">
          <h1 className="press-title">BasicHiro</h1>
          <p className="press-title-sub">Code Node</p>

          {/* Boot lines run over the top of the menu, which is always in the DOM.
              That keeps the first paint complete for crawlers and no-JS, and the
              boot is a reveal rather than a rewrite. */}
          {!booted && (
            <div className="boot" role="status" aria-live="polite">
              {BOOT_LINES.slice(0, visibleLines).map((line, i) => (
                <p key={line.key} className="boot-line" style={{ animationDelay: `${i * 40}ms` }}>
                  <b>{line.key}</b>
                  <span>{line.value}</span>
                </p>
              ))}
            </div>
          )}

          <nav
            className="press-menu"
            aria-label="Main menu"
            style={booted ? undefined : { visibility: "hidden", position: "absolute", left: -9999 }}
          >
            {MENU.map((item) => {
              const active = cursor === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`press-item${active ? " is-active" : ""}`}
                  onMouseEnter={() => {
                    cursorRef.current = item.id;
                    setCursor(item.id);
                  }}
                  onClick={() => window.location.assign(item.href)}
                >
                  <span className="press-item-cursor" aria-hidden>
                    &#9654;
                  </span>
                  <span
                    className={
                      item.id === "start" && active ? "press-item-label press-blink" : "press-item-label"
                    }
                  >
                    {item.label}
                  </span>
                </button>
              );
            })}
          </nav>

          {/* Two lines, not one run-on sentence: who I am, then how to drive it. */}
          <p className="press-foot">{OPERATOR.role}</p>
          <p className="press-foot press-foot-controls">Arrows to move. Enter to pick.</p>
        </div>
      </div>

      <ControllerBadge />
    </main>
  );
}

export default PressStart;

