/**
 * Arcade character roster (data-driven). 10 playable chibis.
 *
 * Sprite layout per character (35x64 frames, drawn at 3x, smoothing off):
 *   {walkDir}{dir}-{1..6}.png    walk cycle, 130 ms/frame
 *   {idleDir}{dir}-idle-1.png    standing frame
 *   portrait                     select-screen portrait (webp)
 * Charlie keeps her original folders; the others live in
 * /arcade/characters/<id>/.
 */

export type Facing = "left" | "right" | "up" | "down";

export type ArcadeCharacter = {
  id: string;
  name: string;
  locked: boolean;
  /** Accent colour used on the select screen and other players' name tags. */
  color: string;
  portrait?: string;
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

export const MAX_CHARACTERS = 10;

const chibi = (id: string, name: string, color: string): ArcadeCharacter => {
  const dir = `/arcade/characters/${id}/`;
  return {
    id,
    name,
    locked: false,
    color,
    portrait: `${dir}portrait.webp?v=c1`,
    sprites: { walkDir: dir, walkFrames: 6, walkMs: 130, idleDir: dir, idleMs: 200, rev: "c1" },
  };
};

export const ROSTER: ArcadeCharacter[] = [
  {
    id: "charlie",
    name: "CHARLIE",
    locked: false,
    color: "#ff8195",
    portrait: "/arcade/characters/charlie/portrait.webp?v=c1",
    sprites: {
      walkDir: "/charlie/walk6/",
      walkFrames: 6,
      walkMs: 130,
      idleDir: "/charlie/brawler-v2/",
      idleMs: 200,
      rev: "p9",
    },
  },
  chibi("punk-mohawk", "PUNK MOHAWK", "#3dff8a"),
  chibi("blue-cap", "BLUE CAP", "#3d8bff"),
  chibi("red-cap", "RED CAP", "#ff5a3d"),
  chibi("wizard-hood", "WIZARD HOOD", "#9b5cff"),
  chibi("afro-windbreaker", "AFRO", "#ffe14a"),
  chibi("glasses-stripe", "GLASSES STRIPE", "#7ef6ff"),
  chibi("glasses-polo", "GLASSES POLO", "#3df0ff"),
  chibi("blonde-buns", "BLONDE BUNS", "#ffb3d4"),
  chibi("headband-track", "HEADBAND TRACK", "#ff8a3d"),
].slice(0, MAX_CHARACTERS);

export const DEFAULT_CHARACTER_ID = "charlie";

export function getCharacter(id: string | null | undefined): ArcadeCharacter {
  const found = ROSTER.find((c) => c.id === id && !c.locked && c.sprites);
  return found ?? ROSTER.find((c) => c.id === DEFAULT_CHARACTER_ID)!;
}

const FACINGS: Facing[] = ["left", "right", "up", "down"];

/** Sprite URLs for a character, falling back to Charlie for unknown ids. */
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
