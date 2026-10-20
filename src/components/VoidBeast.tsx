"use client";

import { useEffect, useRef } from "react";

/**
 * VOID BEAST — top-down shooter on the cabinet.
 *
 * Same door as NEON CHASE: controls on a big screen, then a countdown,
 * then the run. The ship sits at the bottom. Swarmers, stingers, and
 * carriers come down in rows. Blue and gold chips change the shot.
 * Enemies, then a boss, then enemies again. It keeps going.
 * The score is points for each kill plus points for staying alive.
 * Chips are rare and the shot they give wears off.
 */

const ROOT = "/arcade/void-beast/";
const BG = "/arcade-bk/Void%20Beast/background.jpg";
const LIVES = 5;
const BOSSES = 5;
const BOSS_GAP = 42;
const POINTS: Record<Kind, number> = { swarm: 100, sting: 250, carrier: 500, boss: 2000 };
const TIME_POINTS = 25;
const POWER_SEC = 12;
const CHIP_CHANCE = 0.12;

type Kind = "swarm" | "sting" | "carrier" | "boss";
type Weapon = "basic" | "blue" | "gold" | "spread";
type Phase = "controls" | "count" | "play" | "over";
type Mode = "waves" | "warning" | "boss";

type Enemy = {
  kind: Kind;
  x: number;
  y: number;
  hp: number;
  max: number;
  age: number;
  shoot: number;
  dive: number;
  seed: number;
  tier: number;
};

type Shot = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  dmg: number;
  good: boolean;
  hue: string;
};

type Chip = { x: number; y: number; kind: Exclude<Weapon, "basic">; life: number };
type Boom = { x: number; y: number; t: number; big: boolean };

const HP: Record<Kind, number> = { swarm: 1, sting: 3, carrier: 6, boss: 46 };

function load(src: string, into: (img: HTMLImageElement) => void) {
  const img = new Image();
  img.onload = () => into(img);
  img.src = src;
}

export function VoidBeast({ onExit, onGameOver }: { onExit: () => void; onGameOver?: (score: number) => void }) {
  const shellRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const onExitRef = useRef(onExit);
  onExitRef.current = onExit;
  const onGameOverRef = useRef(onGameOver);
  onGameOverRef.current = onGameOver;

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
    const names = [
      "ship-0",
      "swarm-0", "swarm-1", "swarm-2", "swarm-3", "swarm-4", "swarm-5",
      "sting-0", "sting-1", "sting-2", "sting-3", "sting-charge",
      "carrier-0", "carrier-1",
      "boss-0", "boss-1", "boss-2", "boss-3", "boss-hurt",
      "boom-s", "boom-m",
    ];
    names.forEach((name) => load(`${ROOT}${name}.png?v=2`, (img) => { frames[name] = img; }));
    let bg: HTMLImageElement | null = null;
    load(BG, (img) => { bg = img; });

    let w = 0;
    let h = 0;
    let phase: Phase = "count";
    let booted = false;
    let mode: Mode = "waves";
    let clock = 0;
    let countT = 0;
    let warnT = 0;
    let spawnT = 0.4;
    let fireT = 0;
    let score = 0;
    let lives = LIVES;
    let hurt = 0;
    let weapon: Weapon = "basic";
    let powerT = 0;
    let dropFlip = 0;
    let bossRound = 0;
    let gapT = BOSS_GAP;
    let timeBank = 0;
    let scroll = 0;
    let high = 0;
    try {
      high = Number(localStorage.getItem("void-beast-high")) || 0;
    } catch {
      high = 0;
    }

    const ship = { x: 0, y: 0, vx: 0 };
    const enemies: Enemy[] = [];
    const shots: Shot[] = [];
    const chips: Chip[] = [];
    const booms: Boom[] = [];
    const keys = new Set<string>();
    let dragging = false;

    const stars = Array.from({ length: 48 }, () => ({
      x: Math.random(),
      y: Math.random(),
      s: Math.random() * 1.6 + 0.4,
      v: Math.random() * 40 + 18,
    }));

    const saveHigh = () => {
      if (score <= high) return;
      high = score;
      try {
        localStorage.setItem("void-beast-high", String(high));
      } catch {
        /* private mode */
      }
    };

    const mobile = () => w < 900 || h < 560;
    const u = () => Math.max(0.85, Math.min(2.3, Math.min(w, h) / 800));
    const bodyH = (kind: Kind, tier = 0) => {
      const base = kind === "swarm" ? 36 : kind === "sting" ? 54 : kind === "carrier" ? 72 : 148;
      const bump = kind === "boss" ? 1 + (tier % BOSSES) * 0.08 : 1;
      return base * (mobile() ? 0.7 : 1) * u() * bump;
    };
    const shipH = () => (mobile() ? 54 : 80) * u();

    const fresh = () => {
      score = 0;
      lives = LIVES;
      hurt = 0;
      weapon = "basic";
      powerT = 0;
      mode = "waves";
      warnT = 0;
      spawnT = 0.5;
      fireT = 0.2;
      bossRound = 0;
      gapT = BOSS_GAP;
      timeBank = 0;
      enemies.length = 0;
      shots.length = 0;
      chips.length = 0;
      booms.length = 0;
      ship.x = w / 2;
      ship.y = Math.max(80, h - shipH() * 0.72);
      ship.vx = 0;
    };

    const begin = () => {
      phase = "count";
      countT = 0;
    };

    const boot = () => {
      if (booted || w < 2) return;
      booted = true;
      fresh();
      phase = mobile() ? "count" : "controls";
    };

    const pad = (n: number) => String(n).padStart(6, "0");

    const spawn = (kind: Kind, x: number, y: number) => {
      const max = HP[kind];
      enemies.push({
        kind,
        x,
        y,
        hp: max,
        max,
        age: 0,
        shoot: 0.8 + Math.random() * 0.6,
        dive: 0,
        seed: Math.random() * Math.PI * 2,
        tier: 0,
      });
    };

    const spawnBoss = () => {
      const style = bossRound % BOSSES;
      const loop = Math.floor(bossRound / BOSSES);
      const max = 36 + style * 10 + loop * 18;
      enemies.push({
        kind: "boss",
        x: w / 2,
        y: -80,
        hp: max,
        max,
        age: 0,
        shoot: 0.9,
        dive: 0,
        seed: 0,
        tier: bossRound,
      });
    };

    const formation = (kind: Kind, count: number) => {
      const span = Math.max(80, w - 80);
      const step = span / (count + 1);
      for (let i = 0; i < count; i += 1) {
        spawn(kind, 40 + step * (i + 1), -30 - i * (kind === "carrier" ? 8 : 28));
      }
    };

    const addScore = (n: number) => {
      score += n;
      saveHigh();
    };

    const kill = (e: Enemy, i: number) => {
      enemies.splice(i, 1);
      const style = e.tier % BOSSES;
      const loop = Math.floor(e.tier / BOSSES);
      addScore(POINTS[e.kind] + (e.kind === "boss" ? style * 500 + loop * 500 : 0));
      booms.push({ x: e.x, y: e.y, t: 0, big: e.kind !== "swarm" });
      if (e.kind === "boss") {
        bossRound += 1;
        mode = "waves";
        gapT = BOSS_GAP;
        spawnT = 0.8;
        return;
      }
      if (chips.length === 0 && Math.random() < CHIP_CHANCE) {
        const kinds: Chip["kind"][] = ["blue", "spread", "gold"];
        chips.push({ x: e.x, y: e.y, kind: kinds[dropFlip++ % kinds.length], life: 8 });
      }
    };

    const hurtShip = () => {
      if (hurt > 0 || phase !== "play") return;
      lives -= 1;
      hurt = 1.15;
      if (lives <= 0) {
        phase = "over";
        saveHigh();
        onGameOverRef.current?.(score);
      }
    };

    const resize = () => {
      w = shell.clientWidth;
      h = shell.clientHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      boot();
    };

    const point = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) return;
      const x = ((e.clientX - rect.left) / rect.width) * w;
      const y = ((e.clientY - rect.top) / rect.height) * h;
      const top = h * 0.42;
      ship.x = Math.max(24, Math.min(w - 24, x));
      ship.y = Math.max(top, Math.min(h - shipH() * 0.55, y));
    };

    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      if (phase === "controls") {
        begin();
        return;
      }
      if (phase === "over") {
        fresh();
        begin();
        return;
      }
      if (phase !== "play") return;
      dragging = true;
      canvas.setPointerCapture?.(e.pointerId);
      point(e);
    };
    const onPointerMove = (e: PointerEvent) => {
      if (dragging && phase === "play") point(e);
    };
    const onPointerUp = () => {
      dragging = false;
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) e.preventDefault();
      if (e.code === "Escape") {
        onExitRef.current();
        return;
      }
      if (phase === "controls" && (e.code === "Enter" || e.code === "Space")) {
        begin();
        return;
      }
      if (phase === "over" && (e.code === "Enter" || e.code === "Space")) {
        fresh();
        begin();
        return;
      }
      keys.add(e.code);
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keys.delete(e.code);
    };

    const blit = (img: HTMLImageElement | undefined, x: number, y: number, height: number) => {
      if (!img || !img.complete || !img.naturalWidth) return false;
      const scale = height / img.height;
      const dw = img.width * scale;
      ctx.drawImage(img, x - dw / 2, y - height / 2, dw, height);
      return true;
    };

    const drawShip = () => {
      const hh = shipH();
      ctx.save();
      if (hurt > 0 && Math.floor(hurt * 14) % 2 === 0) ctx.globalAlpha = 0.35;
      if (!blit(frames["ship-0"], ship.x, ship.y, hh)) {
        ctx.fillStyle = "#7ef6ff";
        ctx.fillRect(ship.x - 14, ship.y - hh / 2, 28, hh);
      }
      ctx.restore();
    };

    const drawHud = () => {
      const s = u();
      ctx.save();
      ctx.textAlign = "center";
      ctx.fillStyle = "#ffe14a";
      ctx.font = `${Math.round(16 * s)}px ${pixelFont}`;
      ctx.fillText(`HI ${pad(high)}`, w / 2, 28 * s);
      ctx.fillStyle = "#fff";
      ctx.font = `${Math.round(22 * s)}px ${pixelFont}`;
      ctx.fillText(pad(score), w / 2, 54 * s);

      ctx.textAlign = "left";
      ctx.fillStyle = "#ff4ad2";
      ctx.font = `${Math.round(13 * s)}px ${pixelFont}`;
      ctx.fillText("LIFE", 16 * s, 26 * s);
      for (let i = 0; i < LIVES; i += 1) {
        ctx.fillStyle = i < lives ? "#ff4ad2" : "rgba(255,74,210,0.2)";
        ctx.fillRect(16 * s + i * 18 * s, 34 * s, 14 * s, 8 * s);
      }

      const label = weapon === "blue" ? "TWIN" : weapon === "gold" ? "HEAVY" : weapon === "spread" ? "SPREAD" : "BASIC";
      ctx.textAlign = "right";
      ctx.fillStyle = weapon === "gold" ? "#ffe14a" : weapon === "basic" ? "#d7e2ee" : "#3df0ff";
      ctx.font = `${Math.round(13 * s)}px ${pixelFont}`;
      ctx.fillText(label, w - 16 * s - 60, 28 * s);
      if (weapon !== "basic") {
        const bw = 64 * s;
        const bx = w - 16 * s - 60 - bw;
        const by = 36 * s;
        ctx.fillStyle = "rgba(255,255,255,0.2)";
        ctx.fillRect(bx, by, bw, 6 * s);
        ctx.fillStyle = weapon === "gold" ? "#ffe14a" : "#3df0ff";
        ctx.fillRect(bx, by, bw * Math.max(0, powerT / POWER_SEC), 6 * s);
      }
      ctx.restore();
    };

    const drawControls = () => {
      ctx.fillStyle = "#070014";
      ctx.fillRect(0, 0, w, h);
      const rows: [string, string][] = [
        ["ARROWS OR WASD", "MOVE"],
        ["DRAG", "MOVE"],
        ["ALWAYS ON", "FIRE"],
        ["BLUE CHIP", "TWIN LASERS"],
        ["SPREAD CHIP", "STRAIGHT + DIAGONAL"],
        ["GOLD CHIP", "HEAVY LASERS"],
        ["EACH CHIP", "12 SECONDS"],
      ];
      const s = u();
      const block = (36 * rows.length + 90) * s;
      let y = h / 2 - block / 2;
      ctx.textAlign = "center";
      ctx.fillStyle = "#b388ff";
      ctx.font = `${Math.round(28 * s)}px ${pixelFont}`;
      ctx.fillText("CONTROLS", w / 2, y);
      y += 54 * s;
      rows.forEach(([key, what]) => {
        ctx.fillStyle = "#ffe14a";
        ctx.font = `${Math.round(16 * s)}px ${pixelFont}`;
        ctx.fillText(key, w / 2, y);
        ctx.fillStyle = "#7ef6ff";
        ctx.font = `${Math.round(13 * s)}px ${pixelFont}`;
        ctx.fillText(what, w / 2, y + 18 * s);
        y += 42 * s;
      });
      ctx.fillStyle = "#fff";
      ctx.font = `${Math.round(15 * s)}px ${pixelFont}`;
      ctx.fillText("ENTER OR CLICK TO FIGHT", w / 2, y + 16 * s);
    };

    const tick = (now: number) => {
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      if (w < 2) resize();
      clock += dt;
      scroll += dt * 70;

      const playing = phase === "play";
      if (playing) {
        hurt = Math.max(0, hurt - dt);
        if (weapon !== "basic") {
          powerT -= dt;
          if (powerT <= 0) {
            weapon = "basic";
            powerT = 0;
          }
        }
        timeBank += dt * TIME_POINTS;
        if (timeBank >= 1) {
          const gain = Math.floor(timeBank);
          timeBank -= gain;
          addScore(gain);
        }
        if (!dragging) {
          let mx = 0;
          let my = 0;
          if (keys.has("ArrowLeft") || keys.has("KeyA")) mx -= 1;
          if (keys.has("ArrowRight") || keys.has("KeyD")) mx += 1;
          if (keys.has("ArrowUp") || keys.has("KeyW")) my -= 1;
          if (keys.has("ArrowDown") || keys.has("KeyS")) my += 1;
          const prev = ship.x;
          ship.x = Math.max(24, Math.min(w - 24, ship.x + mx * 340 * u() * dt));
          ship.y = Math.max(h * 0.42, Math.min(h - shipH() * 0.55, ship.y + my * 260 * u() * dt));
          ship.vx = mx === 0 ? ship.vx * 0.6 : (ship.x - prev) / Math.max(dt, 0.001);
        } else ship.vx *= 0.8;

        fireT -= dt;
        if (fireT <= 0) {
          const nose = ship.y - shipH() * 0.42;
          const shot = u();
          if (weapon === "blue") {
            fireT = 0.11;
            shots.push(
              { x: ship.x - 14 * shot, y: nose, vx: 0, vy: -620 * shot, r: 3 * shot, dmg: 1, good: true, hue: "#3df0ff" },
              { x: ship.x + 14 * shot, y: nose, vx: 0, vy: -620 * shot, r: 3 * shot, dmg: 1, good: true, hue: "#3df0ff" },
            );
          } else if (weapon === "spread") {
            fireT = 0.16;
            const speed = 560 * shot;
            shots.push(
              { x: ship.x, y: nose, vx: 0, vy: -speed, r: 3 * shot, dmg: 1, good: true, hue: "#3df0ff" },
              { x: ship.x, y: nose, vx: -speed * 0.5, vy: -speed * 0.86, r: 3 * shot, dmg: 1, good: true, hue: "#3df0ff" },
              { x: ship.x, y: nose, vx: speed * 0.5, vy: -speed * 0.86, r: 3 * shot, dmg: 1, good: true, hue: "#3df0ff" },
            );
          } else if (weapon === "gold") {
            fireT = 0.2;
            shots.push({ x: ship.x, y: nose, vx: 0, vy: -460 * shot, r: 7 * shot, dmg: 3, good: true, hue: "#ffe14a" });
          } else {
            fireT = 0.15;
            shots.push({ x: ship.x, y: nose, vx: 0, vy: -560 * shot, r: 3 * shot, dmg: 1, good: true, hue: "#ff4ad2" });
          }
        }

        if (mode === "waves") {
          if (gapT > 0) {
            gapT -= dt;
            spawnT -= dt;
            if (spawnT <= 0 && enemies.length < 9) {
              spawnT = 1.15;
              const style = bossRound % BOSSES;
              if (style <= 1) formation("swarm", 5);
              else if (style <= 3) {
                formation("sting", 2);
                formation("swarm", 3);
              } else {
                formation("carrier", 1);
                formation("swarm", 2);
              }
            }
          } else if (!enemies.some((e) => e.kind !== "boss")) {
            mode = "warning";
            warnT = 1.8;
          }
        } else if (mode === "warning") {
          warnT -= dt;
          if (warnT <= 0) {
            mode = "boss";
            spawnBoss();
          }
        }

        for (let i = enemies.length - 1; i >= 0; i -= 1) {
          const e = enemies[i];
          e.age += dt;
          if (e.kind === "boss") {
            e.y = Math.min(h * 0.24, e.y + 50 * u() * dt);
            e.x = w / 2 + Math.sin(clock * 0.7) * Math.min(220 * u(), w * 0.28);
            e.shoot -= dt;
            if (e.shoot <= 0 && e.y > 20) {
              const style = e.tier % BOSSES;
              e.shoot = Math.max(0.34, (e.hp < e.max / 2 ? 0.5 : 0.9) - style * 0.08);
              const spread = style >= 2 ? [-0.7, -0.35, 0, 0.35, 0.7] : [-0.55, 0, 0.55];
              spread.forEach((ang) => {
                shots.push({
                  x: e.x,
                  y: e.y + 30 * u(),
                  vx: Math.sin(ang) * 160 * u(),
                  vy: 240 * u(),
                  r: 6 * u(),
                  dmg: 1,
                  good: false,
                  hue: "#c9a6ff",
                });
              });
            }
            if (Math.floor(e.age) !== Math.floor(e.age - dt) && e.age > 2 && enemies.length < 6) {
              spawn("swarm", e.x - 40, e.y + 20);
              spawn("swarm", e.x + 40, e.y + 20);
            }
          } else if (e.dive > 0) {
            e.y += 220 * u() * dt;
            e.x += Math.sign(ship.x - e.x) * 90 * u() * dt;
          } else {
            const speed = (e.kind === "swarm" ? 78 : e.kind === "sting" ? 52 : 30) * u();
            e.y += speed * dt;
            e.x += Math.sin(clock * 1.6 + e.seed) * (e.kind === "carrier" ? 18 : 46) * u() * dt;
            if (e.kind === "swarm" && e.y > h * 0.28 && e.y < h * 0.45 && Math.random() < dt * 0.35) e.dive = 1;
            if (e.kind === "sting" && e.y > 70 && e.y < h * 0.62) {
              e.shoot -= dt;
              if (e.shoot <= 0) {
                e.shoot = 1.5;
                shots.push({ x: e.x, y: e.y + 10, vx: 0, vy: 210 * u(), r: 5 * u(), dmg: 1, good: false, hue: "#39ff88" });
              }
            }
          }
          if (e.kind !== "boss" && e.y > h + 60) enemies.splice(i, 1);
        }

        for (let i = shots.length - 1; i >= 0; i -= 1) {
          const s = shots[i];
          s.x += s.vx * dt;
          s.y += s.vy * dt;
          if (s.y < -20 || s.y > h + 20 || s.x < -20 || s.x > w + 20) {
            shots.splice(i, 1);
            continue;
          }
          if (s.good) {
            for (let n = enemies.length - 1; n >= 0; n -= 1) {
              const e = enemies[n];
              const hh = bodyH(e.kind, e.tier);
              if (Math.hypot(s.x - e.x, s.y - e.y) < hh * 0.38 + s.r) {
                e.hp -= s.dmg;
                shots.splice(i, 1);
                if (e.hp <= 0) kill(e, n);
                break;
              }
            }
          } else if (Math.hypot(s.x - ship.x, s.y - ship.y) < shipH() * 0.28) {
            shots.splice(i, 1);
            hurtShip();
          }
        }

        enemies.forEach((e) => {
          const hh = bodyH(e.kind, e.tier);
          if (Math.hypot(e.x - ship.x, e.y - ship.y) < hh * 0.32 + shipH() * 0.22) hurtShip();
        });

        for (let i = chips.length - 1; i >= 0; i -= 1) {
          const c = chips[i];
          c.y += 62 * u() * dt;
          c.life -= dt;
          if (c.life <= 0 || c.y > h + 20) {
            chips.splice(i, 1);
            continue;
          }
          if (Math.hypot(c.x - ship.x, c.y - ship.y) < 32 * u()) {
            weapon = c.kind;
            powerT = POWER_SEC;
            chips.splice(i, 1);
          }
        }

        booms.forEach((b) => { b.t += dt; });
        for (let i = booms.length - 1; i >= 0; i -= 1) if (booms[i].t > 0.38) booms.splice(i, 1);
      } else if (phase === "count") {
        countT += dt;
        if (countT >= 3.6) phase = "play";
      }

      ctx.fillStyle = "#05010f";
      ctx.fillRect(0, 0, w, h);
      if (bg && bg.complete && bg.naturalWidth) {
        ctx.imageSmoothingEnabled = true;
        const dh = Math.max(h, bg.height * (w / bg.width));
        const y = (scroll % dh) - dh;
        ctx.drawImage(bg, 0, y, w, dh);
        ctx.drawImage(bg, 0, y + dh, w, dh);
        ctx.fillStyle = "rgba(5, 0, 16, 0.35)";
        ctx.fillRect(0, 0, w, h);
      }
      stars.forEach((s) => {
        const y = ((s.y * h + scroll * (s.v / 40)) % (h + 8)) - 4;
        ctx.fillStyle = "rgba(220,230,255,0.8)";
        ctx.fillRect(s.x * w, y, s.s, s.s);
      });
      ctx.imageSmoothingEnabled = false;

      if (phase !== "controls") {
        enemies.forEach((e) => {
          const hh = bodyH(e.kind, e.tier);
          const f = Math.floor(e.age * 8);
          let name = "swarm-0";
          if (e.kind === "swarm") name = `swarm-${f % 6}`;
          else if (e.kind === "sting") name = e.shoot < 0.25 ? "sting-charge" : `sting-${f % 4}`;
          else if (e.kind === "carrier") name = `carrier-${f % 2}`;
          else name = e.tier % BOSSES >= 3 || e.hp < e.max / 2 ? "boss-hurt" : `boss-${f % 4}`;
          if (!blit(frames[name], e.x, e.y, hh)) {
            ctx.fillStyle = e.kind === "boss" ? "#b388ff" : "#39ff88";
            ctx.fillRect(e.x - hh / 2, e.y - hh / 2, hh, hh * 0.6);
          }
          if (e.max > 1 && e.kind !== "boss") {
            const bw = 26;
            ctx.fillStyle = "rgba(0,0,0,0.55)";
            ctx.fillRect(e.x - bw / 2, e.y - hh / 2 - 8, bw, 4);
            ctx.fillStyle = "#ffe14a";
            ctx.fillRect(e.x - bw / 2, e.y - hh / 2 - 8, bw * Math.max(0, e.hp / e.max), 4);
          }
          if (e.kind === "boss") {
            const bw = Math.min(280, w * 0.5);
            ctx.fillStyle = "rgba(0,0,0,0.55)";
            const barY = 78 * u();
            ctx.fillRect(w / 2 - bw / 2, barY, bw, 8 * u());
            ctx.fillStyle = "#b388ff";
            ctx.fillRect(w / 2 - bw / 2, barY, bw * Math.max(0, e.hp / e.max), 8 * u());
            ctx.fillStyle = "#fff";
            ctx.font = `${Math.round(12 * u())}px ${pixelFont}`;
            ctx.textAlign = "center";
            ctx.fillText(`BOSS ${e.tier + 1}`, w / 2, barY + 22 * u());
          }
        });

        booms.forEach((b) => {
          const img = frames[b.big ? "boom-m" : "boom-s"];
          const hh = (b.big ? 70 : 40) * (0.6 + b.t * 2);
          ctx.globalAlpha = 1 - b.t / 0.38;
          if (!blit(img, b.x, b.y, hh)) {
            ctx.fillStyle = "#ffe14a";
            ctx.beginPath();
            ctx.arc(b.x, b.y, hh / 2, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.globalAlpha = 1;
        });

        shots.forEach((s) => {
          ctx.fillStyle = s.hue;
          ctx.shadowColor = s.hue;
          ctx.shadowBlur = 8;
          ctx.fillRect(s.x - s.r, s.y - s.r * 2, s.r * 2, s.r * 4);
          ctx.shadowBlur = 0;
        });

        chips.forEach((c) => {
          const flash = 0.55 + Math.abs(Math.sin(clock * 10 + c.x)) * 0.45;
          ctx.save();
          ctx.globalAlpha = flash;
          ctx.translate(c.x, c.y);
          ctx.fillStyle = c.kind === "gold" ? "#ffe14a" : "#3df0ff";
          ctx.strokeStyle = "#fff";
          ctx.lineWidth = 2;
          const cs = 12 * u();
          ctx.beginPath();
          if (c.kind === "spread") {
            ctx.moveTo(0, -cs);
            ctx.lineTo(cs, cs * 0.85);
            ctx.lineTo(-cs, cs * 0.85);
          } else if (c.kind === "blue") {
            ctx.moveTo(0, -cs);
            ctx.lineTo(cs * 0.75, 0);
            ctx.lineTo(0, cs);
            ctx.lineTo(-cs * 0.75, 0);
          } else {
            for (let i = 0; i < 6; i += 1) {
              const a = (Math.PI / 3) * i - Math.PI / 2;
              const px = Math.cos(a) * cs;
              const py = Math.sin(a) * cs;
              if (i === 0) ctx.moveTo(px, py);
              else ctx.lineTo(px, py);
            }
          }
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          ctx.restore();
        });

        drawShip();
        drawHud();

        if (phase === "count") {
          const label = countT < 3 ? String(3 - Math.floor(countT)) : "GO!!!";
          ctx.textAlign = "center";
          ctx.fillStyle = "#ffe14a";
          ctx.font = `${Math.round(64 * u())}px ${pixelFont}`;
          ctx.fillText(label, w / 2, h / 2);
        }
        if (mode === "warning" && phase === "play") {
          ctx.textAlign = "center";
          ctx.fillStyle = Math.floor(clock * 6) % 2 === 0 ? "#ff4ad2" : "#ffe14a";
          ctx.font = `${Math.round(32 * u())}px ${pixelFont}`;
          ctx.fillText(`BOSS ${bossRound + 1}`, w / 2, h / 2);
        }
        if (phase === "over") {
          ctx.fillStyle = "rgba(5,0,16,0.55)";
          ctx.fillRect(0, 0, w, h);
          ctx.textAlign = "center";
          ctx.fillStyle = "#ff4ad2";
          ctx.font = `${Math.round(32 * u())}px ${pixelFont}`;
          ctx.fillText("SHIP LOST", w / 2, h / 2 - 20 * u());
          ctx.fillStyle = "#fff";
          ctx.font = `${Math.round(16 * u())}px ${pixelFont}`;
          ctx.fillText(`${pad(score)}   HI ${pad(high)}`, w / 2, h / 2 + 18 * u());
          ctx.fillStyle = "#7ef6ff";
          ctx.font = `${Math.round(14 * u())}px ${pixelFont}`;
          ctx.fillText("ENTER OR CLICK", w / 2, h / 2 + 52 * u());
        }
        if (phase === "play" && mobile()) {
          ctx.textAlign = "center";
          ctx.fillStyle = "rgba(255,255,255,0.55)";
          ctx.font = `12px ${pixelFont}`;
          ctx.fillText("DRAG TO MOVE", w / 2, h - 12);
        }
      } else {
        drawControls();
      }

      raf = requestAnimationFrame(tick);
    };

    let last = performance.now();
    let raf = 0;
    resize();
    raf = requestAnimationFrame(tick);
    window.addEventListener("resize", resize);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointercancel", onPointerUp);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerUp);
    };
  }, []);

  return (
    <div ref={shellRef} className="game-overlay neon-ride" role="dialog" aria-label="VOID BEAST">
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
