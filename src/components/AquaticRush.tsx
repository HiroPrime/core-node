"use client";

import { useEffect, useRef, useState } from "react";

/**
 * AQUATIC RUSH — climb the ocean on one button.
 *
 * The sub starts on the floor. Push the stick up to rise, down to dive, and
 * sideways to steer. Sideways is a little faster than the climb. Let go and
 * it sinks. There is no surface. The middle of the trench repeats, and the
 * fish get thicker the higher you go. Five hits and the haul is gone.
 * The high score is the treasure you were holding when you died.
 */

const ROOT = "/arcade/aquatic-rush/";
const BG = "/arcade/aquatic-rush/background.jpg";
const LIVES = 5;
const ART_W = 1184;
const ART_H = 3584;
const VIEW_W = 1280;
const VIEW_H = 800;

type Phase = "controls" | "count" | "play" | "boom" | "over";
type Fish =
  | "jelly" | "lion" | "urchin" | "eel" | "ray"
  | "star" | "stone" | "octo" | "box" | "cone"
  | "white" | "hammer" | "moray" | "cuda" | "tiger";

type Foe = {
  kind: Fish; x: number; y: number; dir: number;
  vx: number; vy: number; speed: number; frame: number;
  yLo: number; yHi: number;
};
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

const LOOT: { id: string; name: string; value: number }[] = [
  { id: "coin", name: "COIN", value: 100 },
  { id: "pile", name: "PILE", value: 300 },
  { id: "ruby", name: "RUBY", value: 400 },
  { id: "heap", name: "HEAP", value: 500 },
  { id: "pearls", name: "PEARLS", value: 600 },
  { id: "goblet", name: "GOBLET", value: 700 },
  { id: "stack", name: "STACK", value: 800 },
  { id: "diamond", name: "DIAMOND", value: 900 },
  { id: "chest", name: "CHEST", value: 1000 },
  { id: "necklace", name: "NECKLACE", value: 1200 },
  { id: "chest-open", name: "OPEN CHEST", value: 1500 },
  { id: "watch", name: "WATCH", value: 1800 },
  { id: "chest-royal", name: "ROYAL CHEST", value: 2000 },
  { id: "chest-gem", name: "GEM CHEST", value: 2500 },
  { id: "crown", name: "CROWN", value: 3000 },
];

const TILE_SRC_H = 800;
const FLOOR_SRC_Y = 2920;

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
  const diveRef = useRef(false);
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
    let water: HTMLCanvasElement | null = null;
    let floor: HTMLCanvasElement | null = null;
    load(BG, (img) => {
      const sw = img.naturalWidth;
      const sh = img.naturalHeight;
      const cut = (sy: number, sheight: number) => {
        const board = document.createElement("canvas");
        board.width = sw;
        board.height = sheight;
        const g = board.getContext("2d");
        if (!g) return board;
        g.drawImage(img, 0, sy, sw, sheight, 0, 0, sw, sheight);
        return board;
      };
      const tile = document.createElement("canvas");
      tile.width = sw;
      tile.height = TILE_SRC_H;
      const g = tile.getContext("2d");
      if (g) {
        g.imageSmoothingEnabled = true;
        const sx = Math.round(sw * 0.44);
        const srcW = Math.round(sw * 0.12);
        g.drawImage(img, sx, 2360, srcW, 480, 0, 0, sw, TILE_SRC_H);
        const shade = g.createLinearGradient(0, 0, sw, 0);
        shade.addColorStop(0, "rgba(2,10,24,0.62)");
        shade.addColorStop(0.2, "rgba(2,10,24,0)");
        shade.addColorStop(0.8, "rgba(2,10,24,0)");
        shade.addColorStop(1, "rgba(2,10,24,0.62)");
        g.fillStyle = shade;
        g.fillRect(0, 0, sw, TILE_SRC_H);
      }
      water = tile;
      const floorBoard = cut(FLOOR_SRC_Y, sh - FLOOR_SRC_Y);
      const fg = floorBoard.getContext("2d");
      if (fg) {
        const fadeH = Math.round(floorBoard.height * 0.34);
        fg.globalCompositeOperation = "destination-out";
        const fade = fg.createLinearGradient(0, 0, 0, fadeH);
        fade.addColorStop(0, "rgba(0,0,0,1)");
        fade.addColorStop(0.55, "rgba(0,0,0,0.35)");
        fade.addColorStop(1, "rgba(0,0,0,0)");
        fg.fillStyle = fade;
        fg.fillRect(0, 0, floorBoard.width, fadeH);
      }
      floor = floorBoard;
    });

    let w = 0;
    let h = 0;
    const worldW = VIEW_W;
    const tileH = VIEW_W * TILE_SRC_H / ART_W;
    const floorH = VIEW_W * (ART_H - FLOOR_SRC_Y) / ART_W;
    const bedBottom = 0;
    const bedTop = -floorH;
    let phase: Phase = "controls";
    let booted = false;
    let clock = 0;
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
    let found: string[] = [];
    let nextY = 0;
    let startY = 0;
    let laneN = 0;
    let rng = rand(1);
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
    // Phones crop the desktop ocean. Pull the camera back so a small screen
    // shows more world. Desktop stays 1 CSS pixel = 1 world pixel.
    const pull = () => {
      const phone = w < 700 || (w < 900 && h > w);
      if (!phone) return 1;
      return Math.max(1.7, Math.min(2, 760 / Math.max(w, 1)));
    };
    const u = () => Math.max(0.72, Math.min(1.7, Math.min(VIEW_W, VIEW_H) / 820));
    const gutter = () => VIEW_W * 0.12;
    const showHands = () => mobile() || window.matchMedia("(pointer: coarse)").matches;

    const bands: Fish[][] = [
      ["jelly", "lion", "urchin", "eel", "ray"],
      ["star", "stone", "octo", "box", "cone"],
      ["white", "hammer", "moray", "cuda", "tiger"],
    ];

    const climbAt = (y: number) => Math.max(0, startY - y);

    const spawnLane = (y: number) => {
      const left = gutter();
      const right = worldW - gutter();
      const climb = climbAt(y);
      const step = Math.floor(Math.max(0, climb - 1100) / 1500);
      const shape = step <= 0 ? "side1" : step === 1 ? "side2" : step === 2 ? "diag" : "mix";
      const count = step <= 0 ? 1 : step < 4 ? 2 : Math.min(4, 2 + Math.floor((step - 4) / 2));
      const band = Math.min(2, Math.floor(step / 2));
      const pace = (140 + Math.min(200, step * 22)) * u();
      const mid = (left + right) / 2 + (laneN % 2 === 0 ? -90 : 90);
      const side = (sign: number) => ({ vx: sign, vy: 0 });
      const vert = (sign: number) => ({ vx: 0, vy: sign });
      const diag = (sx: number, sy: number) => {
        const len = Math.hypot(sx, sy) || 1;
        return { vx: sx / len, vy: sy / len };
      };
      for (let k = 0; k < count; k += 1) {
        const kind = bands[rng() < 0.2 ? Math.min(2, band + 1) : band][Math.floor(rng() * 5)];
        let move = side(rng() < 0.5 ? -1 : 1);
        if (shape === "side2") move = side(k % 2 === 0 ? -1 : 1);
        else if (shape === "diag") move = diag(k % 2 === 0 ? -1 : 1, k % 2 === 0 ? -0.65 : 0.65);
        else if (shape === "mix") {
          move = k % 3 === 0
            ? vert(rng() < 0.5 ? -1 : 1)
            : k % 3 === 1
              ? diag(rng() < 0.5 ? -1 : 1, rng() < 0.5 ? -0.6 : 0.6)
              : side(rng() < 0.5 ? -1 : 1);
        }
        const spread = count === 1 ? 0 : (k - (count - 1) / 2) * 210;
        const x = Math.max(left + 36, Math.min(right - 36, mid + spread));
        foes.push({
          kind,
          x,
          y,
          dir: move.vx < 0 ? -1 : 1,
          vx: move.vx,
          vy: move.vy,
          speed: pace * (0.85 + rng() * 0.3),
          frame: rng() * 8,
          yLo: y - 80,
          yHi: y + 80,
        });
      }
      if (rng() < 0.72) {
        const tier = Math.min(LOOT.length, 2 + step);
        const pick = Math.floor(Math.pow(rng(), 1.35) * tier);
        const spec = LOOT[pick];
        gems.push({
          id: spec.id,
          value: spec.value,
          x: left + 48 + rng() * (right - left - 96),
          y: y + 130,
          bob: rng() * Math.PI * 2,
        });
      }
      laneN += 1;
    };

    const fillAhead = () => {
      const reach = sub.y - Math.max(h, VIEW_H) * 1.15;
      while (nextY > reach) {
        const gap = Math.max(250, 430 - Math.max(0, climbAt(nextY) - 1100) / 70);
        spawnLane(nextY);
        nextY -= gap;
      }
    };

    const fresh = () => {
      score = 0;
      lives = LIVES;
      hurt = 0;
      shake = 0;
      face = 1;
      turnT = 0;
      boomT = 0;
      pops.length = 0;
      foes = [];
      gems = [];
      found = [];
      laneN = 0;
      rng = rand((Date.now() ^ 0x9e3779b9) >>> 0);
      sub.x = worldW / 2;
      sub.y = -VIEW_H * 0.34;
      sub.vx = 0;
      sub.vy = 0;
      startY = sub.y;
      nextY = startY - 1100;
      fillAhead();
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
      diveRef.current = false;
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
      if (!booted) boot();
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
      let dive = diveRef.current;
      if (keys.has("ArrowLeft") || keys.has("KeyA")) steer -= 1;
      if (keys.has("ArrowRight") || keys.has("KeyD")) steer += 1;
      if (keys.has("Space") || keys.has("ArrowUp") || keys.has("KeyW")) rise = true;
      if (keys.has("ArrowDown") || keys.has("KeyS")) dive = true;
      const pads = navigator.getGamepads?.() ?? [];
      const padBtn = Array.from(pads).find((p) => p && p.connected);
      if (padBtn) {
        const ax = padBtn.axes[0] ?? 0;
        const ay = padBtn.axes[1] ?? 0;
        if (Math.abs(ax) > 0.22) steer += ax;
        if (ay < -0.35) rise = true;
        else if (ay > 0.45) dive = true;
        if (padBtn.buttons[14]?.pressed) steer -= 1;
        if (padBtn.buttons[15]?.pressed) steer += 1;
        if (padBtn.buttons[13]?.pressed) dive = true;
        if ([0, 2, 5, 6, 7].some((i) => padBtn.buttons[i]?.pressed)) rise = true;
      }
      if (rise) dive = false;
      return { steer: Math.max(-1, Math.min(1, steer)), rise, dive };
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
      const onFloor = sub.y > -VIEW_H * 0.4 && Math.abs(sub.vy) < 20;
      if (onFloor && Math.abs(steer) < 0.2 && !rise) return `idle-${Math.floor(clock * 14) % 6}`;
      if (driving && rise) {
        const set = face > 0 ? "fwd" : "back";
        return `${set}-${Math.floor(clock * 18) % 4}`;
      }
      if (rise) return `rise-${Math.floor(clock * 18) % 4}`;
      return `sink-${Math.floor(clock * 18) % 4}`;
    };

    const drawHud = (camX: number, camY: number, camPull: number) => {
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
        ctx.textAlign = "center";
        ctx.fillStyle = "#7ef6ff";
        ctx.font = `${Math.round(11 * s)}px ${pixelFont}`;
        const risen = Math.max(0, Math.floor(climbAt(sub.y) / 10));
        ctx.fillText(`UP ${String(risen).padStart(4, "0")}`, w / 2, 86 * s);
      }

      pops.forEach((p) => {
        const life = 1.15;
        ctx.globalAlpha = Math.max(0, 1 - p.t / life);
        ctx.textAlign = "center";
        ctx.font = `${Math.round(18 * s)}px ${pixelFont}`;
        const px = (p.x - camX) / camPull;
        const py = (p.y - camY) / camPull - p.t * 42;
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
        ["LEFT AND RIGHT", "FASTER"],
        ["STICK UP", "RISE"],
        ["STICK DOWN", "DIVE"],
        ["LET GO", "SINK"],
        ["TREASURE", "YOUR SCORE"],
        ["FIVE HITS", "YOU LOSE IT"],
        ["NO SURFACE", "KEEP CLIMBING"],
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
      const input = phase === "play" ? readPad() : { steer: 0, rise: false, dive: false };
      syncHands(phase === "play" && showHands());

      if (phase === "play") {
        const prevFace = face;
        if (input.steer > 0.2) face = 1;
        else if (input.steer < -0.2) face = -1;
        if (face !== prevFace) turnT = 0.28;
        if (turnT > 0) turnT = Math.max(0, turnT - dt);

        const riseSpeed = VIEW_H * 0.2;
        const riseV = -riseSpeed;
        const diveV = VIEW_H * 0.32;
        const sinkV = VIEW_H * 0.16;
        const targetVy = input.rise ? riseV : input.dive ? diveV : sinkV;
        sub.vy += (targetVy - sub.vy) * Math.min(1, dt * 3.4);
        const targetVx = input.steer * riseSpeed * 1.15;
        if (Math.abs(input.steer) < 0.04) sub.vx = 0;
        else sub.vx += (targetVx - sub.vx) * Math.min(1, dt * 3.4);
        const left = gutter() + 20;
        const right = worldW - gutter() - 20;
        sub.x = Math.max(left, Math.min(right, sub.x + sub.vx * dt));
        sub.y = Math.min(-VIEW_H * 0.2, sub.y + sub.vy * dt);
        fillAhead();
        const behind = sub.y + Math.max(1100, h * 1.4);
        foes = foes.filter((f) => f.y < behind);
        gems = gems.filter((g) => g.y < behind);

        const subH = 64 * u();
        foes.forEach((f) => {
          f.frame += dt;
          f.x += f.vx * f.speed * dt;
          f.y += f.vy * f.speed * dt;
          const edge = gutter() + FISH_H[f.kind] * 0.2;
          if (f.vx !== 0 && (f.x < edge || f.x > worldW - edge)) {
            f.vx *= -1;
            f.x = Math.max(edge, Math.min(worldW - edge, f.x));
            f.dir = f.vx < 0 ? -1 : 1;
          }
          if (f.vy !== 0 && (f.y < f.yLo || f.y > f.yHi)) {
            f.vy *= -1;
            f.y = Math.max(f.yLo, Math.min(f.yHi, f.y));
          }
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
            found.push(g.id);
            pops.push({ text: `+${g.value}`, x: g.x, y: gy, t: 0 });
            gems.splice(i, 1);
          }
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

      const camPull = pull();
      const viewW = w * camPull;
      const viewH = h * camPull;
      let camY = sub.y - viewH * 0.62;
      if (camY + viewH > bedBottom) camY = bedBottom - viewH;
      const camX = viewW >= worldW ? (worldW - viewW) / 2 : Math.max(0, Math.min(worldW - viewW, sub.x - viewW / 2));
      const jx = shake > 0 ? Math.sin(clock * 60) * 5 : 0;
      ctx.save();
      ctx.translate(jx, 0);
      ctx.fillStyle = "#031018";
      ctx.fillRect(-8, -8, w + 16, h + 16);

      if (phase !== "controls") {
        ctx.save();
        ctx.scale(1 / camPull, 1 / camPull);
        ctx.translate(-camX, -camY);
        ctx.fillStyle = "#042033";
        ctx.fillRect(camX - 40, camY - 40, viewW + 80, viewH + 80);
        if (water) {
          ctx.imageSmoothingEnabled = true;
          const first = Math.max(-1, Math.floor((bedTop - (camY + viewH)) / tileH) - 1);
          const last = Math.ceil((bedTop - camY) / tileH) + 1;
          for (let i = first; i <= last; i += 1) {
            ctx.drawImage(water, 0, bedTop - (i + 1) * tileH, worldW, tileH);
          }
          ctx.imageSmoothingEnabled = false;
        }
        if (floor) {
          ctx.imageSmoothingEnabled = true;
          ctx.drawImage(floor, 0, bedTop, worldW, floorH);
          ctx.imageSmoothingEnabled = false;
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
        if (phase !== "over") {
          ctx.save();
          if (hurt > 0 && Math.floor(hurt * 16) % 2 === 0) ctx.globalAlpha = 0.35;
          const pose = subPose(input.steer, input.rise);
          const aimed = input.steer < -0.15 ? -1 : input.steer > 0.15 ? 1 : face;
          const flipNose = aimed < 0 && /^(rise|sink|idle)-/.test(pose);
          blit(pose, sub.x, sub.y, 68 * u(), flipNose);
          ctx.restore();
        }
        ctx.restore();

        drawHud(camX, camY, camPull);

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
          ctx.fillText("STICK TO STEER  ·  LET GO SINKS", w / 2, h * 0.46);
        }
        if (phase === "over") {
          const order: string[] = [];
          const tally = new Map<string, number>();
          found.forEach((id) => {
            if (!tally.has(id)) order.push(id);
            tally.set(id, (tally.get(id) || 0) + 1);
          });
          const lines = order.map((id) => {
            const spec = LOOT.find((item) => item.id === id);
            const count = tally.get(id) || 0;
            const name = spec?.name ?? id.toUpperCase();
            return count > 1 ? `${name}  x${count}` : name;
          });
          const rows = Math.max(1, lines.length);
          const s = Math.min(u() * 0.9, h / (240 + rows * 26));
          ctx.fillStyle = "rgba(3,10,20,0.86)";
          ctx.fillRect(0, 0, w, h);
          ctx.textAlign = "center";
          let y = Math.max(36 * s, h / 2 - (rows * 22 + 130) * s / 2);
          ctx.fillStyle = "#ff4ad2";
          ctx.font = `${Math.round(20 * s)}px ${pixelFont}`;
          ctx.fillText("TREASURE'S LOST", w / 2, y);
          y += 34 * s;
          ctx.fillStyle = "#fff6c2";
          ctx.font = `${Math.round(13 * s)}px ${pixelFont}`;
          if (lines.length === 0) {
            ctx.fillText("NOTHING FOUND", w / 2, y);
            y += 26 * s;
          } else {
            lines.forEach((line) => {
              ctx.fillText(line, w / 2, y);
              y += 22 * s;
            });
          }
          y += 10 * s;
          ctx.fillStyle = "#ffe14a";
          ctx.font = `${Math.round(16 * s)}px ${pixelFont}`;
          ctx.fillText(pad(score), w / 2, y);
          y += 28 * s;
          ctx.fillStyle = "#7ef6ff";
          ctx.font = `${Math.round(12 * s)}px ${pixelFont}`;
          ctx.fillText(`HI ${pad(high)}`, w / 2, y);
          y += 26 * s;
          ctx.fillText("ENTER OR CLICK", w / 2, y);
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
      if ((phase === "controls" || phase === "over") && (e.code === "Enter" || e.code === "Space")) {
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
      else if (phase === "over") again();
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
  const stickRef = useRef<HTMLDivElement | null>(null);
  const glowRef = useRef<HTMLDivElement | null>(null);
  const knobRef = useRef<HTMLDivElement | null>(null);
  const THROW = 70;

  const placeTouch = (x: number, y: number, dx: number, dy: number, on: boolean) => {
    const shell = shellRef.current;
    if (!shell || !stickRef.current || !glowRef.current) return;
    const rect = shell.getBoundingClientRect();
    const lx = x - rect.left;
    const ly = y - rect.top;
    stickRef.current.style.opacity = on ? "1" : "0";
    stickRef.current.style.transform = `translate(${lx}px, ${ly}px) translate(-50%, -50%)`;
    glowRef.current.style.opacity = on ? "1" : "0";
    glowRef.current.style.transform = `translate(${lx + dx}px, ${ly + dy}px) translate(-50%, -50%)`;
    if (knobRef.current) knobRef.current.style.transform = `translate(${dx}px, ${dy}px)`;
  };

  const aimStick = (dx: number, dy: number) => {
    const dead = 18;
    steerRef.current = Math.abs(dx) < dead ? 0 : dx / THROW;
    riseRef.current = dy < -dead;
    diveRef.current = dy > dead;
  };

  const endTouch = (id?: number) => {
    if (id != null && stickOrigin.current && stickOrigin.current.id !== id) return;
    stickOrigin.current = null;
    riseRef.current = false;
    diveRef.current = false;
    steerRef.current = 0;
    placeTouch(0, 0, 0, 0, false);
  };

  return (
    <div ref={shellRef} className="game-overlay neon-ride" role="dialog" aria-label="AQUATIC RUSH">
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
      {hands && (
        <div className="aqua-hands">
          <div
            className="aqua-pad"
            onPointerDown={(e) => {
              if (e.pointerType === "mouse" && e.button !== 0) return;
              e.preventDefault();
              try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* pointer already gone */ }
              stickOrigin.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
              aimStick(0, 0);
              placeTouch(e.clientX, e.clientY, 0, 0, true);
            }}
            onPointerMove={(e) => {
              const origin = stickOrigin.current;
              if (!origin || origin.id !== e.pointerId) return;
              const dx = Math.max(-THROW, Math.min(THROW, e.clientX - origin.x));
              const dy = Math.max(-THROW, Math.min(THROW, e.clientY - origin.y));
              aimStick(dx, dy);
              placeTouch(origin.x, origin.y, dx, dy, true);
            }}
            onPointerUp={(e) => endTouch(e.pointerId)}
            onPointerCancel={(e) => endTouch(e.pointerId)}
          />
          <div ref={stickRef} className="aqua-stick">
            <div ref={knobRef} className="aqua-knob" />
          </div>
          <div ref={glowRef} className="aqua-glow" />
        </div>
      )}
    </div>
  );
}
