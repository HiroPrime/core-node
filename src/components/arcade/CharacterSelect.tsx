"use client";

import { useEffect, useState } from "react";
import { ROSTER, characterSprites, getCharacter } from "@/lib/arcade/roster";

type Props = {
  initial: string | null;
  playerName: string | null;
  onPick: (characterId: string) => void;
};

/** Every roster slot (10). Locked slots, if any, show as "???". */
export function CharacterSelect({ initial, playerName, onPick }: Props) {
  const [sel, setSel] = useState(() => getCharacter(initial).id);

  useEffect(() => {
    const open = ROSTER.filter((c) => !c.locked);
    const onKey = (e: KeyboardEvent) => {
      const i = open.findIndex((c) => c.id === sel);
      if (e.code === "ArrowRight" || e.code === "KeyD") setSel(open[(i + 1) % open.length].id);
      else if (e.code === "ArrowLeft" || e.code === "KeyA") setSel(open[(i - 1 + open.length) % open.length].id);
      else if (e.code === "Enter" || e.code === "Space") {
        e.preventDefault();
        onPick(sel);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sel, onPick]);

  return (
    <div className="arcade-select" role="dialog" aria-label="Choose your character">
      <h2 className="arcade-select-title">CHOOSE YOUR PLAYER</h2>
      {playerName && <p className="arcade-select-sub">{playerName.toUpperCase()}</p>}
      <div className="arcade-select-grid">
        {ROSTER.map((c) => {
          const picked = c.id === sel;
          return (
            <button
              key={c.id}
              type="button"
              className={`arcade-select-slot${picked ? " is-picked" : ""}${c.locked ? " is-locked" : ""}`}
              style={{ ["--slot" as string]: c.color }}
              disabled={c.locked}
              aria-pressed={picked}
              aria-label={c.locked ? "Locked slot" : c.name}
              onClick={() => setSel(c.id)}
              onDoubleClick={() => !c.locked && onPick(c.id)}
            >
              {c.locked || !c.sprites ? (
                <span className="arcade-select-lock">?</span>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element -- small static portrait
                <img
                  src={c.portrait ?? characterSprites(c.id).still.down}
                  alt=""
                  className={c.portrait ? "arcade-select-portrait" : "arcade-select-sprite"}
                  loading="lazy"
                />
              )}
              <span className="arcade-select-name">{c.locked ? "LOCKED" : c.name}</span>
            </button>
          );
        })}
      </div>
      <button type="button" className="arcade-start-btn" onClick={() => onPick(sel)}>
        ENTER THE ARCADE
      </button>
    </div>
  );
}

export default CharacterSelect;
