/**
 * SPIN-BALL table physics. Pure (no DOM) so it can be stress-tested headless.
 * World space is the table art, public/arcade/spin-ball/table.webp, at 768 x 1376.
 */

export const TW = 768;
export const TH = 1376;
export const R = 15;
const G = 1500;
const MAX_V = 2300;

export type V = { x: number; y: number };
export type Seg = { a: V; b: V; kick?: number; pts?: number; id?: string };
export type BumperKind = "blue" | "red" | "star";
export type Bumper = { kind: BumperKind; x: number; y: number; r: number; pts: number; kick: number; hitT: number; hits: number };
export type Spinner = { x: number; y: number; r: number; spin: number; angle: number; count: number; lit: boolean; litT: number };
export type Flipper = { p: V; len: number; rest: number; up: number; side: 1 | -1; ang: number; w: number; held: boolean; strikeT: number };
export type BallKind = "standard" | "comet" | "charged" | "heavy" | "orb";
export type Ball = { x: number; y: number; vx: number; vy: number; kind: BallKind; inLane: boolean; spin: number; alive: boolean };
export type HitEvent =
  | { type: "bumper"; i: number; pts: number; x: number; y: number }
  | { type: "sling"; i: number; pts: number; x: number; y: number }
  | { type: "spinner"; i: number; pts: number; x: number; y: number; lit: boolean }
  | { type: "crash"; x: number; y: number }
  | { type: "drain"; ball: Ball };

const v = (x: number, y: number): V => ({ x, y });
const chain = (pts: [number, number][]): Seg[] => pts.slice(1).map((b, i) => ({ a: v(...pts[i]), b: v(...b) }));

/* ---- table layout, traced over the art ---- */
// Outer boundary: left wall, top dome, right wall, plunger lane. The only
// opening is the drain at the bottom (between/outside the flippers).
export const OUTER: [number, number][] = [
  [28, 1420], [28, 430], [44, 330], [80, 245], [140, 168], [220, 108], [300, 74], [384, 62],
  [468, 74], [548, 108], [622, 160], [684, 228], [728, 300], [748, 370], [748, 1346],
];
export const LANE_FLOOR: [number, number][] = [[700, 1346], [748, 1346]];
export const LANE_WALL: [number, number][] = [[700, 1346], [700, 470]];
/** One-way gate at the top of the shooter lane (closes once the ball is out). */
export const GATE: [number, number][] = [[700, 470], [748, 400]];
export const LEFT_GUIDE: [number, number][] = [[104, 1012], [108, 1168], [240, 1243]];
export const RIGHT_GUIDE: [number, number][] = [[664, 1012], [660, 1168], [526, 1243]];
// Below the inlane guides: keeps the outlane balls from cutting under the flippers.
/** Left orbit deflector: an orbit shot coming down the left wall is turned back into play. */
export const LEFT_DEFLECT: [number, number][] = [[28, 640], [92, 720]];
export const LEFT_APRON: [number, number][] = [[28, 1240], [250, 1376]];
export const RIGHT_APRON: [number, number][] = [[700, 1240], [516, 1376]];

/** Slingshot triangles [kick face start, kick face end, back corner]. */
export const SLINGS: [[number, number], [number, number], [number, number]][] = [
  [[180, 1004], [246, 1190], [178, 1150]],
  [[588, 1004], [522, 1190], [590, 1150]],
];

export function makeTable() {
  const walls: Seg[] = [
    ...chain(OUTER),
    ...chain(LANE_FLOOR),
    ...chain(LANE_WALL),
    ...chain(LEFT_GUIDE),
    ...chain(RIGHT_GUIDE),
    ...chain(LEFT_DEFLECT),
    ...chain(LEFT_APRON),
    ...chain(RIGHT_APRON),
  ];
  const gate: Seg = { a: v(...GATE[0]), b: v(...GATE[1]) };
  const slings: Seg[] = [];
  SLINGS.forEach(([a, b, c], i) => {
    slings.push({ a: v(...a), b: v(...b), kick: 560, pts: 30, id: `s${i}` });
    slings.push({ a: v(...b), b: v(...c) });
    slings.push({ a: v(...c), b: v(...a) });
  });
  const bumpers: Bumper[] = [
    // The startmobile art's bumper cluster on this same table.
    { kind: "blue", x: 327, y: 840, r: 30, pts: 100, kick: 640, hitT: 0, hits: 0 },
    { kind: "blue", x: 270, y: 930, r: 30, pts: 100, kick: 640, hitT: 0, hits: 0 },
    { kind: "red", x: 452, y: 780, r: 28, pts: 50, kick: 600, hitT: 0, hits: 0 },
    { kind: "red", x: 520, y: 760, r: 28, pts: 50, kick: 600, hitT: 0, hits: 0 },
    { kind: "red", x: 560, y: 830, r: 28, pts: 50, kick: 600, hitT: 0, hits: 0 },
    // The art's two neon stars above the slingshots.
    { kind: "star", x: 130, y: 985, r: 24, pts: 250, kick: 520, hitT: 0, hits: 0 },
    { kind: "star", x: 636, y: 985, r: 24, pts: 250, kick: 520, hitT: 0, hits: 0 },
  ];
  const spinners: Spinner[] = [
    { x: 384, y: 300, r: 30, spin: 0, angle: 0, count: 0, lit: false, litT: 0 },
    { x: 214, y: 560, r: 30, spin: 0, angle: 0, count: 0, lit: false, litT: 0 },
    { x: 560, y: 560, r: 30, spin: 0, angle: 0, count: 0, lit: false, litT: 0 },
  ];
  const flippers: Flipper[] = [
    { p: v(250, 1256), len: 100, rest: 0.5, up: -0.45, side: 1, ang: 0.5, w: 0, held: false, strikeT: 0 },
    { p: v(516, 1256), len: 100, rest: 0.5, up: -0.45, side: -1, ang: 0.5, w: 0, held: false, strikeT: 0 },
  ];
  return { walls, gate, slings, bumpers, spinners, flippers };
}
export type Table = ReturnType<typeof makeTable>;

export const tip = (f: Flipper): V => v(f.p.x + f.side * Math.cos(f.ang) * f.len, f.p.y + Math.sin(f.ang) * f.len);
export const SERVE: V = v(724, 1346 - R - 1);

export function newBall(kind: BallKind = "standard"): Ball {
  return { x: SERVE.x, y: SERVE.y, vx: 0, vy: 0, kind, inLane: true, spin: 0, alive: true };
}

function hitSeg(b: Ball, s: Seg, e: number): { nx: number; ny: number; cx: number; cy: number } | null {
  const dx = s.b.x - s.a.x;
  const dy = s.b.y - s.a.y;
  const L2 = dx * dx + dy * dy;
  let t = ((b.x - s.a.x) * dx + (b.y - s.a.y) * dy) / L2;
  t = Math.max(0, Math.min(1, t));
  const cx = s.a.x + dx * t;
  const cy = s.a.y + dy * t;
  let nx = b.x - cx;
  let ny = b.y - cy;
  const d = Math.hypot(nx, ny);
  if (d >= R || d === 0) return null;
  nx /= d;
  ny /= d;
  b.x = cx + nx * R;
  b.y = cy + ny * R;
  const vn = b.vx * nx + b.vy * ny;
  if (vn < 0) {
    b.vx -= (1 + e) * vn * nx;
    b.vy -= (1 + e) * vn * ny;
  }
  return { nx, ny, cx, cy };
}

/** Advance one ball by dt (call with small dt, ~1/1200 s). */
export function stepBall(t: Table, b: Ball, dt: number, ev: HitEvent[], opts: { magnet?: boolean } = {}) {
  if (!b.alive) return;
  const heavy = b.kind === "heavy";
  b.vy += G * (heavy ? 1.25 : 1) * dt;
  if (opts.magnet && b.kind === "charged") {
    // Charged ball: drawn toward the nearest bumper.
    let best: Bumper | null = null;
    let bd = 1e9;
    for (const k of t.bumpers) {
      const d = Math.hypot(k.x - b.x, k.y - b.y);
      if (d < bd) { bd = d; best = k; }
    }
    if (best && bd < 260 && bd > best.r + R + 2) {
      b.vx += ((best.x - b.x) / bd) * 900 * dt;
      b.vy += ((best.y - b.y) / bd) * 900 * dt;
    }
  }
  const cap = b.kind === "comet" ? MAX_V * 1.1 : MAX_V;
  const sp = Math.hypot(b.vx, b.vy);
  if (sp > cap) { b.vx *= cap / sp; b.vy *= cap / sp; }
  b.x += b.vx * dt;
  b.y += b.vy * dt;
  b.spin += (b.vx * dt) / R;
  const e = heavy ? 0.3 : 0.45;
  for (const s of t.walls) hitSeg(b, s, e);
  if (b.inLane && b.x < 694) b.inLane = false;
  if (!b.inLane) hitSeg(b, t.gate, e);
  t.slings.forEach((s, i) => {
    const h = hitSeg(b, s, 0.5);
    if (h && s.kick) {
      b.vx += h.nx * s.kick;
      b.vy += h.ny * s.kick;
      ev.push({ type: "sling", i: Math.floor(i / 3), pts: s.pts ?? 0, x: h.cx, y: h.cy });
    }
  });
  t.bumpers.forEach((k, i) => {
    const dx = b.x - k.x;
    const dy = b.y - k.y;
    const d = Math.hypot(dx, dy);
    if (d >= k.r + R || d === 0) return;
    const nx = dx / d;
    const ny = dy / d;
    b.x = k.x + nx * (k.r + R);
    b.y = k.y + ny * (k.r + R);
    const vn = b.vx * nx + b.vy * ny;
    if (vn < 0) { b.vx -= 2 * vn * nx; b.vy -= 2 * vn * ny; }
    const kick = k.kick * (heavy ? 0.45 : 0.6);
    b.vx += nx * kick;
    b.vy += ny * kick;
    if (k.hitT <= 0) {
      ev.push({ type: "bumper", i, pts: k.pts, x: k.x, y: k.y });
      if (heavy) ev.push({ type: "crash", x: b.x - nx * R, y: b.y - ny * R });
    }
    k.hitT = 0.45;
  });
  t.spinners.forEach((s, i) => {
    const d = Math.hypot(b.x - s.x, b.y - s.y);
    if (d < s.r + R * 0.5 && s.spin < 6) {
      s.spin = Math.min(30, s.spin + Math.hypot(b.vx, b.vy) / 60);
      s.count += 1;
      const lit = !s.lit && s.count >= 5;
      if (lit) { s.lit = true; s.litT = 6; }
      ev.push({ type: "spinner", i, pts: 25, x: s.x, y: s.y, lit });
    }
  });
  for (const f of t.flippers) {
    const t0 = tip(f);
    const dx = t0.x - f.p.x;
    const dy = t0.y - f.p.y;
    const L2 = dx * dx + dy * dy;
    let u = ((b.x - f.p.x) * dx + (b.y - f.p.y) * dy) / L2;
    u = Math.max(0, Math.min(1, u));
    const cx = f.p.x + dx * u;
    const cy = f.p.y + dy * u;
    const rad = 12 - 5 * u;
    let nx = b.x - cx;
    let ny = b.y - cy;
    const d = Math.hypot(nx, ny);
    if (d >= R + rad || d === 0) continue;
    nx /= d;
    ny /= d;
    b.x = cx + nx * (R + rad);
    b.y = cy + ny * (R + rad);
    const omega = f.w * f.side;
    const sx = -omega * (cy - f.p.y);
    const sy = omega * (cx - f.p.x);
    const vn = (b.vx - sx) * nx + (b.vy - sy) * ny;
    if (vn < 0) {
      b.vx -= 1.35 * vn * nx;
      b.vy -= 1.35 * vn * ny;
    }
  }
  if (b.y > TH + 40) {
    b.alive = false;
    ev.push({ type: "drain", ball: b });
  }
}

export function stepFlippers(t: Table, dt: number) {
  for (const f of t.flippers) {
    const target = f.held ? f.up : f.rest;
    const speed = f.held ? 24 : 13;
    const prev = f.ang;
    if (f.ang > target) f.ang = Math.max(target, f.ang - speed * dt);
    else f.ang = Math.min(target, f.ang + speed * dt);
    f.w = (f.ang - prev) / dt;
  }
}

/** Is a point inside the closed playfield (outer polygon + lane)? Used by the wall test. */
export function inside(x: number, y: number): boolean {
  const poly = [...OUTER, [748, 1420] as [number, number]];
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}
