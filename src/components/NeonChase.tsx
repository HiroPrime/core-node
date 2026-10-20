"use client";

import { useEffect, useRef, useState } from "react";

/**
 * NEON CHASE — the cabinet game.
 *
 * The OutRun camera, in neon. Sky, a wide road, the car sitting on it,
 * and a dash along the bottom. The lean shows while she changes lanes
 * and snaps straight as soon as the car is in the lane.
 * Nitro is a second set of graphics. It only draws while the boost is on.
 */

const LANES = 3;
const CAR = "/arcade/chase/";
const HITS_TO_BLOW = 4;
const HUES = ["#7ef6ff", "#ff4ad2", "#ffe14a", "#39ff88", "#ff7a3d", "#c9a6ff"];
const ROSTER = ["PINK", "CYAN", "GOLD", "LIME", "ORANGE", "VIOLET", "SILVER", "RED", "BLUE", "WHITE"];
const SWATCH = ["#ff4ad2", "#3df0ff", "#ffe14a", "#39ff88", "#ff7a3d", "#b388ff", "#d7e2ee", "#ff3355", "#4aa3ff", "#f7f7ff"];

type Traffic = { lane: number; z: number; hue: string; kmh: number; wrecked: boolean; scored: boolean; sprite: number };

function makeCar(z: number, lane: number): Traffic {
  const roll = Math.random();
  const kmh = roll < 0.7 ? 90 + Math.random() * 70 : 170 + Math.random() * 55;
  return {
    lane,
    z,
    hue: HUES[Math.floor(Math.random() * HUES.length)],
    kmh,
    wrecked: false,
    scored: false,
    sprite: Math.floor(Math.random() * 10),
  };
}

function trafficSet(): Traffic[] {
  const cars: Traffic[] = [];
  for (let i = 0; i < 3; i += 1) cars.push(makeCar(0.48 + i * 0.24, i % LANES));
  return cars;
}

function load(src: string, into: (img: HTMLImageElement) => void) {
  const img = new Image();
  img.onload = () => into(img);
  img.src = src;
}

export function NeonChase({ onExit }: { onExit: () => void }) {
  const shellRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const onExitRef = useRef(onExit);
  const heldRef = useRef(new Set<string>());
  const [pedals, setPedals] = useState(false);
  onExitRef.current = onExit;

  useEffect(() => {
    const shell = shellRef.current;
    const canvas = canvasRef.current;
    if (!shell || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const roster: HTMLImageElement[] = [];
    for (let i = 0; i < ROSTER.length; i += 1) {
      load(`${CAR}roster/car-${i}.png?v=2`, (img) => { roster[i] = img; });
    }

    const pixelFont = (() => {
      const v = getComputedStyle(document.documentElement).getPropertyValue("--font-pixel").trim();
      return v || '"Courier New", monospace';
    })();

    const fit = (text: string, target: number, maxWidth: number) => {
      ctx.font = `${target}px ${pixelFont}`;
      const width = ctx.measureText(text).width;
      if (width <= maxWidth) return target;
      return Math.max(12, Math.floor((target * maxWidth) / width));
    };

    const held = heldRef.current;
    let pedalsOn = false;
    let lane = 1;
    let x = 1;
    let lean: -1 | 0 | 1 = 0;
    let scroll = 0;
    let distance = 0;
    let clock = 0;
    let nitro = 1;
    let boosting = false;
    let kmh = 180;
    let passed = 0;
    let damage = 0;
    let hurt = 0;
    let dead = 0;
    let high = 0;
    try {
      high = Number(localStorage.getItem("neon-chase-high")) || 0;
    } catch {
      high = 0;
    }
    const traffic: Traffic[] = trafficSet();
    let phase: "pick" | "controls" | "count" | "drive" = "pick";
    let pickCols = 5;
    let picked = 0;
    let countT = 0;
    const cells: { i: number; x: number; y: number; w: number; h: number }[] = [];

    const saveHigh = () => {
      try {
        localStorage.setItem("neon-chase-high", String(high));
      } catch {
        /* private mode */
      }
    };

    const spawnAhead = () => {
      const z = 0.9 + Math.random() * 0.14;
      let lane = Math.floor(Math.random() * LANES);
      for (let n = 0; n < LANES; n += 1) {
        const tryLane = (lane + n) % LANES;
        const crowded = traffic.some((c) => c.lane === tryLane && Math.abs(c.z - z) < 0.22);
        if (!crowded) {
          lane = tryLane;
          break;
        }
      }
      traffic.push(makeCar(z, lane));
    };

    const fillField = () => {
      let guard = 0;
      while (traffic.filter((c) => c.z > 0 && c.z < 1.2).length < 3 && guard < 4) {
        spawnAhead();
        guard += 1;
      }
    };

    let w = 0;
    let h = 0;
    let raf = 0;
    let last = performance.now();

    const resize = () => {
      w = shell.clientWidth;
      h = shell.clientHeight;
      if (w < 1 || h < 1) {
        w = 0;
        h = 0;
        return;
      }
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = false;
    };

    const fresh = () => {
      lane = 1;
      x = 1;
      lean = 0;
      scroll = 0;
      distance = 0;
      clock = 0;
      nitro = 1;
      boosting = false;
      kmh = 180;
      passed = 0;
      damage = 0;
      hurt = 0;
      dead = 0;
      traffic.splice(0, traffic.length, ...trafficSet());
    };
    const reset = (clearHeld = true) => {
      fresh();
      phase = "pick";
      countT = 0;
      if (clearHeld) held.clear();
    };
    const desktop = () => w >= 900 && h >= 560;
    const begin = () => {
      phase = "count";
      countT = 0;
      held.clear();
    };
    const arm = () => {
      fresh();
      countT = 0;
      held.clear();
      phase = desktop() ? "controls" : "count";
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Escape") {
        e.preventDefault();
        onExitRef.current();
        return;
      }
      if (e.code === "KeyR") {
        e.preventDefault();
        reset();
        return;
      }
      if (phase === "pick") {
        if (e.code === "Enter" || e.code === "Space") {
          e.preventDefault();
          arm();
          return;
        }
        const cols = pickCols;
        const col = picked % cols;
        const row = Math.floor(picked / cols);
        if (e.code === "ArrowLeft" || e.code === "KeyA") {
          e.preventDefault();
          picked = row * cols + (col + cols - 1) % cols;
        } else if (e.code === "ArrowRight" || e.code === "KeyD") {
          e.preventDefault();
          picked = row * cols + (col + 1) % cols;
        } else if (e.code === "ArrowUp" || e.code === "KeyW") {
          e.preventDefault();
          picked = (picked - cols + ROSTER.length) % ROSTER.length;
        } else if (e.code === "ArrowDown" || e.code === "KeyS") {
          e.preventDefault();
          picked = (picked + cols) % ROSTER.length;
        }
        return;
      }
      if (phase === "controls") {
        if (e.code === "Enter" || e.code === "Space") {
          e.preventDefault();
          begin();
        }
        return;
      }
      if (phase !== "drive") return;
      if (e.code === "ShiftLeft" || e.code === "ShiftRight" || e.code === "Space") {
        e.preventDefault();
        held.add("nitro");
        return;
      }
      if (e.code === "ArrowDown") {
        e.preventDefault();
        held.add("brake");
        return;
      }
      if (e.code === "ArrowLeft" || e.code === "KeyA") {
        e.preventDefault();
        if (!held.has("left")) {
          held.add("left");
          lane = Math.max(0, lane - 1);
        }
      } else if (e.code === "ArrowRight" || e.code === "KeyD") {
        e.preventDefault();
        if (!held.has("right")) {
          held.add("right");
          lane = Math.min(LANES - 1, lane + 1);
        }
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "ArrowLeft" || e.code === "KeyA") held.delete("left");
      if (e.code === "ArrowRight" || e.code === "KeyD") held.delete("right");
      if (e.code === "ShiftLeft" || e.code === "ShiftRight" || e.code === "Space") held.delete("nitro");
      if (e.code === "ArrowDown") held.delete("brake");
    };

    const drawCar = (img: HTMLImageElement | undefined, cx: number, foot: number, height: number) => {
      if (!img) return;
      const width = img.width * (height / img.height);
      ctx.drawImage(img, Math.round(cx - width / 2), Math.round(foot - height), Math.round(width), Math.round(height));
    };

    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      if (w === 0) resize();
      if (w > 0) {
        const mobile = w < 900 || h < 560;
        const dashH = mobile ? 96 : 108;
        shell.style.setProperty("--dash-h", `${dashH}px`);
        const wantPedals = mobile && phase !== "pick";
        if (wantPedals !== pedalsOn) {
          pedalsOn = wantPedals;
          setPedals(wantPedals);
        }
        const viewBottom = h - dashH;
        const horizon = Math.round(viewBottom * 0.42);

        if (phase === "count") {
          countT += dt;
          if (countT >= 4) phase = "drive";
        } else if (phase === "drive" && dead > 0) {
          dead -= dt;
          if (dead <= 0) {
            fresh();
            begin();
          }
        } else if (phase === "drive") {
          if (hurt > 0) hurt -= dt;

          if (held.has("nitro") && (boosting || nitro > 0.08)) {
            boosting = nitro > 0;
            nitro = Math.max(0, nitro - dt * 0.42);
            if (nitro <= 0) boosting = false;
          } else {
            boosting = false;
            nitro = Math.min(1, nitro + dt * 0.2);
          }

          const cruise = 180;
          if (held.has("brake")) kmh = Math.max(0, kmh - dt * 240);
          else if (boosting) kmh = Math.min(360, kmh + dt * 140);
          else if (kmh < cruise) kmh = Math.min(cruise, kmh + dt * 80);
          else kmh = Math.max(cruise, kmh - dt * 70);

          const drive = kmh / 220;
          clock += dt;
          distance += dt * 78 * drive;
          scroll += dt * 2.4 * drive;

          const gap = lane - x;
          if (Math.abs(gap) < 0.1) {
            x = lane;
            lean = 0;
          } else {
            x += gap * Math.min(1, dt * 10);
            lean = gap > 0 ? 1 : -1;
          }

          for (const car of traffic) {
            car.z -= dt * 0.95 * ((kmh - car.kmh) / 160);
            const overlap = !car.wrecked && Math.abs(x - car.lane) < 0.55 && car.z < 0.16 && car.z > -0.04;
            if (overlap) {
              car.wrecked = true;
              car.kmh = 20;
              car.lane = car.lane === 0 ? 2 : car.lane === 2 ? 0 : x < 1 ? 2 : 0;
              damage += 1;
              hurt = 0.45;
            } else if (!car.scored && !car.wrecked && car.z < 0) {
              car.scored = true;
              passed += 1;
              if (passed > high) {
                high = passed;
                saveHigh();
              }
            }
          }
          for (let i = 0; i < traffic.length; i += 1) {
            for (let j = i + 1; j < traffic.length; j += 1) {
              const a = traffic[i];
              const b = traffic[j];
              if (a.lane !== b.lane || a.z <= 0 || b.z <= 0 || Math.abs(a.z - b.z) >= 0.16) continue;
              if (a.z > b.z) a.z = b.z + 0.16;
              else b.z = a.z + 0.16;
            }
          }
          for (let i = traffic.length - 1; i >= 0; i -= 1) {
            if (traffic[i].z < -0.22 || traffic[i].z > 1.28) traffic.splice(i, 1);
          }
          fillField();

          if (damage >= HITS_TO_BLOW) {
            if (passed > high) {
              high = passed;
              saveHigh();
            }
            passed = 0;
            dead = 1.2;
          }
        }

        const roadAt = (y: number) => {
          const t = Math.max(0, Math.min(1, (y - horizon) / (viewBottom - horizon)));
          const bend = Math.sin(scroll * 0.28) * w * 0.045;
          const half = w * (0.035 + 0.62 * Math.pow(t, 1.25));
          return { t, half, cx: w / 2 + bend * t };
        };

        const sky = ctx.createLinearGradient(0, 0, 0, horizon);
        sky.addColorStop(0, "#14083a");
        sky.addColorStop(0.55, "#3a1478");
        sky.addColorStop(1, "#c43ad4");
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, w, horizon);

        const clouds = [
          [0.12, 0.22, 70],
          [0.4, 0.12, 90],
          [0.68, 0.28, 64],
          [0.86, 0.16, 80],
        ];
        ctx.fillStyle = "#f2c6ff";
        for (const [px, py, pw] of clouds) {
          const drift = ((px * w - scroll * 18) % (w + 160) + w + 160) % (w + 160) - 80;
          const cy = py * horizon;
          ctx.fillRect(drift, cy, pw, 10);
          ctx.fillRect(drift + 12, cy - 8, pw * 0.55, 8);
          ctx.fillRect(drift + 8, cy + 10, pw * 0.7, 6);
        }

        for (let y = horizon; y < viewBottom; y += 1) {
          const road = roadAt(y);
          ctx.fillStyle = y % 8 < 4 ? "#5a206e" : "#47185a";
          ctx.fillRect(0, y, w, 1);
          ctx.fillStyle = "#1a1030";
          ctx.fillRect(Math.round(road.cx - road.half), y, Math.round(road.half * 2), 1);

          const rumble = Math.floor(road.t * 16 + scroll * 7) % 2 === 0;
          const strip = Math.max(3, road.half * 0.07);
          ctx.fillStyle = rumble ? "#ff3d9a" : "#3df0ff";
          ctx.fillRect(Math.round(road.cx - road.half - strip), y, Math.ceil(strip), 1);
          ctx.fillRect(Math.round(road.cx + road.half), y, Math.ceil(strip), 1);

          const stripe = Math.floor(road.t * 14 + scroll * 8) % 2 === 0;
          if (stripe && road.t > 0.06) {
            ctx.fillStyle = "#f4f7ff";
            const markW = Math.max(2, road.t * 5);
            for (let mark = 1; mark < LANES; mark += 1) {
              const lx = road.cx + (mark / LANES - 0.5) * road.half * 2;
              ctx.fillRect(Math.round(lx - markW / 2), y, Math.ceil(markW), 1);
            }
          }
        }

        const laneX = (index: number, road: { cx: number; half: number }) =>
          road.cx + (index - 1) * road.half * 0.58;

        const drawTraffic = (car: Traffic) => {
          const depth = Math.max(-0.08, Math.min(1, car.z));
          const y = horizon + Math.pow(1 - depth, 1.35) * (viewBottom - horizon - 8);
          if (y > viewBottom - 4) return;
          const road = roadAt(Math.min(y, viewBottom - 1));
          const height = (16 + (1 - Math.min(1, Math.max(0, car.z))) * 78) * (mobile ? 0.5 : 1);
          const cx = laneX(car.lane, road);
          const rival = roster[car.sprite];
          if (rival) {
            drawCar(rival, cx, y, height);
            return;
          }
          const width = height * 1.35;
          ctx.fillStyle = "#07010e";
          ctx.fillRect(Math.round(cx - width / 2), Math.round(y - height), Math.round(width), Math.round(height));
          ctx.fillStyle = car.hue;
          ctx.fillRect(Math.round(cx - width / 2 + 2), Math.round(y - height + 3), Math.round(width - 4), Math.round(height * 0.45));
        };
        traffic.slice().sort((a, b) => b.z - a.z).forEach(drawTraffic);

        if (boosting) {
          ctx.fillStyle = "rgba(90, 240, 255, 0.85)";
          for (let i = 0; i < 8; i += 1) {
            const yy = horizon + 24 + ((i * 47 + scroll * 220) % (viewBottom - horizon - 30));
            const road = roadAt(yy);
            const len = 18 + (i % 3) * 16;
            ctx.fillRect(Math.round(road.cx - road.half - 28 - len), yy, len, 2);
            ctx.fillRect(Math.round(road.cx + road.half + 28), yy, len, 2);
          }
        }

        const fullH = Math.min(168, (viewBottom - horizon) * 0.34);
        const carH = fullH * (mobile ? 0.42 : 0.7);
        const playerFoot = viewBottom - 6 - carH;
        const playerRoad = roadAt(playerFoot - 36);
        const pcx = laneX(x, playerRoad);
        const body = roster[picked];
        if (phase !== "pick" && dead <= 0) drawCar(body, pcx, playerFoot, carH);

        if (hurt > 0.05 && dead <= 0) {
          ctx.fillStyle = "rgba(255, 40, 80, 0.28)";
          ctx.fillRect(0, 0, w, viewBottom);
        }

        if (dead > 0) {
          const t = 1.2 - dead;
          for (let i = 0; i < 16; i += 1) {
            const ang = (i / 16) * Math.PI * 2 + t;
            const dist = 16 + t * 90 * (0.35 + (i % 4) * 0.18);
            ctx.fillStyle = i % 2 === 0 ? "#ffe14a" : "#ff4ad2";
            ctx.fillRect(Math.round(pcx + Math.cos(ang) * dist), Math.round(playerFoot - 48 + Math.sin(ang) * dist * 0.6), 7, 7);
          }
          ctx.textAlign = "center";
          ctx.fillStyle = "#ffe14a";
          ctx.font = `22px ${pixelFont}`;
          ctx.fillText("BLOWN UP", w / 2, horizon + (viewBottom - horizon) * 0.42);
        }

        ctx.textAlign = "center";
        const highLabel = "HIGH SCORE";
        const highValue = String(high).padStart(6, "0");
        const highLabelPx = mobile ? fit(highLabel, 16, w - 150) : 11;
        const highValuePx = mobile ? fit(highValue, 30, w - 170) : 22;
        ctx.font = `${highLabelPx}px ${pixelFont}`;
        const labelW = ctx.measureText(highLabel).width;
        ctx.font = `${highValuePx}px ${pixelFont}`;
        const valueW = ctx.measureText(highValue).width;
        const boxW = Math.max(labelW, valueW) + (mobile ? 28 : 36);
        const boxH = mobile ? highLabelPx + highValuePx + 22 : 54;
        const boxX = Math.round(w / 2 - boxW / 2);
        ctx.fillStyle = "rgba(8, 2, 16, 0.82)";
        ctx.fillRect(boxX, 10, boxW, boxH);
        ctx.strokeStyle = "#ffe14a";
        ctx.lineWidth = 3;
        ctx.strokeRect(boxX, 10, boxW, boxH);
        ctx.fillStyle = "#ffe14a";
        ctx.font = `${highLabelPx}px ${pixelFont}`;
        ctx.fillText(highLabel, w / 2, 10 + highLabelPx + 6);
        ctx.fillStyle = "#fff6c2";
        ctx.font = `${highValuePx}px ${pixelFont}`;
        ctx.fillText(highValue, w / 2, 10 + boxH - 10);

        ctx.textAlign = "left";
        ctx.fillStyle = "#ff8aa8";
        ctx.font = `${mobile ? 15 : 11}px ${pixelFont}`;
        ctx.fillText("DAMAGE", 18, mobile ? 32 : 28);
        for (let i = 0; i < HITS_TO_BLOW; i += 1) {
          ctx.fillStyle = i < damage ? "#ff3355" : "#3a1848";
          ctx.fillRect(18 + i * 22, 36, 16, 10);
        }

        if (phase === "drive" && boosting && body) {
          const carW = body.width * (carH / body.height);
          const jetW = Math.max(8, carW * 0.08);
          const jetH = 26 + (Math.floor(now / 40) % 3) * 10;
          const jets = [pcx - carW * 0.18, pcx + carW * 0.18];
          for (const jet of jets) {
            ctx.fillStyle = "#7ef6ff";
            ctx.fillRect(Math.round(jet - jetW / 2), playerFoot - 8, Math.round(jetW), jetH);
            ctx.fillStyle = "#f4fbff";
            ctx.fillRect(Math.round(jet - jetW / 4), playerFoot - 4, Math.round(jetW / 2), jetH * 0.7);
          }
        }

        const panel = {
          x: 12,
          y: viewBottom + (mobile ? 4 : 8),
          w: w - 24,
          h: dashH - (mobile ? 8 : 16),
        };
        ctx.fillStyle = "#12061f";
        ctx.fillRect(0, viewBottom, w, dashH);
        ctx.strokeStyle = "#ff4ad2";
        ctx.lineWidth = 3;
        ctx.strokeRect(panel.x, panel.y, panel.w, panel.h);
        ctx.strokeStyle = "#5af0ff";
        ctx.lineWidth = 1;
        ctx.strokeRect(panel.x + 4, panel.y + 4, panel.w - 8, panel.h - 8);

        const col = panel.w / 3;
        const speed = Math.round(kmh);
        const timeLabel = String(Math.floor(clock)).padStart(3, "0");
        const rows: [string, string][] = [
          ["TIME", timeLabel],
          [boosting ? "NITRO" : "KM/H", String(speed)],
          ["SCORE", String(passed).padStart(6, "0")],
        ];
        const valuePx = mobile ? fit("000000", 24, col - 16) : 22;
        const labelPx = mobile ? fit("SCORE", 16, col - 16) : 11;
        rows.forEach(([label, value], i) => {
          const cx = panel.x + col * i + col / 2;
          ctx.textAlign = "center";
          ctx.fillStyle = "#c9a6ff";
          ctx.font = `${labelPx}px ${pixelFont}`;
          ctx.fillText(label, cx, panel.y + (mobile ? labelPx + 8 : 26));
          ctx.fillStyle = boosting && i === 1 ? "#7ef6ff" : "#39ff88";
          ctx.font = `${valuePx}px ${pixelFont}`;
          ctx.fillText(value, cx, panel.y + (mobile ? labelPx + valuePx + 14 : 54));
        });

        const barX = panel.x + col + (mobile ? 18 : 28);
        const barY = panel.y + panel.h - (mobile ? 10 : 16);
        const barW = col - (mobile ? 36 : 56);
        ctx.fillStyle = "#07010e";
        ctx.fillRect(barX, barY, barW, 8);
        ctx.fillStyle = boosting ? "#7ef6ff" : "#ff4ad2";
        ctx.fillRect(barX, barY, Math.max(0, barW * nitro), 8);

        if (phase === "count") {
          const step = Math.min(3, Math.floor(countT));
          const label = step < 3 ? String(3 - step) : "GO!!!";
          ctx.textAlign = "center";
          ctx.fillStyle = "#ffe14a";
          const countPx = mobile ? fit(label, 72, w - 32) : 64;
          ctx.font = `${countPx}px ${pixelFont}`;
          ctx.fillText(label, w / 2, horizon + (viewBottom - horizon) * 0.42);
          ctx.fillStyle = "#fff6c2";
          const shout = "PASS AS MANY CARS AS YOU CAN";
          const shoutPx = fit(shout, mobile ? 18 : 14, w - 28);
          ctx.font = `${shoutPx}px ${pixelFont}`;
          ctx.fillText(shout, w / 2, horizon + (viewBottom - horizon) * 0.42 + countPx * 0.55);
        }

        if (phase === "pick") {
          ctx.fillStyle = "#070014";
          ctx.fillRect(0, 0, w, h);
          ctx.textAlign = "center";
          const title = "CHOOSE YOUR CAR";
          const titlePx = fit(title, mobile ? 22 : 22, w - 36);
          const titleY = mobile ? 88 : 78;
          ctx.fillStyle = "#ffe14a";
          ctx.font = `${titlePx}px ${pixelFont}`;
          ctx.fillText(title, w / 2, titleY);
          const shout = "PASS AS MANY CARS AS YOU CAN";
          const shoutPx = fit(shout, mobile ? 14 : 13, w - 36);
          const shoutY = titleY + shoutPx + 12;
          ctx.fillStyle = "#fff6c2";
          ctx.font = `${shoutPx}px ${pixelFont}`;
          ctx.fillText(shout, w / 2, shoutY);

          const cols = 2;
          pickCols = cols;
          const rows = 5;
          const gapX = 14;
          const nameBand = mobile ? 22 : 30;
          const top = shoutY + 14;
          const availH = Math.max(240, h - top - (mobile ? 40 : 52));
          const cellW = Math.min(210, (Math.min(w - 28, 520) - gapX) / cols);
          const cellH = Math.min(cellW * 0.72, (availH - nameBand * (rows - 1)) / rows);
          const gridW = cols * cellW + gapX;
          const startX = (w - gridW) / 2;
          const startY = top;
          cells.length = 0;
          for (let i = 0; i < ROSTER.length; i += 1) {
            const col = i % cols;
            const row = Math.floor(i / cols);
            const x = startX + col * (cellW + gapX);
            const y = startY + row * (cellH + nameBand);
            cells.push({ i, x, y, w: cellW, h: cellH });
            ctx.fillStyle = i === picked ? "#241018" : "#12061c";
            ctx.fillRect(x, y, cellW, cellH);
            ctx.strokeStyle = i === picked ? "#ffe14a" : "#ff4ad2";
            ctx.lineWidth = i === picked ? 4 : 2;
            ctx.strokeRect(x, y, cellW, cellH);
            const pic = roster[i];
            if (pic) drawCar(pic, x + cellW / 2, y + cellH - 8, cellH * 0.72);
            else {
              ctx.fillStyle = SWATCH[i];
              ctx.fillRect(x + 18, y + 16, cellW - 36, cellH * 0.45);
            }
            ctx.fillStyle = i === picked ? "#ffe14a" : "#c9a6ff";
            const namePx = fit(ROSTER[i], mobile ? 16 : 11, cellW - 8);
            ctx.font = `${namePx}px ${pixelFont}`;
            ctx.fillText(ROSTER[i], x + cellW / 2, y + cellH + namePx + 2);
          }
          const hint = "TAP A CAR TO RACE";
          const hintPx = fit(hint, mobile ? 16 : 13, w - 28);
          ctx.fillStyle = "#fff6c2";
          ctx.font = `${hintPx}px ${pixelFont}`;
          ctx.fillText(hint, w / 2, h - (mobile ? 28 : 36));
        }

        if (phase === "controls") {
          ctx.fillStyle = "#070014";
          ctx.fillRect(0, 0, w, h);
          ctx.textAlign = "center";
          const title = "CONTROLS";
          const titlePx = fit(title, 40, w - 64);
          const rows: [string, string][] = [
            ["A  D  OR ARROWS", "LANES"],
            ["SHIFT OR SPACE", "BOOST"],
            ["DOWN ARROW", "BRAKE"],
          ];
          const keyPx = fit("SHIFT OR SPACE", 22, w * 0.42);
          const actPx = 22;
          const start = "ENTER OR CLICK TO RACE";
          const startPx = fit(start, 20, w - 48);
          const rowGap = keyPx + 34;
          const blockH = titlePx + 48 + rows.length * rowGap + 56 + startPx;
          let y = Math.round(h / 2 - blockH / 2 + titlePx);
          ctx.fillStyle = "#ffe14a";
          ctx.font = `${titlePx}px ${pixelFont}`;
          ctx.fillText(title, w / 2, y);
          y += 56;
          rows.forEach(([key, action]) => {
            ctx.textAlign = "right";
            ctx.fillStyle = "#fff6c2";
            ctx.font = `${keyPx}px ${pixelFont}`;
            ctx.fillText(key, w / 2 - 28, y);
            ctx.textAlign = "left";
            ctx.fillStyle = "#7ef6ff";
            ctx.font = `${actPx}px ${pixelFont}`;
            ctx.fillText(action, w / 2 + 28, y);
            y += rowGap;
          });
          ctx.textAlign = "center";
          ctx.fillStyle = "#ffe14a";
          ctx.font = `${startPx}px ${pixelFont}`;
          ctx.fillText(start, w / 2, y + 36);
        }
      }
      raf = requestAnimationFrame(tick);
    };

    const onClick = (e: MouseEvent) => {
      if (phase === "controls") {
        begin();
        return;
      }
      if (phase !== "pick") return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = w / rect.width;
      const scaleY = h / rect.height;
      const px = (e.clientX - rect.left) * scaleX;
      const py = (e.clientY - rect.top) * scaleY;
      const hit = cells.find((cell) => px >= cell.x && px <= cell.x + cell.w && py >= cell.y && py <= cell.y + cell.h);
      if (!hit) return;
      picked = hit.i;
      arm();
    };

    let swipe: { x: number; y: number } | null = null;
    const onPointerDown = (e: PointerEvent) => {
      if (phase === "pick" || phase === "controls") return;
      swipe = { x: e.clientX, y: e.clientY };
    };
    const onPointerUp = (e: PointerEvent) => {
      if (!swipe) return;
      const dx = e.clientX - swipe.x;
      const dy = e.clientY - swipe.y;
      swipe = null;
      if (phase !== "drive") return;
      if (Math.abs(dx) < 36 || Math.abs(dx) < Math.abs(dy)) return;
      if (dx < 0) lane = Math.max(0, lane - 1);
      else lane = Math.min(LANES - 1, lane + 1);
    };
    const onPointerCancel = () => {
      swipe = null;
    };

    resize();
    raf = requestAnimationFrame(tick);
    window.addEventListener("resize", resize);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerCancel);
    canvas.addEventListener("click", onClick);
    canvas.addEventListener("pointerdown", onPointerDown);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerCancel);
      canvas.removeEventListener("click", onClick);
      canvas.removeEventListener("pointerdown", onPointerDown);
    };
  }, []);

  return (
    <div ref={shellRef} className="game-overlay neon-ride" role="dialog" aria-label="NEON CHASE">
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
      {pedals && (
        <div className="neon-pedals">
          <button
            type="button"
            className="neon-pedal neon-brake"
            aria-label="Brake"
            onPointerDown={(e) => {
              e.preventDefault();
              e.currentTarget.setPointerCapture(e.pointerId);
              heldRef.current.add("brake");
            }}
            onPointerUp={() => heldRef.current.delete("brake")}
            onPointerCancel={() => heldRef.current.delete("brake")}
            onLostPointerCapture={() => heldRef.current.delete("brake")}
          >
            BRAKE
          </button>
          <button
            type="button"
            className="neon-pedal neon-boost"
            aria-label="Boost"
            onPointerDown={(e) => {
              e.preventDefault();
              e.currentTarget.setPointerCapture(e.pointerId);
              heldRef.current.add("nitro");
            }}
            onPointerUp={() => heldRef.current.delete("nitro")}
            onPointerCancel={() => heldRef.current.delete("nitro")}
            onLostPointerCapture={() => heldRef.current.delete("nitro")}
          >
            BOOST
          </button>
        </div>
      )}
    </div>
  );
}
