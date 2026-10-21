"use client";

import { useEffect, useRef } from "react";
import { drawBall, drawCap, drawFlipper, drawLeftOval, drawSling, drawTable, makeLogo } from "@/components/pinball-art";

/**
 * SPIN-BALL: the pinball machine from the arcade floor, playable.
 *
 * The table is a clean, code-drawn remake of the cabinet screen in
 * arcade-bk/arcade-sprites.jpg (see pinball-art.ts): same layout, element
 * types, positions and palette, rendered crisp at any resolution. Colliders
 * live in the same 850 x 720 table space as the art, so they line up.
 *
 * Desktop: Z / Left Shift / Left arrow = left flipper, M / / / Right Shift /
 * Right arrow = right flipper, Space (hold, release) = plunger.
 * Touch: left half = left flipper, right half = right flipper; while the ball
 * waits in the shooter lane, hold and release anywhere to launch.
 */

const FW = 850;
const FH = 720;
const HUD = 76;
const BALLS = 3;
const R = 11;
const G = 1250;
const MAX_V = 2000;

type V = { x: number; y: number };
type Seg = { a: V; b: V; kick?: number; pts?: number; flash?: number };
type Bumper = { x: number; y: number; r: number; pts: number; kick: number; flash: number };
type Light = { x: number; y: number; w: number; h: number; color: string; lit: boolean };
type Drop = { x: number; y: number; w: number; h: number; down: boolean; color: string };
type Flipper = { p: V; len: number; rest: number; up: number; side: 1 | -1; ang: number; w: number; held: boolean };
type Phase = "controls" | "play" | "over";

const v = (x: number, y: number): V => ({ x, y });
const chain = (pts: V[]): Seg[] => pts.slice(1).map((b, i) => ({ a: pts[i], b }));

export function Pinball({
  onExit,
  onGameOver,
  onScore,
}: {
  onExit: () => void;
  onGameOver?: (score: number) => void;
  /** Live score while playing (spectator feed). */
  onScore?: (score: number) => void;
}) {
  const shellRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const onExitRef = useRef(onExit);
  const onGameOverRef = useRef(onGameOver);
  const onScoreRef = useRef(onScore);
  useEffect(() => {
    onExitRef.current = onExit;
    onGameOverRef.current = onGameOver;
    onScoreRef.current = onScore;
  });

  useEffect(() => {
    const shell = shellRef.current;
    const canvas = canvasRef.current;
    if (!shell || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Static table art, drawn once at 2x for crisp scaling.
    const table = document.createElement("canvas");
    table.width = FW * 2;
    table.height = FH * 2;
    {
      const t = table.getContext("2d")!;
      t.scale(2, 2);
      drawTable(t);
    }
    let logo = makeLogo();
    void document.fonts?.ready.then(() => (logo = makeLogo()));

    /* ---- table geometry, in source pixel space (850 x 720) ---- */
    const walls: Seg[] = [
      ...chain([v(32, 560), v(32, 95), v(62, 52), v(112, 36), v(700, 36), v(780, 52), v(830, 95), v(846, 150), v(846, 716)]),
      ...chain([v(32, 545), v(352, 632)]),
      ...chain([v(806, 716), v(806, 210)]),
      ...chain([v(806, 520), v(614, 628)]),
      { a: v(806, 716), b: v(846, 716) },
    ];
    const gate: Seg = { a: v(806, 210), b: v(846, 160) };
    const slings: Seg[] = [
      { a: v(212, 420), b: v(320, 548), kick: 520, pts: 30 },
      { a: v(212, 420), b: v(216, 522) },
      { a: v(216, 522), b: v(320, 548) },
      { a: v(598, 540), b: v(668, 388), kick: 520, pts: 30 },
      { a: v(668, 388), b: v(688, 505) },
      { a: v(688, 505), b: v(598, 540) },
    ];
    const bumpers: Bumper[] = [
      { x: 433, y: 353, r: 50, pts: 100, kick: 640, flash: 0 }, // big green
      { x: 416, y: 209, r: 36, pts: 100, kick: 600, flash: 0 }, // red oval
      { x: 671, y: 182, r: 36, pts: 100, kick: 600, flash: 0 }, // right orange oval
      { x: 320, y: 125, r: 24, pts: 50, kick: 520, flash: 0 }, // small green
      { x: 270, y: 165, r: 17, pts: 50, kick: 480, flash: 0 }, // orange pill
      { x: 128, y: 158, r: 40, pts: 50, kick: 520, flash: 0 }, // left orange oval (top)
      { x: 200, y: 218, r: 34, pts: 50, kick: 520, flash: 0 }, // left orange oval (bottom)
      { x: 465, y: 583, r: 32, pts: 150, kick: 620, flash: 0 }, // bottom orange target
    ];
    const CAPS = ["green", "red", "orange", "smallgreen", "pill", null, null, "round"] as const;
    const lights: Light[] = [
      [315, 265], [520, 248], [325, 330], [330, 365], [335, 400], [540, 318], [545, 350], [545, 388],
    ].map(([x, y]) => ({ x, y, w: 22, h: 22, color: "#7fd8ff", lit: false }));
    lights.push({ x: 340, y: 445, w: 22, h: 22, color: "#ffe14a", lit: false });
    lights.push({ x: 548, y: 430, w: 22, h: 22, color: "#ff8a3d", lit: false });
    lights.push({ x: 172, y: 320, w: 18, h: 40, color: "#ffe14a", lit: false });
    const DROP_COLORS = ["#ff3b4a", "#ff8a3d", "#ff3b4a", "#ffffff", "#7fd8ff"];
    const drops: Drop[] = [393, 428, 462, 497, 531].map((x, i) => ({ x, y: 505, w: 30, h: 26, down: false, color: DROP_COLORS[i] }));
    const flippers: Flipper[] = [
      { p: v(352, 632), len: 118, rest: 0.55, up: -0.42, side: 1, ang: 0.55, w: 0, held: false },
      { p: v(614, 628), len: 112, rest: 0.6, up: -0.42, side: -1, ang: 0.6, w: 0, held: false },
    ];
    const tip = (f: Flipper): V => v(f.p.x + f.side * Math.cos(f.ang) * f.len, f.p.y + Math.sin(f.ang) * f.len);

    /* ---- state ---- */
    let phase: Phase = "controls";
    let score = 0;
    let ball = 1;
    let high = 0;
    try {
      high = Number(localStorage.getItem("spin-ball-high")) || 0;
    } catch {
      /* private mode */
    }
    const b = { x: 826, y: 704 - R, vx: 0, vy: 0 };
    let inLane = true;
    let charge = 0;
    let charging = false;
    let drainT = 0;
    let shake = 0;
    let pops: { text: string; x: number; y: number; t: number }[] = [];
    let saved = false;

    const add = (n: number, x: number, y: number) => {
      score += n;
      pops.push({ text: String(n), x, y, t: 0.8 });
      onScoreRef.current?.(score);
    };
    const saveHigh = () => {
      if (score > high) {
        high = score;
        try {
          localStorage.setItem("spin-ball-high", String(high));
        } catch {
          /* private mode */
        }
      }
    };
    const serve = () => {
      b.x = 826;
      b.y = 704 - R;
      b.vx = 0;
      b.vy = 0;
      inLane = true;
      charge = 0;
      charging = false;
    };
    const begin = () => {
      phase = "play";
      score = 0;
      ball = 1;
      saved = false;
      lights.forEach((l) => (l.lit = false));
      drops.forEach((d) => (d.down = false));
      onScoreRef.current?.(0);
      serve();
    };
    const launch = () => {
      if (!inLane || b.y < 680) return;
      b.vy = -(1150 + 1050 * Math.min(1, charge));
      charge = 0;
      charging = false;
    };

    /* ---- collisions ---- */
    const hitSeg = (s: Seg, e: number): boolean => {
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
      if (d >= R || d === 0) return false;
      nx /= d;
      ny /= d;
      b.x = cx + nx * R;
      b.y = cy + ny * R;
      const vn = b.vx * nx + b.vy * ny;
      if (vn < 0) {
        b.vx -= (1 + e) * vn * nx;
        b.vy -= (1 + e) * vn * ny;
      }
      if (s.kick) {
        b.vx += nx * s.kick;
        b.vy += ny * s.kick;
        s.flash = 0.12;
        if (s.pts) add(s.pts, cx, cy);
      }
      return true;
    };
    const hitBumper = (k: Bumper) => {
      const dx = b.x - k.x;
      const dy = b.y - k.y;
      const d = Math.hypot(dx, dy);
      if (d >= k.r + R || d === 0) return;
      const nx = dx / d;
      const ny = dy / d;
      b.x = k.x + nx * (k.r + R);
      b.y = k.y + ny * (k.r + R);
      const vn = b.vx * nx + b.vy * ny;
      if (vn < 0) {
        b.vx -= 2 * vn * nx;
        b.vy -= 2 * vn * ny;
      }
      b.vx += nx * k.kick * 0.6;
      b.vy += ny * k.kick * 0.6;
      if (k.flash <= 0) add(k.pts, k.x, k.y - k.r);
      k.flash = 0.15;
    };
    const hitFlipper = (f: Flipper) => {
      const t0 = tip(f);
      const dx = t0.x - f.p.x;
      const dy = t0.y - f.p.y;
      const L2 = dx * dx + dy * dy;
      let t = ((b.x - f.p.x) * dx + (b.y - f.p.y) * dy) / L2;
      t = Math.max(0, Math.min(1, t));
      const cx = f.p.x + dx * t;
      const cy = f.p.y + dy * t;
      const rad = 10 - 4 * t;
      let nx = b.x - cx;
      let ny = b.y - cy;
      const d = Math.hypot(nx, ny);
      if (d >= R + rad || d === 0) return;
      nx /= d;
      ny /= d;
      b.x = cx + nx * (R + rad);
      b.y = cy + ny * (R + rad);
      // Surface velocity of the flipper at the contact point.
      const omega = f.w * f.side;
      const rx = cx - f.p.x;
      const ry = cy - f.p.y;
      const sx = -omega * ry;
      const sy = omega * rx;
      const rvx = b.vx - sx;
      const rvy = b.vy - sy;
      const vn = rvx * nx + rvy * ny;
      if (vn < 0) {
        b.vx -= 1.35 * vn * nx;
        b.vy -= 1.35 * vn * ny;
      }
    };
    const hitBox = (x: number, y: number, w: number, h: number) =>
      b.x + R > x - w / 2 && b.x - R < x + w / 2 && b.y + R > y - h / 2 && b.y - R < y + h / 2;

    const step = (dt: number) => {
      for (const f of flippers) {
        const target = f.held ? f.up : f.rest;
        const speed = f.held ? 22 : 12;
        const prev = f.ang;
        if (f.ang > target) f.ang = Math.max(target, f.ang - speed * dt);
        else f.ang = Math.min(target, f.ang + speed * dt);
        f.w = (f.ang - prev) / dt;
      }
      if (drainT > 0) return;
      b.vy += G * dt;
      const sp = Math.hypot(b.vx, b.vy);
      if (sp > MAX_V) {
        b.vx *= MAX_V / sp;
        b.vy *= MAX_V / sp;
      }
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      for (const s of walls) hitSeg(s, 0.45);
      if (inLane && b.x < 800) inLane = false;
      if (!inLane) hitSeg(gate, 0.4);
      for (const s of slings) hitSeg(s, 0.5);
      for (const k of bumpers) hitBumper(k);
      for (const f of flippers) hitFlipper(f);
      for (const d of drops) {
        if (d.down || !hitBox(d.x, d.y, d.w, d.h)) continue;
        d.down = true;
        b.vy = -Math.abs(b.vy) * 0.6;
        add(500, d.x, d.y);
        if (drops.every((q) => q.down)) {
          add(5000, 462, 470);
          drops.forEach((q) => (q.down = false));
        }
      }
      for (const l of lights) {
        if (l.lit || !hitBox(l.x, l.y, l.w, l.h)) continue;
        l.lit = true;
        add(250, l.x, l.y);
        if (lights.every((q) => q.lit)) {
          add(2500, 433, 280);
          lights.forEach((q) => (q.lit = false));
        }
      }
      if (b.y > FH + 30) {
        drainT = 1.1;
        shake = 0.2;
      }
    };

    /* ---- rendering ---- */
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
      ctx.imageSmoothingEnabled = false;
      scale = Math.min(w / FW, h / (FH + HUD));
      ox = (w - FW * scale) / 2;
      oy = (h - (FH + HUD) * scale) / 2 + HUD * scale;
    };
    const pad = (n: number) => String(Math.max(0, Math.floor(n))).padStart(6, "0");
    const text = (s: string, x: number, y: number, size: number, color: string, align: CanvasTextAlign = "center") => {
      ctx.font = `bold ${size}px "Press Start 2P", ui-monospace, monospace`;
      ctx.textAlign = align;
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#000";
      ctx.fillText(s, x + 3, y + 3);
      ctx.fillStyle = color;
      ctx.fillText(s, x, y);
    };

    const draw = () => {
      ctx.fillStyle = "#070014";
      ctx.fillRect(0, 0, w, h);
      // HUD band above the table.
      const hy = oy - HUD * scale;
      if (logo) {
        const lh = HUD * scale * 0.86;
        const lw = (logo.width / logo.height) * lh;
        ctx.drawImage(logo, ox, hy + (HUD * scale - lh) / 2, lw, lh);
      }
      const fs = Math.max(7, Math.round(15 * scale));
      text(`SCORE ${pad(score)}`, ox + FW * scale * 0.5, hy + HUD * scale * 0.34, fs, "#ffe14a");
      text(`HI ${pad(Math.max(high, score))}`, ox + FW * scale * 0.5, hy + HUD * scale * 0.72, fs, "#7fd8ff");
      text(`BALL ${Math.min(ball, BALLS)}/${BALLS}`, ox + FW * scale - 4, hy + HUD * scale * 0.5, fs, "#ff8a3d", "right");

      ctx.save();
      const sh = shake > 0 ? (Math.random() - 0.5) * 8 : 0;
      ctx.translate(ox + sh, oy);
      ctx.scale(scale, scale);
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(table, 0, 0, FW, FH);
      drawLeftOval(ctx, Math.max(bumpers[5].flash, bumpers[6].flash) / 0.15);
      bumpers.forEach((k, i) => {
        const kind = CAPS[i];
        if (kind) drawCap(ctx, kind, k.x, k.y, k.r, k.flash / 0.15);
      });
      drawSling(ctx, [212, 420], [320, 548], [216, 522], (slings[0].flash ?? 0) / 0.12);
      drawSling(ctx, [668, 388], [598, 540], [688, 505], (slings[3].flash ?? 0) / 0.12);
      // Lit rollovers / targets.
      const pulse = 0.6 + 0.4 * Math.sin(performance.now() / 160);
      for (const l of lights) {
        ctx.shadowColor = l.color;
        ctx.shadowBlur = l.lit ? 22 * pulse : 0;
        ctx.globalAlpha = l.lit ? 1 : 0.35;
        ctx.fillStyle = l.color;
        ctx.beginPath();
        if (l.w === l.h && l.color !== "#7fd8ff") ctx.arc(l.x, l.y, l.w / 2, 0, Math.PI * 2);
        else ctx.roundRect(l.x - l.w / 2, l.y - l.h / 2, l.w, l.h, 4);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
        ctx.strokeStyle = "rgba(255,255,255,0.7)";
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      for (const d of drops) {
        ctx.fillStyle = "#14082a";
        ctx.fillRect(d.x - d.w / 2 - 2, d.y - d.h / 2 - 2, d.w + 4, d.h + 4);
        if (d.down) continue;
        const dg = ctx.createLinearGradient(0, d.y - d.h / 2, 0, d.y + d.h / 2);
        dg.addColorStop(0, "#ffffff");
        dg.addColorStop(0.3, d.color);
        dg.addColorStop(1, "#3a0a20");
        ctx.fillStyle = dg;
        ctx.shadowColor = d.color;
        ctx.shadowBlur = 10;
        ctx.fillRect(d.x - d.w / 2, d.y - d.h / 2, d.w, d.h);
        ctx.shadowBlur = 0;
      }
      flippers.forEach((f) => {
        const t0 = tip(f);
        drawFlipper(ctx, f.p.x, f.p.y, t0.x, t0.y);
      });
      // Plunger.
      const pg = ctx.createLinearGradient(816, 0, 836, 0);
      pg.addColorStop(0, "#8a8fa8");
      pg.addColorStop(0.5, "#ffffff");
      pg.addColorStop(1, "#6a6f88");
      ctx.fillStyle = pg;
      ctx.fillRect(816, 704 + charge * 14, 20, 12);
      ctx.fillStyle = "#ff3b4a";
      ctx.fillRect(822, 716 + charge * 14, 8, 30);
      // Ball.
      if (drainT <= 0 && phase !== "controls") {
        drawBall(ctx, b.x, b.y, R);
      }
      for (const p of pops) {
        ctx.globalAlpha = Math.min(1, p.t * 2);
        text(p.text, p.x, p.y - (0.8 - p.t) * 40, 18, "#fff");
      }
      ctx.globalAlpha = 1;
      ctx.restore();

      const cx = ox + (FW * scale) / 2;
      const cy = oy + (FH * scale) / 2;
      const big = Math.max(11, Math.round(26 * scale));
      const small = Math.max(7, Math.round(14 * scale));
      const gap = small * 2;
      if (phase === "controls" || phase === "over") {
        ctx.fillStyle = "rgba(7,0,20,0.72)";
        ctx.fillRect(ox, oy, FW * scale, FH * scale);
        if (logo && phase === "controls") {
          const lw = FW * scale * 0.6;
          const lh = (logo.height / logo.width) * lw;
          ctx.drawImage(logo, cx - lw / 2, cy - lh - big * 2.2, lw, lh);
        }
        if (phase === "over") {
          text("GAME OVER", cx, cy - big * 2.4, big, "#ff3b4a");
          text(`SCORE ${pad(score)}`, cx, cy - big * 0.8, small, "#ffe14a");
          text(score >= high && score > 0 ? "NEW HIGH SCORE!" : `HI ${pad(high)}`, cx, cy + big * 0.2, small, "#7fd8ff");
        }
        const touch = window.matchMedia("(pointer: coarse)").matches;
        text(touch ? "TAP LEFT / RIGHT = FLIPPERS" : "Z / LEFT ARROW = LEFT   M / RIGHT ARROW = RIGHT", cx, cy + big * 1.2, small, "#fff");
        text(touch ? "HOLD + RELEASE = LAUNCH" : "HOLD SPACE + RELEASE = LAUNCH", cx, cy + big * 1.2 + gap, small, "#fff");
        text(phase === "over" ? "PRESS START TO PLAY AGAIN" : "PRESS START", cx, cy + big * 1.2 + gap * 2.4, small, "#ffe14a");
      } else if (inLane && drainT <= 0 && b.y > 650) {
        text("HOLD + RELEASE TO LAUNCH", cx, oy + FH * scale - small * 1.6, small, "#ffe14a");
      }
      if (drainT > 0 && phase === "play") text(ball >= BALLS ? "LAST BALL LOST" : "BALL LOST", cx, cy, big, "#ff3b4a");
    };

    let last = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (phase === "play") {
        if (charging) charge = Math.min(1, charge + dt);
        const n = 10;
        for (let i = 0; i < n; i++) step(dt / n);
        if (drainT > 0) {
          drainT -= dt;
          if (drainT <= 0) {
            if (ball >= BALLS) {
              phase = "over";
              saveHigh();
              if (!saved) {
                saved = true;
                onGameOverRef.current?.(score);
              }
            } else {
              ball += 1;
              serve();
            }
          }
        }
      } else {
        for (const f of flippers) {
          f.ang = f.held ? f.up : f.rest;
        }
      }
      shake = Math.max(0, shake - dt);
      for (const k of bumpers) k.flash = Math.max(0, k.flash - dt);
      for (const s of slings) if (s.flash) s.flash = Math.max(0, s.flash - dt);
      pops = pops.filter((p) => (p.t -= dt) > 0);
      draw();
      raf = requestAnimationFrame(tick);
    };

    /* ---- input ---- */
    const LEFT = new Set(["KeyZ", "ShiftLeft", "ArrowLeft", "KeyA"]);
    const RIGHT = new Set(["KeyM", "Slash", "ShiftRight", "ArrowRight", "KeyL"]);
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Escape") {
        onExitRef.current();
        return;
      }
      if (phase !== "play") {
        if (e.code === "Enter" || e.code === "Space") {
          e.preventDefault();
          begin();
        }
        return;
      }
      if (LEFT.has(e.code)) flippers[0].held = true;
      if (RIGHT.has(e.code)) flippers[1].held = true;
      if (e.code === "Space" || e.code === "ArrowDown") {
        e.preventDefault();
        if (inLane && !e.repeat) charging = true;
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (LEFT.has(e.code)) flippers[0].held = false;
      if (RIGHT.has(e.code)) flippers[1].held = false;
      if ((e.code === "Space" || e.code === "ArrowDown") && charging) launch();
    };
    const touches = new Map<number, 0 | 1 | 2>();
    const syncTouch = () => {
      const vals = [...touches.values()];
      flippers[0].held = vals.includes(0);
      flippers[1].held = vals.includes(1);
    };
    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      e.preventDefault();
      if (phase !== "play") {
        begin();
        return;
      }
      try {
        canvas.setPointerCapture(e.pointerId);
      } catch {
        /* gone */
      }
      if (inLane && drainT <= 0 && b.y > 650) {
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

    resize();
    raf = requestAnimationFrame(tick);
    window.addEventListener("resize", resize);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointercancel", onPointerUp);
    return () => {
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
