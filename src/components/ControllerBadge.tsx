"use client";

import { useEffect, useState } from "react";

/**
 * ControllerBadge — sits bottom-right on every screen.
 *
 * Only ever says one thing: a real gamepad is plugged in. It renders nothing
 * when one is not, so a mouse-and-keyboard visitor never sees chrome that
 * does not apply to them.
 *
 * Kept as its own component rather than per-page state because every screen
 * needs it and none of them should have to know a gamepad exists.
 */
export function ControllerBadge() {
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let frame = 0;

    const poll = () => {
      const pad = Array.from(navigator.getGamepads?.() ?? []).some((p) => p?.connected);
      // Only re-render on an actual change of state, not every frame.
      setConnected((was) => (was === pad ? was : pad));
      frame = requestAnimationFrame(poll);
    };

    frame = requestAnimationFrame(poll);
    return () => cancelAnimationFrame(frame);
  }, []);

  if (!connected) return null;

  return (
    <span className="pad-badge pad-badge-corner">
      <span className="pad-badge-dot" aria-hidden />
      Controller connected
    </span>
  );
}

export default ControllerBadge;
