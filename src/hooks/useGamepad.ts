"use client";

import { useEffect, useState } from "react";

/**
 * useGamepad — real Gamepad API support for the Node select.
 *
 * Standard mapping (Xbox / DualSense / Switch Pro all report this way):
 *   0 A/cross     -> confirm
 *   1 B/circle    -> back
 *   12-15 dpad    -> cycle (up/left prev, down/right next)
 *   4,5 shoulders -> cycle
 *
 * Buttons are edge-triggered with a repeat lock, so holding a direction cycles
 * one Node at a time instead of machine-gunning through the Grid.
 */

export interface GamepadActions {
  confirm: () => void;
  back: () => void;
  next: () => void;
  prev: () => void;
}

/** ms between repeats while a direction is held. */
const REPEAT_MS = 260;

export function useGamepad(actions: GamepadActions, enabled = true) {
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    let frame = 0;
    /** Which buttons we have already acted on this press. */
    const held = new Set<number>();
    const lastRepeat = new Map<number, number>();

    const poll = () => {
      const pads = navigator.getGamepads?.() ?? [];
      const pad = Array.from(pads).find((p): p is Gamepad => Boolean(p?.connected));

      setConnected(Boolean(pad));
      if (!pad) {
        frame = requestAnimationFrame(poll);
        return;
      }

      const now = performance.now();
      const pressed = pad.buttons.map((b) => b.pressed);

      // One-shot: A confirm, B back.
      if (pressed[0] && !held.has(0)) {
        actions.confirm();
      }
      if (pressed[1] && !held.has(1)) {
        actions.back();
      }

      // Repeatable: dpad + shoulders.
      const nextButtons = [13, 15, 5];
      const prevButtons = [12, 14, 4];

      const tryRepeat = (buttons: number[], action: () => void) => {
        const down = buttons.find((b) => pressed[b]);
        if (down === undefined) {
          for (const b of buttons) {
            held.delete(b);
            lastRepeat.delete(b);
          }
          return;
        }
        const last = lastRepeat.get(down);
        // First press fires immediately, then repeats on the lock interval.
        if (last === undefined || now - last > REPEAT_MS) {
          action();
          lastRepeat.set(down, now);
        }
        held.add(down);
      };

      tryRepeat(nextButtons, actions.next);
      tryRepeat(prevButtons, actions.prev);

      frame = requestAnimationFrame(poll);
    };

    frame = requestAnimationFrame(poll);
    return () => cancelAnimationFrame(frame);
  }, [actions, enabled]);

  return { connected };
}
