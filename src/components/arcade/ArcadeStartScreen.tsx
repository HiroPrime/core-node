"use client";

/**
 * ============================================================================
 * PLACEHOLDER START SCREEN  (BasicHiro is building the real one)
 * ============================================================================
 * Replace this component freely. The contract ArcadeShell relies on is just
 * the props below:
 *   - signedIn / playerName: who is here (null name = guest)
 *   - onStart():   continue (signed in -> character select / world)
 *   - onSignIn():  open the existing Google/Discord sign-in modal
 *   - onGuest():   play offline as a guest (scores stay on this device)
 *
 * Background art: /arcade/start/arcadestart.webp (desktop, letterboxed to fit)
 * and /arcade/start/arcadestartmobile.webp (width < 900px, or portrait touch).
 * The art box keeps the image aspect; the UI is positioned inside that box. The art already
 * paints "PRESS START", so the buttons sit low, on the floor below the arch,
 * clear of the title, the arch, and the characters.
 * ============================================================================
 */

import Link from "next/link";
import { useEffect, useRef } from "react";

export type ArcadeStartScreenProps = {
  signedIn: boolean;
  playerName: string | null;
  authReady: boolean;
  onStart: () => void;
  onSignIn: () => void;
  onGuest: () => void;
};

export function ArcadeStartScreen({ signedIn, playerName, authReady, onStart, onSignIn, onGuest }: ArcadeStartScreenProps) {
  const primaryRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    primaryRef.current?.focus();
  }, [signedIn, authReady]);

  return (
    <div className="arcade-start" role="dialog" aria-label="Arcade Nexus start screen">
      <div className="arcade-start-box">
      <picture className="arcade-start-art">
        <source media="(max-width: 899px), (orientation: portrait) and (pointer: coarse)" srcSet="/arcade/start/arcadestartmobile.webp" />
        <img src="/arcade/start/arcadestart.webp" alt="Arcade Nexus. Press start." />
      </picture>
      <div className="arcade-start-ui">
        {signedIn ? (
          <>
            <button ref={primaryRef} type="button" className="arcade-start-btn" onClick={onStart}>
              PRESS START
            </button>
            <p className="arcade-start-note">PLAYING AS {(playerName || "PLAYER").toUpperCase()}</p>
          </>
        ) : (
          <>
            <button ref={primaryRef} type="button" className="arcade-start-btn" onClick={onSignIn} disabled={!authReady}>
              {authReady ? "PRESS START" : "LOADING..."}
            </button>
            <button type="button" className="arcade-start-guest" onClick={onGuest}>
              PLAY AS GUEST
            </button>
          </>
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
