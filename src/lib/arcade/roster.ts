/**
 * Arcade character roster (data-driven, up to 5 slots).
 *
 * Charlie is the only character with sprites today. The other slots are
 * placeholders: add a sprite pack under /public/charlie-style folders and flip
 * `locked` to false to make them pickable.
 */

export type Facing = "left" | "right" | "up" | "down";

export type ArcadeCharacter = {
  id: string;
  name: string;
  locked: boolean;
  /** Accent colour used on the select screen and other players' name tags. */
  color: string;
  sprites?: {
    /** Folder with `{dir}-{1..walkFrames}.png`. */
    walkDir: string;
    walkFrames: number;
    walkMs: number;
    /** Folder with `{dir}-idle-1.png`. */
    idleDir: string;
    idleMs: number;
    /** Cache-bust tag. */
    rev: string;
  };
};

export const MAX_CHARACTERS = 5;

export const ROSTER: ArcadeCharacter[] = [
  {
    id: "charlie",
    name: "CHARLIE",
    locked: false,
    color: "#ff8195",
    sprites: {
      walkDir: "/charlie/walk6/",
      walkFrames: 6,
      walkMs: 130,
      idleDir: "/charlie/brawler-v2/",
      idleMs: 200,
      rev: "p9",
    },
  },
  { id: "slot-2", name: "???", locked: true, color: "#7ef6ff" },
  { id: "slot-3", name: "???", locked: true, color: "#9b5cff" },
  { id: "slot-4", name: "???", locked: true, color: "#3dff8a" },
  { id: "slot-5", name: "???", locked: true, color: "#ffe14a" },
].slice(0, MAX_CHARACTERS);

export const DEFAULT_CHARACTER_ID = "charlie";

export function getCharacter(id: string | null | undefined): ArcadeCharacter {
  const found = ROSTER.find((c) => c.id === id && !c.locked && c.sprites);
  return found ?? ROSTER.find((c) => c.id === DEFAULT_CHARACTER_ID)!;
}

const FACINGS: Facing[] = ["left", "right", "up", "down"];

/** Sprite URLs for a character, falling back to Charlie for slots without art. */
export function characterSprites(id: string | null | undefined) {
  const c = getCharacter(id);
  const s = c.sprites!;
  const walk = (dir: Facing) =>
    Array.from({ length: s.walkFrames }, (_, i) => `${s.walkDir}${dir}-${i + 1}.png?v=${s.rev}`);
  const out = {
    still: {} as Record<Facing, string>,
    idle: {} as Record<Facing, string[]>,
    walk: {} as Record<Facing, string[]>,
    walkMs: s.walkMs,
    idleMs: s.idleMs,
  };
  FACINGS.forEach((dir) => {
    out.walk[dir] = walk(dir);
    out.still[dir] = out.walk[dir][0];
    out.idle[dir] = [`${s.idleDir}${dir}-idle-1.png?v=${s.rev}`];
  });
  return out;
}
