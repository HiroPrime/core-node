"use client";

import { useEffect, useRef, useState } from "react";

/**
 * AQUATIC RUSH — climb the ocean on one button.
 *
 * The sub starts on the floor. Hold the button and it rises. Let go and it
 * sinks. Left and right steer. Fish patrol sideways. Treasure is the score.
 * Five hits and the sub blows up. The surface is the win.
 * The clock eats points, and it eats faster the longer the dive runs.
 * Fish travel in pairs on the same line.
 */

const ROOT = "/arcade/aquatic-rush/";
const BG = "/arcade/aquatic-rush/background.jpg";
const LIVES = 5;
const CLIMB = 9;

type Phase = "controls" | "count" | "play" | "boom" | "over" | "win";
type Fish =
  | "jelly" | "lion" | "urchin" | "eel" | "ray"
  | "star" | "stone" | "octo" | "box" | "cone"
  | "white" | "hammer" | "moray" | "cuda" | "tiger";

type Foe = { kind: Fish; x: number; y: number; dir: number; speed: number; frame: number };
type Gem = { id: string; value: number; x: number; y: number; bob: number };
type Pop = { text: string; x: number; y: number; t: number };

const FISH_N: Record<Fish, number> = {
  jelly: 4, lion: 8, urchin: 10, eel: 8, ray: 7,
  star: 8, stone: 8, octo: 10, box: 5, cone: 7,
  white: 6, hammer: 6, moray: 10, cuda: 8, tiger: 7,
};

const FISH_H: Record<Fish, number> = {
  jelly: 78, lion: 62, urchin: 58, eel: 52, ray: 56,
  star: 64, stone: 58, octo: 68, box: 76, cone: 50,
  white: 72, hammer: 68, moray: 58, cuda: 44, tiger: 74,
};

const LOOT: { id: string; value: number }[] = [
  { id: "coin", value: 100 },
  { id: "pile", value: 300 },
  { id: "heap", value: 500 },
  { id: "stack", value: 800 },
  { id: "chest", value: 1000 },
  { id: "chest-open", value: 1500 },
  { id: "chest-royal", value: 2000 },
  { id: "chest-gem", value: 2500 },
  { id: "ruby", value: 400 },
  { id: "diamond", value: 900 },
  { id: "goblet", value: 700 },
  { id: "pearls", value: 600 },
  { id: "necklace", value: 1200 },
  { id: "watch", value: 1800 },
  { id: "crown", value: 3000 },
];

const PACK: [string, number][] = [
  ["idle", 6], ["fwd", 4], ["back", 4], ["turn", 8], ["sink", 4], ["rise", 4], ["boom", 8],
  ...(Object.entries(FISH_N) as [Fish, number][]),
  ...LOOT.map((item) => [item.id, 1] as [string, number]),
];

function load(src: string, into: (img: HTMLImageElement) => void) {
  const img = new Image();
  img.onload = () => into(img);
  img.src = src;
}

function rand(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function AquaticRush({ onExit }: { onExit: () => void }) {
  const shellRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const onExitRef = useRef(onExit);
  const steerRef = useRef(0);
  const riseRef = useRef(false);
  const knobRef = useRef<HTMLDivElement | null>(null);
  const [hands, setHands] = useState(false);
  onExitRef.current = onExit;

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

    const frames: Record<string, HTMLImageElement> = {};
    PACK.forEach(([name, n]) => {
      for (let i = 0; i < n; i += 1) {
        const key = `${name}-${i}`;
        load(`${ROOT}${key}.png`, (img) => { frames[key] = img; });
      }
    });
    let bg: HTMLImageElement | null = null;
    load(BG, (img) => { bg = img; });

    let w = 0;
    let h = 0;
    let worldH = 0;
    let phase: Phase = "controls";
    let booted = false;
    let clock = 0;
    let playTime = 0;
    let drainBank = 0;
    let countT = 0;
    let boomT = 0;
    let score = 0;
    let lives = LIVES;
    let hurt = 0;
    let shake = 0;
    let face = 1;
    let turnT = 0;
    let high = 0;
    let handsOn = false;
    try {
      high = Number(localStorage.getItem("aquatic-rush-high")) || 0;
    } catch {
      high = 0;
    }

    const sub = { x: 0, y: 0, vx: 0, vy: 0 };
    let foes: Foe[] = [];
    let gems: Gem[] = [];
    const pops: Pop[] = [];
    const keys = new Set<string>();

    const saveHigh = () => {
      if (score <= high) return;
      high = score;
      try {
        localStorage.setItem("aquatic-rush-high", String(high));
      } catch {
        /* private mode */
      }
    };

    const mobile = () => w < 900 || h < 560;
    const u = () => Math.max(0.72, Math.min(1.7, Math.min(w, h) / 820));
    const gutter = () => w * (mobile() ? 0.1 : 0.16);
    const showHands = () => mobile() || window.matchMedia("(pointer: coarse)").matches;

    const drainRate = () => 20 + Math.floor(playTime / 4) * 20;

    const layout = () => {
      const rng = rand(18);
      const left = gutter();
      const right = w - gutter();
      const span = Math.max(80, right - left);
      const bands: Fish[][] = [
        ["jelly", "lion", "urchin", "eel", "ray"],
        ["star", "stone", "octo", "box", "cone"],
        ["white", "hammer", "moray", "cuda", "tiger"],
      ];
      const pick = (band: number) => bands[band][Math.floor(rng() * bands[band].length)];
      const rows = 26;
      foes = [];
      for (let i = 0; i < rows; i += 1) {
        const depth = 0.93 - (i / (rows - 1)) * 0.84;
        const band = depth > 0.64 ? 0 : depth > 0.36 ? 1 : 2;
        const hotter = Math.min(2, band + 1);
        const kindA = pick(rng() < 0.28 ? hotter : band);
        let kindB = pick(rng() < 0.28 ? hotter : band);
        if (kindB === kindA) kindB = pick(band === 2 ? 2 : band);
        const y = worldH * depth;
        const pace = (band === 2 ? 290 : band === 1 ? 220 : 165) * u();
        const dir = rng() < 0.5 ? -1 : 1;
        foes.push({
          kind: kindA,
          x: left + span * (0.06 + rng() * 0.3),
          y,
          dir,
          speed: pace * (0.82 + rng() * 0.36),
          frame: rng() * 8,
        });
        foes.push({
          kind: kindB,
          x: left + span * (0.58 + rng() * 0.32),
          y,
          dir: -dir,
          speed: pace * (0.9 + rng() * 0.4),
          frame: rng() * 8,
        });
      }
      const bag = [
        "coin", "coin", "coin", "coin", "pile", "pile", "heap", "stack",
        "ruby", "ruby", "pearls", "goblet", "chest", "diamond",
        "necklace", "chest-open", "watch", "chest-royal", "chest-gem", "crown",
      ];
      gems = bag.map((id, i) => {
        const spec = LOOT.find((item) => item.id === id)!;
        const depth = 0.94 - ((i + 0.5) / bag.length) * 0.86;
        return {
          id,
          value: spec.value,
          x: left + 24 + rng() * (span - 48),
          y: worldH * depth,
          bob: rng() * Math.PI * 2,
        };
      });
    };

    const fresh = () => {
      score = 0;
      playTime = 0;
      drainBank = 0;
      lives = LIVES;
      hurt = 0;
      shake = 0;
      face = 1;
      turnT = 0;
      boomT = 0;
      pops.length = 0;
      sub.x = w / 2;
      sub.y = worldH - h * 0.34;
      sub.vx = 0;
      sub.vy = 0;
      layout();
    };

    const boot = () => {
      if (booted || w < 2) return;
      booted = true;
      fresh();
      phase = "controls";
    };

    const begin = () => {
      phase = "count";
      countT = 0;
      keys.clear();
      riseRef.current = false;
      steerRef.current = 0;
    };

    const again = () => {
      fresh();
      begin();
    };

    const syncHands = (on: boolean) => {
      if (on === handsOn) return;
      handsOn = on;
      setHands(on);
    };

    const resize = () => {
      w = shell.clientWidth;
      h = shell.clientHeight;
      if (w < 2 || h < 2) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = false;
      const next = h * CLIMB;
      if (worldH > 0 && Math.abs(next - worldH) > 8) {
        const scale = next / worldH;
        sub.y *= scale;
        foes.forEach((f) => { f.y *= scale; });
        gems.forEach((g) => { g.y *= scale; });
      }
      worldH = next;
      if (!booted) boot();
      else if (foes.length === 0) layout();
    };

    const pad = (n: number) => String(Math.max(0, Math.floor(n))).padStart(6, "0");

    const hitSub = () => {
      if (hurt > 0 || phase !== "play") return;
      lives -= 1;
      hurt = 1.35;
      shake = 0.22;
      if (lives <= 0) {
        phase = "boom";
        boomT = 0;
        saveHigh();
      }
    };

    const readPad = () => {
      let steer = steerRef.current;
      let rise = riseRef.current;
      if (keys.has("ArrowLeft") || keys.has("KeyA")) steer -= 1;
      if (keys.has("ArrowRight") || keys.has("KeyD")) steer += 1;
      if (keys.has("Space") || keys.has("ArrowUp") || keys.has("KeyW")) rise = true;
      const pads = navigator.getGamepads?.() ?? [];
      const padBtn = Array.from(pads).find((p) => p && p.connected);
      if (padBtn) {
        const ax = padBtn.axes[0] ?? 0;
        if (Math.abs(ax) > 0.22) steer += ax;
        if (padBtn.buttons[14]?.pressed) steer -= 1;
        if (padBtn.buttons[15]?.pressed) steer += 1;
        if ([0, 2, 5, 6, 7].some((i) => padBtn.buttons[i]?.pressed)) rise = true;
      }
      return { steer: Math.max(-1, Math.min(1, steer)), rise };
    };

    const blit = (
      key: string,
      x: number,
      y: number,
      height: number,
      flip = false,
    ) => {
      const img = frames[key];
      if (!img || !img.complete || !img.naturalWidth) return false;
      const scale = height / img.height;
      const dw = img.width * scale;
      ctx.save();
      ctx.translate(x, y);
      if (flip) ctx.scale(-1, 1);
      ctx.drawImage(img, -dw / 2, -height / 2, dw, height);
      ctx.restore();
      return true;
    };

    const subPose = (steer: number, rise: boolean) => {
      if (phase === "boom" || phase === "over") {
        const i = Math.min(7, Math.floor(boomT * 8));
        return `boom-${i}`;
      }
      if (phase === "count" || phase === "controls") {
        return `idle-${Math.floor(clock * 14) % 6}`;
      }
      if (turnT > 0) {
        const p = 1 - turnT / 0.28;
        const i = Math.min(7, Math.floor(p * 8));
        return `turn-${face > 0 ? 7 - i : i}`;
      }
      const driving = Math.abs(steer) > 0.55;
      const onFloor = sub.y > worldH - h * 0.36 && Math.abs(sub.vy) < 20;
      if (onFloor && Math.abs(steer) < 0.2 && !rise) return `idle-${Math.floor(clock * 14) % 6}`;
      if (driving && rise) {
        const set = face > 0 ? "fwd" : "back";
        return `${set}-${Math.floor(clock * 18) % 4}`;
      }
      if (rise) return `rise-${Math.floor(clock * 18) % 4}`;
      return `sink-${Math.floor(clock * 18) % 4}`;
    };

    const drawHud = (cam: number) => {
      const s = u();
      ctx.save();
      ctx.textAlign = "left";
      ctx.fillStyle = "#7ef6ff";
      ctx.font = `${Math.round(12 * s)}px ${pixelFont}`;
      ctx.fillText("LIFE", 16, 22 * s);
      for (let i = 0; i < LIVES; i += 1) {
        ctx.fillStyle = i < lives ? "#7ef6ff" : "rgba(126,246,255,0.18)";
        ctx.fillRect(16 + i * 20 * s, 30 * s, 14 * s, 8 * s);
      }

      ctx.textAlign = "center";
      ctx.fillStyle = "#ffe14a";
      ctx.font = `${Math.round(12 * s)}px ${pixelFont}`;
      ctx.fillText("TREASURE", w / 2, 22 * s);
      ctx.fillStyle = "#fff6c2";
      ctx.font = `${Math.round(22 * s)}px ${pixelFont}`;
      ctx.fillText(pad(score), w / 2, 48 * s);
      ctx.fillStyle = "#9ad7ff";
      ctx.font = `${Math.round(11 * s)}px ${pixelFont}`;
      ctx.fillText(`HI ${pad(high)}`, w / 2, 68 * s);
      if (phase === "play" || phase === "boom") {
        ctx.fillStyle = "#ff4d6a";
        ctx.font = `${Math.round(11 * s)}px ${pixelFont}`;
        ctx.fillText(`-${drainRate()}/S`, w / 2, 86 * s);
      }

      const meterX = w - 28 * s;
      const meterTop = 24 * s;
      const meterH = Math.min(h * 0.42, 220 * s);
      ctx.fillStyle = "rgba(4,16,32,0.55)";
      ctx.fillRect(meterX, meterTop, 10 * s, meterH);
      const ascent = 1 - sub.y / worldH;
      ctx.fillStyle = "#3df0ff";
      const fill = meterH * Math.max(0, Math.min(1, ascent));
      ctx.fillRect(meterX, meterTop + meterH - fill, 10 * s, fill);
      ctx.fillStyle = "#ffe14a";
      ctx.fillRect(meterX - 3 * s, meterTop + meterH - fill - 2, 16 * s, 4);
      ctx.textAlign = "right";
      ctx.font = `${Math.round(10 * s)}px ${pixelFont}`;
      ctx.fillStyle = "#fff6c2";
      ctx.fillText("TOP", meterX - 8, meterTop + 10);
      ctx.fillText("FLOOR", meterX - 8, meterTop + meterH);

      pops.forEach((p) => {
        const life = 1.15;
        ctx.globalAlpha = Math.max(0, 1 - p.t / life);
        ctx.textAlign = "center";
        ctx.font = `${Math.round(18 * s)}px ${pixelFont}`;
        const px = p.x;
        const py = p.y - cam - p.t * 42;
        const tw = ctx.measureText(p.text).width;
        ctx.fillStyle = "rgba(4,16,32,0.72)";
        ctx.fillRect(px - tw / 2 - 8, py - 16 * s, tw + 16, 22 * s);
        ctx.fillStyle = "#ffe14a";
        ctx.fillText(p.text, px, py);
      });
      ctx.restore();
    };

    const drawControls = () => {
      ctx.fillStyle = "#041018";
      ctx.fillRect(0, 0, w, h);
      const rows: [string, string][] = [
        ["ARROWS OR STICK", "STEER"],
        ["HOLD THE BUTTON", "RISE"],
        ["LET GO", "SINK"],
        ["TREASURE", "POINTS"],
        ["THE CLOCK", "EATS THEM"],
        ["SLOWER DIVE", "BIGGER BITE"],
        ["FIVE HITS", "YOU BLOW UP"],
        ["THE SURFACE", "YOU WIN"],
      ];
      const s = Math.min(u(), h / 640);
      let y = h / 2 - (rows.length * 40 + 90) * s / 2;
      ctx.textAlign = "center";
      ctx.fillStyle = "#3df0ff";
      ctx.font = `${Math.round(26 * s)}px ${pixelFont}`;
      ctx.fillText("CONTROLS", w / 2, y);
      y += 48 * s;
      rows.forEach(([key, what]) => {
        ctx.fillStyle = "#ffe14a";
        ctx.font = `${Math.round(13 * s)}px ${pixelFont}`;
        ctx.fillText(key, w / 2, y);
        ctx.fillStyle = "#7ef6ff";
        ctx.font = `${Math.round(12 * s)}px ${pixelFont}`;
        ctx.fillText(what, w / 2, y + 16 * s);
        y += 40 * s;
      });
      ctx.fillStyle = "#fff6c2";
      ctx.font = `${Math.round(13 * s)}px ${pixelFont}`;
      ctx.fillText("ENTER OR CLICK TO DIVE", w / 2, y + 8 * s);
    };

    const tick = (now: number) => {
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      if (w < 2) resize();
      clock += dt;
      const input = phase === "play" ? readPad() : { steer: 0, rise: false };
      syncHands(phase === "play" && showHands());

      if (phase === "play") {
        const prevFace = face;
        if (input.steer > 0.2) face = 1;
        else if (input.steer < -0.2) face = -1;
        if (face !== prevFace) turnT = 0.28;
        if (turnT > 0) turnT = Math.max(0, turnT - dt);

        playTime += dt;
        drainBank += dt;
        if (drainBank >= 1) {
          const ticks = Math.floor(drainBank);
          drainBank -= ticks;
          score = Math.max(0, score - ticks * drainRate());
        }

        const riseV = -h * 0.22;
        const sinkV = h * 0.16;
        const targetVy = input.rise ? riseV : sinkV;
        sub.vy += (targetVy - sub.vy) * Math.min(1, dt * 3.4);
        const targetVx = input.steer * w * 0.26;
        sub.vx += (targetVx - sub.vx) * Math.min(1, dt * 3.2);
        const left = gutter() + 20;
        const right = w - gutter() - 20;
        sub.x = Math.max(left, Math.min(right, sub.x + sub.vx * dt));
        sub.y = Math.max(h * 0.12, Math.min(worldH - h * 0.22, sub.y + sub.vy * dt));

        const subH = 64 * u();
        foes.forEach((f) => {
          f.frame += dt;
          f.x += f.dir * f.speed * dt;
          const edge = gutter() + FISH_H[f.kind] * 0.2;
          if (f.x < edge || f.x > w - edge) f.dir *= -1;
          const hh = FISH_H[f.kind] * u();
          const dx = Math.abs(f.x - sub.x);
          const dy = Math.abs(f.y - sub.y);
          if (dx < hh * 0.34 + subH * 0.28 && dy < hh * 0.28 + subH * 0.22) hitSub();
        });

        for (let i = gems.length - 1; i >= 0; i -= 1) {
          const g = gems[i];
          const gy = g.y + Math.sin(clock * 2.2 + g.bob) * 8;
          if (Math.hypot(g.x - sub.x, gy - sub.y) < 36 * u() + 18) {
            score += g.value;
            pops.push({ text: `+${g.value}`, x: g.x, y: gy, t: 0 });
            gems.splice(i, 1);
          }
        }

        if (sub.y <= h * 0.16) {
          phase = "win";
          saveHigh();
        }
      } else if (phase === "count") {
        countT += dt;
        if (countT >= 3.4) phase = "play";
      } else if (phase === "boom") {
        boomT += dt;
        if (boomT >= 1.15) phase = "over";
      }

      if (hurt > 0) hurt = Math.max(0, hurt - dt);
      if (shake > 0) shake = Math.max(0, shake - dt);
      for (let i = pops.length - 1; i >= 0; i -= 1) {
        pops[i].t += dt;
        if (pops[i].t > 1.15) pops.splice(i, 1);
      }

      const cam = Math.max(0, Math.min(worldH - h, sub.y - h * 0.62));
      const jx = shake > 0 ? Math.sin(clock * 60) * 5 : 0;
      ctx.save();
      ctx.translate(jx, 0);
      ctx.fillStyle = "#031018";
      ctx.fillRect(-8, -8, w + 16, h + 16);

      if (phase !== "controls") {
        ctx.save();
        ctx.translate(0, -cam);
        if (bg && bg.complete && bg.naturalWidth) {
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(bg, 0, 0, w, worldH);
        }
        gems.forEach((g) => {
          const gy = g.y + Math.sin(clock * 2.2 + g.bob) * 8;
          blit(`${g.id}-0`, g.x, gy, 40 * u());
        });
        foes.forEach((f) => {
          const n = FISH_N[f.kind];
          const i = Math.floor(f.frame * 8) % n;
          blit(`${f.kind}-${i}`, f.x, f.y, FISH_H[f.kind] * u(), f.dir < 0);
        });
        if (phase !== "over" && phase !== "win") {
          ctx.save();
          if (hurt > 0 && Math.floor(hurt * 16) % 2 === 0) ctx.globalAlpha = 0.35;
          const pose = subPose(input.steer, input.rise);
          const aimed = input.steer < -0.15 ? -1 : input.steer > 0.15 ? 1 : face;
          const flipNose = aimed < 0 && /^(rise|sink|idle)-/.test(pose);
          blit(pose, sub.x, sub.y, 68 * u(), flipNose);
          ctx.restore();
        }
        ctx.restore();

        drawHud(cam);

        if (phase === "count") {
          const label = countT < 3 ? String(3 - Math.floor(countT)) : "GO!!!";
          ctx.textAlign = "center";
          ctx.fillStyle = "#ffe14a";
          ctx.font = `${Math.round(54 * u())}px ${pixelFont}`;
          ctx.fillText(label, w / 2, h / 2);
        }
        if (phase === "play" && clock < 4.2) {
          ctx.textAlign = "center";
          ctx.fillStyle = "rgba(255,246,194,0.8)";
          ctx.font = `${Math.round(12 * u())}px ${pixelFont}`;
          ctx.fillText("HOLD TO RISE  ·  CLOCK EATS POINTS", w / 2, h - (showHands() ? 132 : 28));
        }
        if (phase === "over" || phase === "win") {
          ctx.fillStyle = "rgba(3,10,20,0.62)";
          ctx.fillRect(0, 0, w, h);
          ctx.textAlign = "center";
          ctx.fillStyle = phase === "win" ? "#ffe14a" : "#ff4ad2";
          ctx.font = `${Math.round(28 * u())}px ${pixelFont}`;
          ctx.fillText(phase === "win" ? "SURFACED" : "BLOWN UP", w / 2, h / 2 - 28 * u());
          ctx.fillStyle = "#fff6c2";
          ctx.font = `${Math.round(16 * u())}px ${pixelFont}`;
          ctx.fillText(`TREASURE ${pad(score)}`, w / 2, h / 2 + 12 * u());
          ctx.fillStyle = "#7ef6ff";
          ctx.font = `${Math.round(13 * u())}px ${pixelFont}`;
          ctx.fillText(`HI ${pad(high)}`, w / 2, h / 2 + 40 * u());
          ctx.fillText("ENTER OR CLICK", w / 2, h / 2 + 72 * u());
        }
      } else {
        drawControls();
      }
      ctx.restore();
      raf = requestAnimationFrame(tick);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) e.preventDefault();
      if (e.code === "Escape") {
        onExitRef.current();
        return;
      }
      if ((phase === "controls" || phase === "over" || phase === "win") && (e.code === "Enter" || e.code === "Space")) {
        if (phase === "controls") begin();
        else again();
        return;
      }
      keys.add(e.code);
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keys.delete(e.code);
    };
    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      if (phase === "controls") begin();
      else if (phase === "over" || phase === "win") again();
    };

    let last = performance.now();
    let raf = 0;
    resize();
    raf = requestAnimationFrame(tick);
    window.addEventListener("resize", resize);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    canvas.addEventListener("pointerdown", onPointerDown);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      canvas.removeEventListener("pointerdown", onPointerDown);
      setHands(false);
    };
  }, []);

  const stickOrigin = useRef<{ x: number; y: number; id: number } | null>(null);

  return (
    <div ref={shellRef} className="game-overlay neon-ride" role="dialog" aria-label="AQUATIC RUSH">
      <canvas ref={canvasRef} className="neon-ride-canvas" />
      {hands && (
        <div className="aqua-hands">
          <div
            className="aqua-stick"
            onPointerDown={(e) => {
              e.preventDefault();
              e.currentTarget.setPointerCapture(e.pointerId);
              stickOrigin.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
            }}
            onPointerMove={(e) => {
              const origin = stickOrigin.current;
              if (!origin || origin.id !== e.pointerId) return;
              const dx = Math.max(-42, Math.min(42, e.clientX - origin.x));
              const dy = Math.max(-42, Math.min(42, e.clientY - origin.y));
              steerRef.current = dx / 42;
              if (knobRef.current) knobRef.current.style.transform = `translate(${dx}px, ${dy}px)`;
            }}
            onPointerUp={(e) => {
              if (stickOrigin.current?.id !== e.pointerId) return;
              stickOrigin.current = null;
              steerRef.current = 0;
              if (knobRef.current) knobRef.current.style.transform = "translate(0px, 0px)";
            }}
            onPointerCancel={() => {
              stickOrigin.current = null;
              steerRef.current = 0;
              if (knobRef.current) knobRef.current.style.transform = "translate(0px, 0px)";
            }}
          >
            <div ref={knobRef} className="aqua-knob" />
          </div>
          <button
            type="button"
            className="aqua-rise"
            onPointerDown={(e) => {
              e.preventDefault();
              riseRef.current = true;
              e.currentTarget.classList.add("is-down");
            }}
            onPointerUp={(e) => {
              riseRef.current = false;
              e.currentTarget.classList.remove("is-down");
            }}
            onPointerCancel={(e) => {
              riseRef.current = false;
              e.currentTarget.classList.remove("is-down");
            }}
            onPointerLeave={(e) => {
              if (!riseRef.current) return;
              riseRef.current = false;
              e.currentTarget.classList.remove("is-down");
            }}
          >
            RISE
          </button>
        </div>
      )}
    </div>
  );
}
