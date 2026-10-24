"use client";

import { useEffect, useRef } from "react";
import {
  makeTable,
  newBall,
  stepBall,
  stepFlippers,
  tip,
  R,
  SLINGS,
  TH,
  TW,
  type Ball,
  type BallKind,
  type Flipper,
  type HitEvent,
} from "@/lib/arcade/pinball-physics";

/**
 * SPIN-BALL: the pinball machine from the arcade floor.
 *
 * Art: public/arcade/spin-ball/ (cut from BasicHiro's sheets in
 * public/arcade-bk/Spin Ball/). table.webp is the empty table; every sprite
 * sheet row is an 8-frame strip <sheet>-<row>.webp (159 x 110 per frame).
 * Physics and walls live in src/lib/arcade/pinball-physics.ts, in table space.
 *
 * Same flow as the other cabinets: CONTROLS -> 3, 2, 1, GO!!! -> play ->
 * last ball lost -> GAME OVER (score / HI, ENTER OR CLICK) -> countdown again.
 * High score: local best in localStorage; the arcade floor submits online for
 * signed-in players via onGameOver (guests stay local).
 *
 * Desktop: Z / Left arrow / Left Shift = left flipper, M / / / Right arrow /
 * Right Shift = right flipper, Space hold + release = plunger.
 * Touch: left half / right half = flippers; ball in the lane: hold + release.
 */

const ROOT = "/arcade/spin-ball/";
const FW = 159;
const FH = 110;
const BALLS = 3;
const HUD = 64;
const POWER_TIME = 15;

type Phase = "controls" | "count" | "play" | "boom" | "over";
type Power = Exclude<BallKind, "standard" | "orb"> | "multi";
type Fx = { row: "impact"; frames: number[]; x: number; y: number; t: number; dur: number; size: number };

const STRIPS = [
  "balls-standard", "balls-comet", "balls-charged", "balls-heavy", "balls-orbs",
  "bumpers-blue", "bumpers-red", "bumpers-star", "bumpers-sling", "bumpers-spinner",
  "paddles-left", "paddles-right", "paddles-left-cosmic", "paddles-right-cosmic", "paddles-impact",
] as const;
type Strip = (typeof STRIPS)[number];

/** Flipper frames: [pivotX, pivotY, axis angle] inside a 159 x 110 frame, measured from the sprites. */
const LEFT_F: Record<number, [number, number, number]> = { 0: [34.7, 36.1, 0.319], 1: [32.9, 37.1, 0.314], 3: [41.6, 22.7, 0.494], 5: [35.9, 65.6, -0.243] };
const RIGHT_F: Record<number, [number, number, number]> = { 0: [125.5, 38.6, 2.848], 3: [121.8, 66.3, -2.654], 6: [122.7, 64.2, -2.958], 7: [120.8, 44.0, 2.882] };
const STRIKE_L = [1, 3, 5];
const STRIKE_R = [3, 6, 7];

const POWER_LABEL: Record<Power, string> = {
  comet: "COMET BALL!  x2 POINTS",
  charged: "CHARGED BALL!  MAGNET",
  heavy: "HEAVY BALL!  x3 BUMPERS",
  multi: "MULTI-BALL!",
};

export function Pinball({
  onExit,
  onGameOver,
  onScore,
  onRunStart,
}: {
  onExit: () => void;
  onGameOver?: (score: number) => void;
  /** Live score while playing (spectator feed). */
  onScore?: (score: number) => void;
  /** Fired once when a run's countdown starts. */
  onRunStart?: () => void;
}) {
  const shellRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const onExitRef = useRef(onExit);
  const onGameOverRef = useRef(onGameOver);
  const onScoreRef = useRef(onScore);
  const onRunStartRef = useRef(onRunStart);
  useEffect(() => {
    onExitRef.current = onExit;
    onGameOverRef.current = onGameOver;
    onScoreRef.current = onScore;
    onRunStartRef.current = onRunStart;
  }, [onExit, onGameOver, onScore, onRunStart]);

  useEffect(() => {
    const shell = shellRef.current;
    const canvas = canvasRef.current;
    if (!shell || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const pixelFont = (() => {
      const v = getComputedStyle(document.documentElement).getPropertyValue("--font-pixel").trim();
      return v || '"Courier New", monospace';
    })();

    const img: Partial<Record<Strip | "table", HTMLImageElement>> = {};
    const load = (key: Strip | "table", src: string) => {
      const im = new Image();
      im.onload = () => (img[key] = im);
      im.src = src;
    };
    load("table", ROOT + "table.webp");
    STRIPS.forEach((s) => load(s, `${ROOT}${s}.webp`));

    /** Draw frame `i` of a strip centred at (x, y), `size` = drawn frame width in table units. */
    const sprite = (s: Strip, i: number, x: number, y: number, size: number, rot = 0, alpha = 1) => {
      const im = img[s];
      if (!im) return;
      const k = size / FW;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(x, y);
      if (rot) ctx.rotate(rot);
      ctx.drawImage(im, (i % 8) * FW, 0, FW, FH, (-FW / 2) * k, (-FH / 2) * k, FW * k, FH * k);
      ctx.restore();
    };

    /* ---- state ---- */
    let table = makeTable();
    let phase: Phase = "controls";
    let countT = 0;
    let boomT = 0;
    let clock = 0;
    let score = 0;
    let ballNo = 1;
    let high = 0;
    try {
      high = Number(localStorage.getItem("spin-ball-high")) || 0;
    } catch {
      high = 0;
    }
    let balls: Ball[] = [newBall()];
    let power: Power | null = null;
    let powerT = 0;
    let label = "";
    let labelT = 0;
    let bumperHits = 0;
    let charge = 0;
    let charging = false;
    let shake = 0;
    let lostT = 0;
    const fx: Fx[] = [];
    const pops: { text: string; x: number; y: number; t: number }[] = [];
    const bumpAnim = table.bumpers.map(() => ({ seq: [] as number[], t: 0 }));
    const slingT = [0, 0];

    const pad = (n: number) => String(Math.max(0, Math.floor(n))).padStart(6, "0");
    const saveHigh = () => {
      if (score <= high) return;
      high = score;
      try {
        localStorage.setItem("spin-ball-high", String(high));
      } catch {
        /* private mode */
      }
    };
    const add = (n: number, x: number, y: number) => {
      const mult = power === "comet" ? 2 : power === "charged" ? 1.5 : 1;
      const pts = Math.round(n * mult);
      score += pts;
      pops.push({ text: `+${pts}`, x, y, t: 0 });
      onScoreRef.current?.(score);
    };
    const impact = (frames: number[], x: number, y: number, size = 110, dur = 0.35) =>
      fx.push({ row: "impact", frames, x, y, t: 0, dur, size });

    const activate = (p: Power) => {
      power = p;
      powerT = POWER_TIME;
      label = POWER_LABEL[p];
      labelT = 2.2;
      if (p === "multi") {
        for (let i = 0; i < 2; i++) {
          const o = newBall("orb");
          o.inLane = false;
          o.x = 300 + i * 160;
          o.y = 160;
          o.vx = (i ? 1 : -1) * 260;
          o.vy = 120;
          balls.push(o);
        }
      } else {
        for (const b of balls) if (b.kind !== "orb") b.kind = p;
      }
    };
    const randomPower = () => {
      const list: Power[] = ["comet", "charged", "heavy", "multi"];
      activate(list[Math.floor(Math.random() * list.length)]);
    };
    const endPower = () => {
      if (power && power !== "multi") for (const b of balls) if (b.kind !== "orb") b.kind = "standard";
      power = null;
    };

    const serve = () => {
      balls = [newBall()];
      if (power && power !== "multi") endPower();
      charge = 0;
      charging = false;
    };
    const fresh = () => {
      table = makeTable();
      score = 0;
      ballNo = 1;
      bumperHits = 0;
      power = null;
      powerT = 0;
      labelT = 0;
      fx.length = 0;
      pops.length = 0;
      serve();
      onScoreRef.current?.(0);
    };
    const begin = () => {
      phase = "count";
      countT = 0;
      table.flippers.forEach((f) => (f.held = false));
      onRunStartRef.current?.();
    };
    const again = () => {
      fresh();
      begin();
    };
    const mainInLane = () => balls.length === 1 && balls[0].inLane && balls[0].y > 1280 && balls[0].alive;
    const launch = () => {
      if (!mainInLane()) return;
      balls[0].vy = -(1750 + 650 * Math.min(1, charge));
      charge = 0;
      charging = false;
    };

    const handle = (ev: HitEvent[]) => {
      for (const e of ev) {
        if (e.type === "bumper") {
          const k = table.bumpers[e.i];
          const heavy = balls.some((b) => b.kind === "heavy");
          const boosted = power === "comet" || power === "heavy" || power === "charged";
          let pts = e.pts * (heavy ? 3 : 1);
          if (k.kind === "blue") {
            if (boosted) pts = 500;
            bumpAnim[e.i] = { seq: boosted ? [6, 6, 5, 5] : [2, 3, 4, 5], t: 0 };
          } else if (k.kind === "red") {
            if (boosted) pts = 200;
            bumpAnim[e.i] = { seq: boosted ? [4, 6, 5, 5] : [2, 2, 5, 5], t: 0 };
          } else {
            bumpAnim[e.i] = { seq: [3, 4, 5, 5], t: 0 };
          }
          add(pts, e.x, e.y - 34);
          impact([0, 1, 2, 3, 4], e.x, e.y, 90);
          bumperHits += 1;
          if (bumperHits % 15 === 0 || (!power && Math.random() < 0.04)) randomPower();
        } else if (e.type === "sling") {
          slingT[e.i] = 0.32;
          add(e.pts, e.x, e.y);
          impact([1, 2, 3], e.x, e.y, 70, 0.25);
        } else if (e.type === "spinner") {
          add(e.pts, e.x, e.y - 30);
          if (e.lit) {
            add(1000, e.x, e.y - 60);
            randomPower();
            if (table.spinners.every((s) => s.lit)) {
              add(10000, TW / 2, 400);
              table.spinners.forEach((s) => { s.lit = false; s.count = 0; });
            }
          }
        } else if (e.type === "crash") {
          shake = 0.18;
          impact([5, 6], e.x, e.y, 120, 0.4);
        } else if (e.type === "drain") {
          impact([7], Math.max(60, Math.min(TW - 60, e.ball.x)), TH - 50, 140, 0.6);
        }
      }
    };

    /* ---- layout ---- */
    let w = 0;
    let h = 0;
    let scale = 1;
    let ox = 0;
    let oy = 0;
    const resize = () => {
      w = shell.clientWidth;
      h = shell.clientHeight;
      if (w < 2 || h < 2) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      scale = Math.min(w / TW, (h - HUD) / TH);
      ox = (w - TW * scale) / 2;
      oy = HUD + (h - HUD - TH * scale) / 2;
    };

    const drawFlipper = (f: Flipper, i: number) => {
      const left = f.side === 1;
      const t0 = tip(f);
      const physAng = Math.atan2(t0.y - f.p.y, t0.x - f.p.x);
      const strip: Strip = left ? "paddles-left" : "paddles-right";
      const table_ = left ? LEFT_F : RIGHT_F;
      let frame = 0;
      if (f.strikeT > 0) {
        const seq = left ? STRIKE_L : STRIKE_R;
        frame = seq[Math.min(seq.length - 1, Math.floor((1 - f.strikeT / 0.2) * seq.length))];
      }
      const [px, py, fa] = table_[frame] ?? table_[0];
      const im = img[strip];
      if (!im) return;
      const k = f.len / 92;
      const drawAt = (s: HTMLImageElement, fr: number, pivot: [number, number, number], alpha = 1, add = false) => {
        ctx.save();
        ctx.globalAlpha = alpha;
        if (add) ctx.globalCompositeOperation = "lighter";
        ctx.translate(f.p.x, f.p.y);
        ctx.rotate(physAng - pivot[2]);
        ctx.scale(k, k);
        ctx.drawImage(s, fr * FW, 0, FW, FH, -pivot[0], -pivot[1], FW, FH);
        ctx.restore();
      };
      drawAt(im, frame, [px, py, fa]);
      // Cosmic charge & glow rows while a power-up is live (or on a charged flip).
      const cosmic = img[left ? "paddles-left-cosmic" : "paddles-right-cosmic"];
      if (cosmic && (power || f.strikeT > 0.1)) {
        const fr = 1 + (Math.floor(clock * 12 + i * 3) % 6);
        drawAt(cosmic, fr, table_[0], power ? 0.85 : 0.5, true);
      }
    };

    const drawBall = (b: Ball) => {
      const row: Strip =
        b.kind === "comet" ? "balls-comet"
          : b.kind === "charged" ? "balls-charged"
            : b.kind === "heavy" ? "balls-heavy"
              : b.kind === "orb" ? "balls-orbs"
                : "balls-standard";
      const fps = b.kind === "standard" ? 6 + Math.min(18, Math.hypot(b.vx, b.vy) / 90) : 12;
      const fr = Math.floor(clock * fps + (b.kind === "orb" ? b.x : 0)) % 8;
      const body = b.kind === "heavy" ? 2.25 : 2;
      // Comet tail frames point right in the sheet: turn them to trail the ball.
      const rot = b.kind === "comet" ? Math.atan2(-b.vy, -b.vx) : 0;
      sprite(row, fr, b.x, b.y, (R * body * FW) / 88, rot);
    };

    const draw = () => {
      ctx.fillStyle = "#05000f";
      ctx.fillRect(0, 0, w, h);
      ctx.save();
      ctx.translate(ox + (shake > 0 ? Math.sin(clock * 70) * 5 : 0), oy);
      ctx.scale(scale, scale);
      if (img.table) ctx.drawImage(img.table, 0, 0, TW, TH);
      ctx.imageSmoothingEnabled = true;

      // Spinners: spin faster when hit; lit when completed.
      table.spinners.forEach((s) => {
        const fr = s.lit ? 7 : Math.floor(s.angle) % 7;
        sprite("bumpers-spinner", fr, s.x, s.y, 112);
      });
      // Slingshots: idle -> streak frames on kick.
      SLINGS.forEach(([a, b], i) => {
        const cx = (a[0] + b[0]) / 2 + (i ? 14 : -14);
        const cy = (a[1] + b[1]) / 2;
        const fr = slingT[i] > 0 ? 4 + Math.min(3, Math.floor((1 - slingT[i] / 0.32) * 4)) : Math.floor(clock * 2) % 4;
        ctx.save();
        ctx.translate(cx, cy);
        if (i) ctx.scale(-1, 1);
        sprite("bumpers-sling", fr, 0, 0, 230, 1.2);
        ctx.restore();
      });
      // Bumpers: idle -> score frames -> burst.
      table.bumpers.forEach((k, i) => {
        const a = bumpAnim[i];
        let fr: number;
        if (a.seq.length && a.t < 0.45) fr = a.seq[Math.min(a.seq.length - 1, Math.floor((a.t / 0.45) * a.seq.length))];
        else {
          const idle = k.kind === "blue" ? [0, 1, 7, 1] : k.kind === "red" ? [0, 1, 3, 7] : [0, 1, 2, 6, 7];
          fr = idle[Math.floor(clock * 4 + i) % idle.length];
        }
        const size = k.kind === "star" ? 120 : 118;
        sprite(k.kind === "blue" ? "bumpers-blue" : k.kind === "red" ? "bumpers-red" : "bumpers-star", fr, k.x, k.y - 4, size);
      });
      table.flippers.forEach(drawFlipper);
      // Plunger.
      ctx.fillStyle = "#c9ccd8";
      ctx.fillRect(712, 1347 + charge * 16, 24, 10);
      ctx.fillStyle = "#ff3b4a";
      ctx.fillRect(719, 1357 + charge * 16, 10, 30);
      if (phase !== "controls" && phase !== "over") balls.forEach((b) => b.alive && drawBall(b));
      fx.forEach((e) => {
        const fr = e.frames[Math.min(e.frames.length - 1, Math.floor((e.t / e.dur) * e.frames.length))];
        sprite("paddles-impact", fr, e.x, e.y, e.size, 0, Math.max(0, 1 - e.t / e.dur / 1.4));
      });
      ctx.font = `20px ${pixelFont}`;
      ctx.textAlign = "center";
      pops.forEach((p) => {
        ctx.globalAlpha = Math.max(0, 1 - p.t / 1.1);
        ctx.fillStyle = "#000";
        ctx.fillText(p.text, p.x + 2, p.y - p.t * 40 + 2);
        ctx.fillStyle = "#ffe14a";
        ctx.fillText(p.text, p.x, p.y - p.t * 40);
      });
      ctx.globalAlpha = 1;
      ctx.restore();

      // HUD (same shape as the other cabinets: score centre, HI under it).
      const s = Math.max(0.7, Math.min(1.4, w / 900));
      ctx.textAlign = "center";
      ctx.fillStyle = "#ffe14a";
      ctx.font = `${Math.round(11 * s)}px ${pixelFont}`;
      ctx.fillText("SCORE", w / 2, 18 * s);
      ctx.fillStyle = "#fff6c2";
      ctx.font = `${Math.round(20 * s)}px ${pixelFont}`;
      ctx.fillText(pad(score), w / 2, 40 * s);
      ctx.fillStyle = "#9ad7ff";
      ctx.font = `${Math.round(10 * s)}px ${pixelFont}`;
      ctx.fillText(`HI ${pad(Math.max(high, score))}`, w / 2, 56 * s);
      ctx.textAlign = "left";
      ctx.fillStyle = "#ff8a3d";
      ctx.font = `${Math.round(11 * s)}px ${pixelFont}`;
      ctx.fillText(`BALL ${Math.min(ballNo, BALLS)}/${BALLS}`, 14, 22 * s);
      if (power && power !== "multi") {
        ctx.fillStyle = "#3df0ff";
        ctx.fillText(`${power.toUpperCase()} ${Math.ceil(powerT)}`, 14, 40 * s);
      }

      const cx = w / 2;
      const cy = oy + (TH * scale) / 2;
      const u = Math.max(0.6, Math.min(1.3, (TW * scale) / 600));
      // Big prompts (countdown, ball lost, GAME OVER) scale with the viewport, not the narrow table.
      const U = Math.max(0.75, Math.min(2.2, Math.min(w / 640, h / 700)));
      if (labelT > 0 && phase === "play") {
        ctx.textAlign = "center";
        ctx.globalAlpha = Math.min(1, labelT * 2);
        ctx.font = `${Math.round(20 * u)}px ${pixelFont}`;
        const tw = ctx.measureText(label).width;
        ctx.fillStyle = "rgba(10,0,30,0.78)";
        ctx.fillRect(cx - tw / 2 - 14, cy - 150 * u - 26 * u, tw + 28, 38 * u);
        ctx.fillStyle = "#3df0ff";
        ctx.fillText(label, cx, cy - 150 * u);
        ctx.globalAlpha = 1;
      }
      if (phase === "play" && mainInLane()) {
        ctx.textAlign = "center";
        ctx.fillStyle = "rgba(255,246,194,0.85)";
        ctx.font = `${Math.round(12 * u)}px ${pixelFont}`;
        ctx.fillText("HOLD + RELEASE TO LAUNCH", cx, oy + TH * scale - 30 * u);
      }
      if (lostT > 0 && phase === "play") {
        ctx.textAlign = "center";
        ctx.fillStyle = "#ff4ad2";
        ctx.font = `${Math.round(26 * U)}px ${pixelFont}`;
        ctx.fillText("BALL LOST", cx, cy);
      }
      if (phase === "count") {
        const lbl = countT < 3 ? String(3 - Math.floor(countT)) : "GO!!!";
        ctx.textAlign = "center";
        ctx.fillStyle = "#ffe14a";
        ctx.font = `${Math.round(54 * U)}px ${pixelFont}`;
        ctx.fillText(lbl, cx, cy);
      }
      if (phase === "boom") {
        ctx.textAlign = "center";
        ctx.fillStyle = "#ff4ad2";
        ctx.font = `${Math.round(26 * U)}px ${pixelFont}`;
        ctx.fillText("LAST BALL LOST", cx, cy);
      }
      if (phase === "over") {
        ctx.fillStyle = "rgba(3,0,20,0.86)";
        ctx.fillRect(0, 0, w, h);
        ctx.textAlign = "center";
        let y = h / 2 - 70 * U;
        ctx.fillStyle = "#ff4ad2";
        ctx.font = `${Math.round(24 * U)}px ${pixelFont}`;
        ctx.fillText("GAME OVER", cx, y);
        y += 46 * U;
        ctx.fillStyle = "#ffe14a";
        ctx.font = `${Math.round(18 * U)}px ${pixelFont}`;
        ctx.fillText(pad(score), cx, y);
        y += 32 * U;
        ctx.fillStyle = "#7ef6ff";
        ctx.font = `${Math.round(13 * U)}px ${pixelFont}`;
        ctx.fillText(`HI ${pad(high)}`, cx, y);
        y += 30 * U;
        ctx.fillText("ENTER OR CLICK", cx, y);
      }
      if (phase === "controls") {
        ctx.fillStyle = "rgba(4,0,20,0.9)";
        ctx.fillRect(0, 0, w, h);
        const touch = window.matchMedia("(pointer: coarse)").matches;
        const rows: [string, string][] = touch
          ? [["TAP LEFT / RIGHT", "FLIPPERS"], ["HOLD + RELEASE", "LAUNCH"], ["BUMPERS + SPINNERS", "POINTS"], ["LIGHT A SPINNER", "POWER-UP BALL"], ["THREE BALLS", "MAKE THEM COUNT"]]
          : [["Z / LEFT", "LEFT FLIPPER"], ["M / RIGHT", "RIGHT FLIPPER"], ["HOLD SPACE", "LAUNCH"], ["BUMPERS + SPINNERS", "POINTS"], ["LIGHT A SPINNER", "POWER-UP BALL"], ["THREE BALLS", "MAKE THEM COUNT"]];
        const k = Math.min(u * 1.1, h / 640);
        let y = h / 2 - (rows.length * 40 + 90) * k / 2;
        ctx.textAlign = "center";
        ctx.fillStyle = "#3df0ff";
        ctx.font = `${Math.round(26 * k)}px ${pixelFont}`;
        ctx.fillText("CONTROLS", cx, y);
        y += 48 * k;
        rows.forEach(([key, what]) => {
          ctx.fillStyle = "#ffe14a";
          ctx.font = `${Math.round(13 * k)}px ${pixelFont}`;
          ctx.fillText(key, cx, y);
          ctx.fillStyle = "#7ef6ff";
          ctx.font = `${Math.round(12 * k)}px ${pixelFont}`;
          ctx.fillText(what, cx, y + 16 * k);
          y += 40 * k;
        });
        ctx.fillStyle = "#fff6c2";
        ctx.font = `${Math.round(13 * k)}px ${pixelFont}`;
        ctx.fillText("ENTER OR CLICK TO PLAY", cx, y + 8 * k);
      }
    };

    /* ---- loop ---- */
    let last = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      if (w < 2) resize();
      clock += dt;
      if (phase === "count") {
        countT += dt;
        if (countT >= 3.4) phase = "play";
      } else if (phase === "boom") {
        boomT += dt;
        if (boomT >= 1.15) phase = "over";
      }
      const N = 20;
      for (let i = 0; i < N; i++) {
        const sdt = dt / N;
        stepFlippers(table, sdt);
        if (phase === "play" && lostT <= 0) {
          const ev: HitEvent[] = [];
          for (const b of balls) stepBall(table, b, sdt, ev, { magnet: power === "charged" });
          if (ev.length) handle(ev);
        }
      }
      for (const f of table.flippers) f.strikeT = Math.max(0, f.strikeT - dt);
      if (phase === "play") {
        if (charging) charge = Math.min(1, charge + dt);
        balls = balls.filter((b) => b.alive);
        if (balls.length && balls.every((b) => b.kind === "orb") && power !== "multi") balls[0].kind = "standard";
        if (power === "multi" && balls.length <= 1) {
          power = null;
          if (balls[0]) balls[0].kind = "standard";
        }
        if (power && power !== "multi") {
          powerT -= dt;
          if (powerT <= 0) endPower();
        }
        if (!balls.length && lostT <= 0) {
          if (ballNo >= BALLS) {
            phase = "boom";
            boomT = 0;
            saveHigh();
            onGameOverRef.current?.(score);
          } else {
            lostT = 1.1;
          }
        }
        if (lostT > 0) {
          lostT -= dt;
          if (lostT <= 0) {
            ballNo += 1;
            serve();
          }
        }
      }
      table.bumpers.forEach((k, i) => {
        k.hitT = Math.max(0, k.hitT - dt);
        bumpAnim[i].t += dt;
      });
      table.spinners.forEach((s) => {
        s.angle += dt * (2 + s.spin * 3);
        s.spin = Math.max(0, s.spin - dt * 6);
        if (s.lit) {
          s.litT -= dt;
          if (s.litT <= 0) { s.lit = false; s.count = 0; }
        }
      });
      slingT[0] = Math.max(0, slingT[0] - dt);
      slingT[1] = Math.max(0, slingT[1] - dt);
      labelT = Math.max(0, labelT - dt);
      shake = Math.max(0, shake - dt);
      for (let i = fx.length - 1; i >= 0; i--) if ((fx[i].t += dt) > fx[i].dur * 1.4) fx.splice(i, 1);
      for (let i = pops.length - 1; i >= 0; i--) if ((pops[i].t += dt) > 1.1) pops.splice(i, 1);
      draw();
      raf = requestAnimationFrame(tick);
    };

    /* ---- input ---- */
    const LEFT = new Set(["KeyZ", "ShiftLeft", "ArrowLeft", "KeyA"]);
    const RIGHT = new Set(["KeyM", "Slash", "ShiftRight", "ArrowRight", "KeyL"]);
    const flip = (i: number, on: boolean) => {
      const f = table.flippers[i];
      if (on && !f.held) f.strikeT = 0.2;
      f.held = on;
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) e.preventDefault();
      if (e.code === "Escape") {
        onExitRef.current();
        return;
      }
      if ((phase === "controls" || phase === "over") && (e.code === "Enter" || e.code === "Space")) {
        if (phase === "controls") begin();
        else again();
        return;
      }
      if (phase !== "play") return;
      if (LEFT.has(e.code)) flip(0, true);
      if (RIGHT.has(e.code)) flip(1, true);
      if ((e.code === "Space" || e.code === "ArrowDown") && !e.repeat && mainInLane()) charging = true;
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (LEFT.has(e.code)) flip(0, false);
      if (RIGHT.has(e.code)) flip(1, false);
      if ((e.code === "Space" || e.code === "ArrowDown") && charging) launch();
    };
    const touches = new Map<number, 0 | 1 | 2>();
    const syncTouch = () => {
      const vals = [...touches.values()];
      flip(0, vals.includes(0));
      flip(1, vals.includes(1));
    };
    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      e.preventDefault();
      if (phase === "controls") return begin();
      if (phase === "over") return again();
      if (phase !== "play") return;
      try {
        canvas.setPointerCapture(e.pointerId);
      } catch {
        /* gone */
      }
      if (mainInLane()) {
        charging = true;
        touches.set(e.pointerId, 2);
        return;
      }
      const rect = canvas.getBoundingClientRect();
      touches.set(e.pointerId, e.clientX - rect.left < rect.width / 2 ? 0 : 1);
      syncTouch();
    };
    const onPointerUp = (e: PointerEvent) => {
      const was = touches.get(e.pointerId);
      touches.delete(e.pointerId);
      if (was === 2 && charging) launch();
      syncTouch();
    };

    // QA hook for headless tests: ?qa=pinball&power=comet starts that power-up on launch.
    const qaPower = new URLSearchParams(window.location.search).get("power") as Power | null;
    let qaTimer = 0;
    if (qaPower && qaPower in POWER_LABEL) {
      const wait = () => {
        if (phase === "play" && balls.length && !mainInLane()) activate(qaPower);
        else qaTimer = window.setTimeout(wait, 200);
      };
      qaTimer = window.setTimeout(wait, 200);
    }

    resize();
    raf = requestAnimationFrame(tick);
    window.addEventListener("resize", resize);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointercancel", onPointerUp);
    return () => {
      window.clearTimeout(qaTimer);
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerUp);
    };
  }, []);

  return (
    <div ref={shellRef} className="game-overlay neon-ride" role="dialog" aria-label="SPIN-BALL">
      <canvas ref={canvasRef} className="neon-ride-canvas" />
      <button
        type="button"
        className="arcade-close"
        aria-label="Close game"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          onExitRef.current();
        }}
      >
        <svg viewBox="0 0 16 16" width="18" height="18" aria-hidden="true">
          <path d="M3 3 L13 13 M13 3 L3 13" stroke="currentColor" strokeWidth="3" strokeLinecap="square" />
        </svg>
      </button>
    </div>
  );
}

export default Pinball;
