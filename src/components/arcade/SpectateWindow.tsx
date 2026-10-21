"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { SpectateViewer, type SpectateMeta, type ViewState } from "@/lib/arcade/spectate";

type Props = {
  playerId: string;
  playerName: string;
  gameTitle: string;
  best: number;
  viewerId: string;
  onClose: () => void;
};

const LABEL: Record<ViewState, string> = {
  connecting: "CONNECTING...",
  live: "LIVE",
  ended: "GAME ENDED",
  unavailable: "LIVE VIEW UNAVAILABLE",
  full: "TOO MANY VIEWERS. TRY LATER",
};

/** Small corner window (not fullscreen) showing another player's game live. */
export function SpectateWindow({ playerId, playerName, gameTitle, best, viewerId, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [state, setState] = useState<ViewState>("connecting");
  const [meta, setMeta] = useState<SpectateMeta | null>(null);

  useEffect(() => {
    const viewer = new SpectateViewer(createClient(), playerId, viewerId, {
      state: setState,
      meta: setMeta,
      stream: (s) => {
        const v = videoRef.current;
        if (v && v.srcObject !== s) {
          v.srcObject = s;
          void v.play().catch(() => undefined);
        }
      },
    });
    viewer.start();
    return () => viewer.close();
  }, [playerId, viewerId]);

  return (
    <div className="arcade-spectate" role="dialog" aria-label={`Watching ${playerName}`}>
      <p className="arcade-spectate-name">
        {playerName.toUpperCase()}
        <span className={`arcade-spectate-state is-${state}`}>{LABEL[state]}</span>
      </p>
      <p className="arcade-spectate-game">
        {gameTitle} · SCORE {String(meta?.score ?? 0).padStart(6, "0")} · HI {String(best).padStart(6, "0")}
      </p>
      <div className="arcade-spectate-screen">
        <video ref={videoRef} autoPlay muted playsInline className={state === "live" ? "is-live" : ""} />
        {state !== "live" && <span className="arcade-spectate-msg">{LABEL[state]}</span>}
      </div>
      <button type="button" className="arcade-spectate-back" onClick={onClose}>
        BACK TO ARCADE
      </button>
    </div>
  );
}

export default SpectateWindow;
