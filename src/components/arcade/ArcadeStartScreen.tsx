"use client";

/**
 * Arcade main page. useAccountTier() picks the one control:
 *   - ready false (or character still loading): neither Log in nor Play
 *   - signed out: Log in, which opens the arcade's existing sign-in modal
 *   - signed in (basic or owner): Play, which starts the arcade
 *
 * Art: /arcade/start/arcadestart.webp (desktop) and
 * /arcade/start/arcadestartmobile.webp (width < 900px, or portrait touch).
 * The art box keeps the image aspect; the control sits on the floor below the arch.
 */

import Link from "next/link";
import { useEffect, useRef } from "react";
import { ARCADE_ENTRY_LABEL, arcadeEntryAction } from "@/lib/arcade/entry-action";
import { useAccountTier } from "@/lib/use-account-tier";

export type ArcadeStartScreenProps = {
  /** False while the shell is still loading the saved character. */
  entryReady: boolean;
  onStart: () => void;
  /** Opens the existing arcade sign-in modal (Google / email / Discord). */
  onSignIn: () => void;
};

export function ArcadeStartScreen({ entryReady, onStart, onSignIn }: ArcadeStartScreenProps) {
  const account = useAccountTier();
  const action = arcadeEntryAction(account, entryReady);
  const primaryRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (action === "wait") return;
    primaryRef.current?.focus();
  }, [action]);

  return (
    <div
      className="arcade-start"
      role="dialog"
      aria-label="Arcade Nexus start screen"
      aria-busy={action === "wait"}
      data-arcade-entry={action}
    >
      <div className="arcade-start-box">
        <picture className="arcade-start-art">
          <source media="(max-width: 899px), (orientation: portrait) and (pointer: coarse)" srcSet="/arcade/start/arcadestartmobile.webp" />
          <img src="/arcade/start/arcadestart.webp" alt="Arcade Nexus. Press start." />
        </picture>
        <div className="arcade-start-ui">
          {action === "play" ? (
            <button ref={primaryRef} type="button" className="arcade-start-btn" onClick={onStart}>
              {ARCADE_ENTRY_LABEL.play}
            </button>
          ) : action === "login" ? (
            <button ref={primaryRef} type="button" className="arcade-start-btn" onClick={onSignIn}>
              {ARCADE_ENTRY_LABEL.login}
            </button>
          ) : (
            <button type="button" className="arcade-start-btn" disabled aria-busy="true" aria-label="Loading">
              <span aria-hidden="true">…</span>
            </button>
          )}
          <nav className="arcade-start-legal" aria-label="Legal">
            <Link href="/privacy">Privacy</Link>
            <span aria-hidden="true">&middot;</span>
            <Link href="/terms">Terms</Link>
          </nav>
        </div>
      </div>
    </div>
  );
}

export default ArcadeStartScreen;
