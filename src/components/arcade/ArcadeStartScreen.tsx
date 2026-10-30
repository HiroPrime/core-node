"use client";

/**
 * Arcade main page. useAccountTier() picks the controls:
 *   - ready false (or character still loading): a hold, no Log in, Play, guest, or change
 *   - signed out: Log in (existing sign-in modal) with Play as guest beside it
 *   - signed in (basic or owner): one Play button, plus Change character
 *
 * Art: /arcade/start/arcadestart.webp (desktop) and
 * /arcade/start/arcadestartmobile.webp (width < 900px, or portrait touch).
 * The art box keeps the image aspect; the control sits on the floor below the arch.
 */

import Link from "next/link";
import { useEffect, useRef } from "react";
import { ARCADE_ENTRY_LABEL, arcadeEntryAction, arcadeEntryExtras } from "@/lib/arcade/entry-action";
import { useAccountTier } from "@/lib/use-account-tier";

export type ArcadeStartScreenProps = {
  /** False while the shell is still loading the saved character. */
  entryReady: boolean;
  onStart: () => void;
  /** Opens the existing arcade sign-in modal (Google / email / Discord). */
  onSignIn: () => void;
  /** Offline guest: character select, scores stay on this device. */
  onGuest: () => void;
  /** Open character select, including when a character is already saved. */
  onChangeCharacter: () => void;
};

export function ArcadeStartScreen({ entryReady, onStart, onSignIn, onGuest, onChangeCharacter }: ArcadeStartScreenProps) {
  const account = useAccountTier();
  const action = arcadeEntryAction(account, entryReady);
  const extras = arcadeEntryExtras(action);
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
            <div className="arcade-start-row">
              <button ref={primaryRef} type="button" className="arcade-start-btn" onClick={onSignIn}>
                {ARCADE_ENTRY_LABEL.login}
              </button>
              {extras.includes("guest") && (
                <button type="button" className="arcade-start-guest" onClick={onGuest}>
                  {ARCADE_ENTRY_LABEL.guest}
                </button>
              )}
            </div>
          ) : (
            <button type="button" className="arcade-start-btn" disabled aria-busy="true" aria-label="Loading">
              <span aria-hidden="true">…</span>
            </button>
          )}
          {extras.includes("change") && (
            <button type="button" className="arcade-start-guest" onClick={onChangeCharacter}>
              {ARCADE_ENTRY_LABEL.change}
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
