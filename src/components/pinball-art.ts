/**
 * SPIN-BALL table art, drawn in code at any resolution.
 *
 * A clean remake of the pinball cabinet screen in arcade-bk/arcade-sprites.jpg:
 * same layout, element types, positions and palette (deep blue table,
 * orange/yellow lit rails, magenta frame, lime shooter lane, green centre
 * bumper, red oval, orange ovals and slingshots, blue rollovers, drop-target
 * row, red/white flippers). Everything is in table space, 850 x 720, the same
 * space the colliders in Pinball.tsx use.
 */

export const TW = 850;
export const TH = 720;

type Ctx = CanvasRenderingContext2D;

const ORANGE = "#ff8a1f";
const YELLOW = "#ffe14a";
const CREAM = "#fff3c4";
const MAGENTA = "#ff3fb4";
const LIME = "#b6ff3a";

function glowStroke(ctx: Ctx, path: () => void, color: string, width: number, glow = 14) {
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.shadowColor = color;
  ctx.shadowBlur = glow;
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  path();
  ctx.stroke();
  ctx.restore();
}

/** A lit rail: dark casing, orange body, yellow core, dotted bulbs. */
function rail(ctx: Ctx, pts: [number, number][], width = 16, dots = true) {
  const path = () => {
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (const [x, y] of pts.slice(1)) ctx.lineTo(x, y);
  };
  glowStroke(ctx, path, "#1a0630", width + 8, 0);
  glowStroke(ctx, path, ORANGE, width, 16);
  glowStroke(ctx, path, YELLOW, width * 0.4, 6);
  if (!dots) return;
  ctx.save();
  ctx.fillStyle = CREAM;
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay] = pts[i - 1];
    const [bx, by] = pts[i];
    const n = Math.floor(Math.hypot(bx - ax, by - ay) / 26);
    for (let k = 0; k <= n; k++) {
      const t = n ? k / n : 0;
      ctx.beginPath();
      ctx.arc(ax + (bx - ax) * t, ay + (by - ay) * t, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function curve(ctx: Ctx, pts: [number, number][], color: string, width: number, glow = 12) {
  glowStroke(
    ctx,
    () => {
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length - 1; i++) {
        const mx = (pts[i][0] + pts[i + 1][0]) / 2;
        const my = (pts[i][1] + pts[i + 1][1]) / 2;
        ctx.quadraticCurveTo(pts[i][0], pts[i][1], mx, my);
      }
      const l = pts[pts.length - 1];
      ctx.lineTo(l[0], l[1]);
    },
    color,
    width,
    glow,
  );
}

/** Static table: field, frame, rails, ramps, lanes, guides, slingshot bodies. */
export function drawTable(ctx: Ctx) {
  // Field.
  const g = ctx.createLinearGradient(0, 0, 0, TH);
  g.addColorStop(0, "#1b2a86");
  g.addColorStop(0.55, "#2b3f9f");
  g.addColorStop(1, "#18246f");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, TW, TH);
  const v = ctx.createRadialGradient(430, 360, 120, 430, 360, 560);
  v.addColorStop(0, "rgba(90,120,255,0.18)");
  v.addColorStop(1, "rgba(5,0,30,0.55)");
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, TW, TH);
  // Fine scan lines (the CRT feel of the source, but clean).
  ctx.fillStyle = "rgba(0,0,30,0.12)";
  for (let y = 0; y < TH; y += 4) ctx.fillRect(0, y, TW, 1);
  // Insert dots, like the source's scattered blue lamps.
  ctx.fillStyle = "rgba(110,170,255,0.55)";
  const dots: [number, number][] = [
    [250, 300], [270, 345], [380, 300], [470, 290], [610, 300], [600, 410], [290, 440],
    [420, 440], [470, 460], [590, 470], [380, 610], [560, 610], [300, 600], [640, 590],
    [230, 380], [660, 280], [400, 560], [530, 560], [360, 470], [500, 430],
  ];
  for (const [x, y] of dots) ctx.fillRect(x - 3, y - 3, 6, 6);

  // Outer frame: magenta/pink top-left, lime right (the source's edge colours).
  curve(ctx, [[18, 600], [18, 90], [40, 30], [120, 18], [700, 18], [800, 30], [835, 70]], MAGENTA, 8, 18);
  glowStroke(ctx, () => { ctx.moveTo(858, 110); ctx.lineTo(858, 716); }, LIME, 10, 22);
  curve(ctx, [[790, 26], [840, 60], [858, 120]], LIME, 8, 16);

  // Top-left orbit: orange/lime arc from the left lane over the top.
  curve(ctx, [[40, 330], [40, 120], [80, 62], [160, 50], [230, 60], [280, 92]], ORANGE, 12, 14);
  curve(ctx, [[160, 52], [230, 62], [280, 94]], LIME, 10, 12);
  curve(ctx, [[60, 310], [60, 130], [92, 82], [150, 72]], YELLOW, 3, 6);

  // Score display at the top (red/blue segment box).
  ctx.save();
  ctx.shadowColor = YELLOW;
  ctx.shadowBlur = 12;
  ctx.fillStyle = "#24103a";
  ctx.strokeStyle = YELLOW;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(362, 46, 110, 56, 6);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  const seg = ["#ff3b4a", "#ff3b4a", "#3d6bff", "#ff3b4a", "#3d6bff", "#ffffff"];
  seg.forEach((c, i) => {
    ctx.fillStyle = c;
    ctx.fillRect(372 + i * 16, 58, 12, 32);
  });
  ctx.fillStyle = "rgba(160,190,255,0.7)";
  for (const [x, y] of [[490, 60], [512, 60], [490, 86], [512, 86]]) ctx.fillRect(x, y, 14, 14);

  // Right spiral ramp: pink/red dotted tube looping down the right side.
  const ramp: [number, number][] = [[560, 190], [580, 110], [630, 50], [700, 40], [745, 80], [760, 160], [765, 260], [735, 320], [690, 330]];
  curve(ctx, ramp, "#3a0c3e", 44, 0);
  curve(ctx, ramp, "#ff4a6a", 36, 16);
  curve(ctx, ramp, "#2b1a6a", 22, 0);
  ctx.save();
  ctx.setLineDash([3, 9]);
  curve(ctx, ramp, "#ffd0e0", 4, 4);
  ctx.restore();
  // Ramp return fingers (the source's white/red lane guides under the ramp).
  for (const x of [640, 662, 684]) glowStroke(ctx, () => { ctx.moveTo(x, 250); ctx.lineTo(x, 300); }, "#ffe0e8", 4, 6);

  // Inlane / outlane guides (white lines).
  for (const [x1, y1, x2, y2] of [[140, 395, 140, 520], [185, 395, 185, 470], [700, 370, 700, 470], [742, 365, 742, 500]])
    glowStroke(ctx, () => { ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); }, "#eef4ff", 5, 8);

  // Bottom rails into the flippers, and the corner blocks under them.
  rail(ctx, [[32, 545], [352, 632]], 18);
  rail(ctx, [[806, 520], [614, 628]], 18);
  for (const [pts, c] of [
    [[[32, 560], [352, 650], [352, 720], [32, 720]], "#5a1c10"],
    [[[806, 540], [614, 646], [614, 720], [806, 720]], "#5a1c10"],
  ] as [[number, number][], string][]) {
    ctx.fillStyle = c;
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.fill();
  }
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(32, 560); ctx.lineTo(352, 650); ctx.lineTo(352, 720); ctx.lineTo(32, 720);
  ctx.moveTo(806, 540); ctx.lineTo(614, 646); ctx.lineTo(614, 720); ctx.lineTo(806, 720);
  ctx.clip();
  for (let x = -200; x < 900; x += 34) {
    ctx.fillStyle = (x / 34) % 2 ? ORANGE : YELLOW;
    ctx.beginPath();
    ctx.moveTo(x, 720); ctx.lineTo(x + 17, 720); ctx.lineTo(x + 117, 520); ctx.lineTo(x + 100, 520);
    ctx.fill();
  }
  ctx.restore();

  // Walls the colliders use (left wall, shooter lane), as neon edges.
  glowStroke(ctx, () => { ctx.moveTo(32, 545); ctx.lineTo(32, 95); }, MAGENTA, 5, 10);
  glowStroke(ctx, () => { ctx.moveTo(806, 716); ctx.lineTo(806, 210); }, LIME, 5, 10);
  ctx.fillStyle = "rgba(10,20,60,0.55)";
  ctx.fillRect(808, 150, 36, 570);

  // Small left yellow target slot and its red neighbour.
  ctx.fillStyle = "#ff3b4a";
  ctx.fillRect(86, 350, 14, 14);
}

/** Bumper / kicker visuals; `f` is the hit flash 0..1. */
export function drawCap(
  ctx: Ctx,
  kind: "green" | "red" | "orange" | "pill" | "smallgreen" | "round",
  x: number,
  y: number,
  r: number,
  f: number,
) {
  const pal = {
    green: ["#0b4a10", "#3dff6a", "#d8ffb0"],
    smallgreen: ["#0b4a10", "#2fd65a", "#bfffad"],
    red: ["#4a0710", "#ff3b4a", "#ffe0dc"],
    orange: ["#5a2400", ORANGE, CREAM],
    pill: ["#5a2400", ORANGE, CREAM],
    round: ["#5a2400", ORANGE, YELLOW],
  }[kind];
  const s = 1 + f * 0.12;
  const rx = (kind === "red" ? r * 1.3 : kind === "orange" ? r * 0.9 : r) * s;
  const ry = (kind === "orange" ? r * 1.2 : kind === "pill" ? r * 0.6 : r) * s;
  ctx.save();
  ctx.translate(x, y);
  if (kind === "pill") ctx.rotate(0.5);
  ctx.shadowColor = pal[1];
  ctx.shadowBlur = 18 + f * 30;
  // Skirt.
  ctx.fillStyle = pal[0];
  ctx.beginPath();
  ctx.ellipse(0, 3, rx + 4, ry + 4, 0, 0, Math.PI * 2);
  ctx.fill();
  // Body.
  const g = ctx.createRadialGradient(-rx * 0.3, -ry * 0.35, 2, 0, 0, Math.max(rx, ry));
  g.addColorStop(0, f > 0 ? "#ffffff" : pal[2]);
  g.addColorStop(0.45, pal[1]);
  g.addColorStop(1, pal[0]);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  // Lamp ring.
  ctx.strokeStyle = f > 0 ? "#ffffff" : pal[2];
  ctx.lineWidth = 3;
  ctx.setLineDash(kind === "pill" ? [] : [4, 5]);
  ctx.beginPath();
  ctx.ellipse(0, 0, rx * 0.72, ry * 0.72, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  // Centre symbol: the source's green bumper carries a light-square icon.
  if (kind === "green") {
    ctx.fillStyle = "rgba(230,255,220,0.9)";
    ctx.fillRect(-14, -12, 28, 24);
    ctx.fillStyle = "#1c8a2c";
    ctx.fillRect(-9, -7, 7, 5);
    ctx.fillRect(2, -7, 7, 5);
    ctx.fillRect(-9, 2, 18, 4);
  }
  if (kind === "red") {
    ctx.fillStyle = "rgba(255,240,240,0.92)";
    ctx.fillRect(-16, -5, 32, 10);
  }
  // Hit ring.
  if (f > 0) {
    ctx.strokeStyle = `rgba(255,255,255,${f})`;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.ellipse(0, 0, rx + 10 + (1 - f) * 18, ry + 10 + (1 - f) * 18, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

/** The big slanted orange oval kicker on the upper left. */
export function drawLeftOval(ctx: Ctx, f: number) {
  ctx.save();
  ctx.translate(164, 188);
  ctx.rotate(0.69);
  ctx.shadowColor = ORANGE;
  ctx.shadowBlur = 20 + f * 30;
  ctx.fillStyle = "#5a2400";
  ctx.beginPath();
  ctx.ellipse(0, 4, 98, 54, 0, 0, Math.PI * 2);
  ctx.fill();
  const g = ctx.createLinearGradient(0, -50, 0, 50);
  g.addColorStop(0, f > 0 ? "#fff" : YELLOW);
  g.addColorStop(0.5, ORANGE);
  g.addColorStop(1, "#c24a00");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(0, 0, 92, 48, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = f > 0 ? "#ffffff" : CREAM;
  ctx.beginPath();
  ctx.ellipse(-6, -2, 60, 24, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ff3b4a";
  ctx.beginPath();
  ctx.ellipse(-6, -2, 36, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Orange slingshot triangle with a yellow kick face. */
export function drawSling(ctx: Ctx, a: [number, number], b: [number, number], c: [number, number], f: number) {
  ctx.save();
  ctx.lineJoin = "round";
  ctx.shadowColor = ORANGE;
  ctx.shadowBlur = 16;
  ctx.fillStyle = "#c2410c";
  ctx.strokeStyle = "#1a0630";
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(...a); ctx.lineTo(...b); ctx.lineTo(...c); ctx.closePath();
  ctx.stroke();
  const g = ctx.createLinearGradient(a[0], a[1], c[0], c[1]);
  g.addColorStop(0, YELLOW);
  g.addColorStop(1, "#ff5a1f");
  ctx.fillStyle = g;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = "rgba(255,60,74,0.85)";
  const cx = (a[0] + b[0] + c[0]) / 3;
  const cy = (a[1] + b[1] + c[1]) / 3;
  ctx.beginPath();
  ctx.moveTo((a[0] + cx * 2) / 3, (a[1] + cy * 2) / 3);
  ctx.lineTo((b[0] + cx * 2) / 3, (b[1] + cy * 2) / 3);
  ctx.lineTo((c[0] + cx * 2) / 3, (c[1] + cy * 2) / 3);
  ctx.fill();
  glowStroke(ctx, () => { ctx.moveTo(...a); ctx.lineTo(...b); }, f > 0 ? "#ffffff" : CREAM, f > 0 ? 9 : 5, f > 0 ? 24 : 8);
  ctx.restore();
}

export function drawFlipper(ctx: Ctx, px: number, py: number, tx: number, ty: number) {
  const ang = Math.atan2(ty - py, tx - px);
  const len = Math.hypot(tx - px, ty - py);
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(ang);
  const shape = () => {
    ctx.beginPath();
    ctx.arc(0, 0, 13, Math.PI / 2, -Math.PI / 2);
    ctx.lineTo(len, -6);
    ctx.arc(len, 0, 6, -Math.PI / 2, Math.PI / 2);
    ctx.closePath();
  };
  ctx.shadowColor = "rgba(0,0,20,0.7)";
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 6;
  shape();
  ctx.fillStyle = "#1a0630";
  ctx.fill();
  ctx.shadowColor = "transparent";
  ctx.scale(0.86, 0.78);
  shape();
  const g = ctx.createLinearGradient(0, -13, 0, 13);
  g.addColorStop(0, "#ff8a96");
  g.addColorStop(0.45, "#e8283a");
  g.addColorStop(1, "#8a0a1a");
  ctx.fillStyle = g;
  ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(ang);
  ctx.fillStyle = "rgba(255,240,236,0.95)";
  ctx.beginPath();
  ctx.roundRect(4, -6, len - 10, 4, 2);
  ctx.fill();
  // Pivot cap.
  const cg = ctx.createRadialGradient(-2, -2, 1, 0, 0, 7);
  cg.addColorStop(0, "#ffffff");
  cg.addColorStop(1, "#8a8fa8");
  ctx.fillStyle = cg;
  ctx.beginPath();
  ctx.arc(0, 0, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawBall(ctx: Ctx, x: number, y: number, r: number) {
  ctx.save();
  ctx.fillStyle = "rgba(0,0,20,0.45)";
  ctx.beginPath();
  ctx.ellipse(x + 4, y + 6, r, r * 0.8, 0, 0, Math.PI * 2);
  ctx.fill();
  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
  g.addColorStop(0, "#ffffff");
  g.addColorStop(0.35, "#dfe3f0");
  g.addColorStop(0.8, "#7c829c");
  g.addColorStop(1, "#3a3f58");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  // Table reflection (blue) and a sharp highlight.
  ctx.fillStyle = "rgba(90,130,255,0.45)";
  ctx.beginPath();
  ctx.ellipse(x + r * 0.15, y + r * 0.55, r * 0.6, r * 0.22, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.ellipse(x - r * 0.38, y - r * 0.42, r * 0.28, r * 0.18, -0.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Clean SPIN-BALL logo: yellow-orange heavy italic letters, blue outline, purple marquee with streaks. */
export function makeLogo(scale = 2): HTMLCanvasElement {
  const W = 420;
  const H = 120;
  const c = document.createElement("canvas");
  c.width = W * scale;
  c.height = H * scale;
  const ctx = c.getContext("2d")!;
  ctx.scale(scale, scale);
  // Marquee panel.
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#3a1f9a");
  bg.addColorStop(1, "#5a2ab8");
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.roundRect(4, 4, W - 8, H - 8, 12);
  ctx.fill();
  ctx.save();
  ctx.clip();
  // Orange / yellow cosmic streaks like the cabinet marquee.
  for (const [x, col] of [[40, ORANGE], [120, YELLOW], [300, ORANGE], [380, YELLOW]] as [number, string][]) {
    ctx.fillStyle = col;
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.moveTo(x, 0); ctx.lineTo(x + 26, 0); ctx.lineTo(x - 14, H); ctx.lineTo(x - 40, H);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = "rgba(255,255,255,0.8)";
  for (const [x, y] of [[70, 20], [200, 98], [260, 16], [350, 100], [20, 90]]) ctx.fillRect(x, y, 3, 3);
  ctx.restore();
  ctx.strokeStyle = "#1b1440";
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.roundRect(4, 4, W - 8, H - 8, 12);
  ctx.stroke();
  ctx.strokeStyle = "#7fd8ff";
  ctx.lineWidth = 2;
  ctx.stroke();
  // Letters.
  ctx.font = 'italic 900 70px "Arial Black", "Helvetica Neue", Impact, sans-serif';
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const tx = W / 2;
  const ty = H / 2 + 4;
  ctx.lineJoin = "round";
  ctx.strokeStyle = "#140a3a";
  ctx.lineWidth = 18;
  ctx.strokeText("SPIN-BALL", tx, ty + 4, W - 40);
  ctx.strokeStyle = "#2f5bff";
  ctx.lineWidth = 9;
  ctx.strokeText("SPIN-BALL", tx, ty, W - 40);
  const tg = ctx.createLinearGradient(0, ty - 30, 0, ty + 30);
  tg.addColorStop(0, "#fff59a");
  tg.addColorStop(0.45, YELLOW);
  tg.addColorStop(0.55, "#ffb21f");
  tg.addColorStop(1, ORANGE);
  ctx.fillStyle = tg;
  ctx.fillText("SPIN-BALL", tx, ty, W - 40);
  return c;
}
