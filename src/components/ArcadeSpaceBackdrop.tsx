"use client";

import { useEffect, useRef } from "react";

type Star = { x: number; y: number; z: number; s: number; c: string };
type Asteroid = {
  x: number;
  y: number;
  r: number;
  vx: number;
  vy: number;
  rot: number;
  vr: number;
  sides: number;
  color: string;
};
type AlienKind = "crab" | "squid" | "butterfly" | "bee" | "saucer" | "boss";

type Invader = {
  x: number;
  y: number;
  vx: number;
  phase: number;
  scale: number;
  tint: string;
  kind: AlienKind;
  bob: number;
};
type DistantPlanet = {
  x: number;
  y: number;
  r: number;
  color: string;
  ring?: boolean;
  drift: number;
  baseX: number;
};

const STAR_COLORS = ["#ffffff", "#a5f3fc", "#fde68a", "#f9a8d4", "#bbf7d0", "#fdba74"];
const ASTEROID_COLORS = ["#78716c", "#a8a29e", "#57534e", "#94a3b8"];
const INVADER_COLORS = ["#22d3ee", "#f472b6", "#a3e635", "#fbbf24", "#FF5F1F", "#c084fc", "#67e8f9"];
const ALIEN_KINDS: AlienKind[] = ["crab", "squid", "butterfly", "bee", "saucer", "boss"];

/** Pixel sprites: [x, y] blocks in a Galaga-style grid */
const ALIEN_BODIES: Record<AlienKind, [number, number][]> = {
  crab: [
    [-3, -2], [-2, -2], [2, -2], [3, -2],
    [-4, -1], [-3, -1], [-2, -1], [-1, -1], [0, -1], [1, -1], [2, -1], [3, -1], [4, -1],
    [-5, 0], [-3, 0], [-2, 0], [-1, 0], [0, 0], [1, 0], [2, 0], [3, 0], [5, 0],
    [-5, 1], [-4, 1], [-3, 1], [-1, 1], [0, 1], [1, 1], [3, 1], [4, 1], [5, 1],
    [-4, 2], [-2, 2], [2, 2], [4, 2],
    [-3, 3], [3, 3],
  ],
  squid: [
    [0, -3],
    [-1, -2], [0, -2], [1, -2],
    [-2, -1], [-1, -1], [0, -1], [1, -1], [2, -1],
    [-3, 0], [-2, 0], [-1, 0], [0, 0], [1, 0], [2, 0], [3, 0],
    [-3, 1], [-1, 1], [0, 1], [1, 1], [3, 1],
    [-2, 2], [2, 2],
    [-3, 3], [-1, 3], [1, 3], [3, 3],
  ],
  butterfly: [
    [-4, -3], [4, -3],
    [-5, -2], [-3, -2], [3, -2], [5, -2],
    [-5, -1], [-4, -1], [-2, -1], [-1, -1], [0, -1], [1, -1], [2, -1], [4, -1], [5, -1],
    [-4, 0], [-3, 0], [-2, 0], [-1, 0], [0, 0], [1, 0], [2, 0], [3, 0], [4, 0],
    [-3, 1], [-1, 1], [0, 1], [1, 1], [3, 1],
    [-2, 2], [2, 2],
    [-1, 3], [1, 3],
  ],
  bee: [
    [-1, -3], [1, -3],
    [-2, -2], [-1, -2], [0, -2], [1, -2], [2, -2],
    [-3, -1], [-2, -1], [-1, -1], [0, -1], [1, -1], [2, -1], [3, -1],
    [-2, 0], [-1, 0], [0, 0], [1, 0], [2, 0],
    [-1, 1], [0, 1], [1, 1],
    [-2, 2], [0, 2], [2, 2],
    [-3, 3], [3, 3],
  ],
  saucer: [
    [-2, -2], [-1, -2], [0, -2], [1, -2], [2, -2],
    [-4, -1], [-3, -1], [-2, -1], [-1, -1], [0, -1], [1, -1], [2, -1], [3, -1], [4, -1],
    [-5, 0], [-4, 0], [-3, 0], [-2, 0], [-1, 0], [0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0],
    [-3, 1], [-1, 1], [0, 1], [1, 1], [3, 1],
    [-2, 2], [2, 2],
  ],
  boss: [
    [-2, -4], [2, -4],
    [-3, -3], [-1, -3], [0, -3], [1, -3], [3, -3],
    [-4, -2], [-3, -2], [-2, -2], [-1, -2], [0, -2], [1, -2], [2, -2], [3, -2], [4, -2],
    [-5, -1], [-4, -1], [-2, -1], [-1, -1], [0, -1], [1, -1], [2, -1], [4, -1], [5, -1],
    [-5, 0], [-4, 0], [-3, 0], [-2, 0], [-1, 0], [0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0],
    [-4, 1], [-3, 1], [-1, 1], [0, 1], [1, 1], [3, 1], [4, 1],
    [-5, 2], [-2, 2], [2, 2], [5, 2],
    [-3, 3], [3, 3],
    [-4, 4], [4, 4],
  ],
};

const ALIEN_EYES: Record<AlienKind, [number, number][]> = {
  crab: [[-2, 0], [1, 0]],
  squid: [[-1, -1], [1, -1]],
  butterfly: [[-1, 0], [1, 0]],
  bee: [[-1, -1], [1, -1]],
  saucer: [[-2, -1], [0, -1], [2, -1]],
  boss: [[-2, -1], [1, -1]],
};

function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export default function ArcadeSpaceBackdrop({ className = "" }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rand = mulberry32(42);
    let stars: Star[] = [];
    let asteroids: Asteroid[] = [];
    let invaders: Invader[] = [];
    let planets: DistantPlanet[] = [];
    let w = 0;
    let h = 0;
    let raf = 0;
    let t = 0;

    const resize = () => {
      const parent = canvas.parentElement;
      w = parent?.clientWidth || window.innerWidth;
      h = parent?.clientHeight || window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      stars = Array.from({ length: Math.floor((w * h) / 2800) }, () => ({
        x: rand() * w,
        y: rand() * h,
        z: 0.3 + rand() * 1.4,
        s: 0.6 + rand() * 1.8,
        c: STAR_COLORS[Math.floor(rand() * STAR_COLORS.length)],
      }));

      asteroids = Array.from({ length: 10 }, () => ({
        x: rand() * w,
        y: rand() * h,
        r: 6 + rand() * 18,
        vx: -0.35 - rand() * 1.1,
        vy: (rand() - 0.5) * 0.35,
        rot: rand() * Math.PI * 2,
        vr: (rand() - 0.5) * 0.02,
        sides: 5 + Math.floor(rand() * 4),
        color: ASTEROID_COLORS[Math.floor(rand() * ASTEROID_COLORS.length)],
      }));

      invaders = Array.from({ length: 12 }, (_, i) => {
        const kind = ALIEN_KINDS[i % ALIEN_KINDS.length];
        const isBoss = kind === "boss";
        return {
          x: rand() * w,
          y: 36 + rand() * (h * 0.58),
          vx: (rand() > 0.5 ? 1 : -1) * (isBoss ? 0.25 + rand() * 0.35 : 0.35 + rand() * 0.9),
          phase: rand() * Math.PI * 2,
          scale: isBoss ? 1.05 + rand() * 0.35 : 0.65 + rand() * 0.85,
          tint: INVADER_COLORS[Math.floor(rand() * INVADER_COLORS.length)],
          kind,
          bob: isBoss ? 0.35 : 0.45 + rand() * 0.55,
        };
      });

      planets = [
        { x: w * 0.12, y: h * 0.22, r: 28, color: "#3b82f6", drift: 0.02, baseX: w * 0.12 },
        { x: w * 0.82, y: h * 0.18, r: 42, color: "#ef4444", ring: true, drift: 0.015, baseX: w * 0.82 },
        { x: w * 0.78, y: h * 0.72, r: 22, color: "#a855f7", drift: 0.025, baseX: w * 0.78 },
        { x: w * 0.18, y: h * 0.75, r: 16, color: "#FF00FF", drift: 0.03, baseX: w * 0.18 },
        { x: w * 0.55, y: h * 0.12, r: 12, color: "#22c55e", drift: 0.018, baseX: w * 0.55 },
      ];
    };

    const drawAsteroid = (a: Asteroid) => {
      ctx.save();
      ctx.translate(a.x, a.y);
      ctx.rotate(a.rot);
      ctx.beginPath();
      for (let i = 0; i < a.sides; i++) {
        const ang = (i / a.sides) * Math.PI * 2;
        const radius = a.r * (0.75 + ((i * 37) % 5) * 0.06);
        const px = Math.cos(ang) * radius;
        const py = Math.sin(ang) * radius;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fillStyle = a.color;
      ctx.globalAlpha = 0.85;
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.25)";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();
    };

    const drawInvader = (inv: Invader, frame: number) => {
      const s = 5 * inv.scale;
      const flap = Math.floor(frame * 0.08 + inv.phase) % 2;
      ctx.save();
      ctx.translate(inv.x, inv.y);
      if (inv.vx < 0) ctx.scale(-1, 1);
      ctx.fillStyle = inv.tint;
      ctx.shadowColor = inv.tint;
      ctx.shadowBlur = inv.kind === "boss" ? 16 : 10;

      const blocks = ALIEN_BODIES[inv.kind];
      for (const [bx, by] of blocks) {
        // Wing flap offset for butterfly / bee
        let ox = bx;
        if ((inv.kind === "butterfly" || inv.kind === "bee") && Math.abs(bx) >= 3) {
          ox = bx + (flap ? Math.sign(bx) : 0);
        }
        ctx.fillRect(ox * s, by * s, s, s);
      }

      ctx.shadowBlur = 0;
      ctx.fillStyle = "#0a0a0a";
      for (const [ex, ey] of ALIEN_EYES[inv.kind]) {
        ctx.fillRect(ex * s, ey * s, s, s);
      }

      // Accent lights on saucer / boss
      if (inv.kind === "saucer" || inv.kind === "boss") {
        ctx.fillStyle = flap ? "#fff7ed" : "#fde68a";
        ctx.globalAlpha = 0.9;
        ctx.fillRect(-s * 0.5, -s * (inv.kind === "boss" ? 3 : 2), s, s);
        ctx.globalAlpha = 1;
      }

      ctx.restore();
    };

    const drawPlanet = (p: DistantPlanet, time: number) => {
      const px = p.baseX + Math.sin(time * p.drift) * 10;
      const grd = ctx.createRadialGradient(px - p.r * 0.3, p.y - p.r * 0.3, p.r * 0.1, px, p.y, p.r);
      grd.addColorStop(0, "#fff7ed");
      grd.addColorStop(0.35, p.color);
      grd.addColorStop(1, "rgba(0,0,0,0.9)");
      ctx.beginPath();
      ctx.arc(px, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = grd;
      ctx.globalAlpha = 0.55;
      ctx.fill();
      if (p.ring) {
        ctx.strokeStyle = "rgba(253,224,71,0.45)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(px, p.y, p.r * 1.55, p.r * 0.45, -0.4, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    };

    const tick = () => {
      t += 1;
      ctx.clearRect(0, 0, w, h);

      // Soft nebula washes
      const nebula = ctx.createRadialGradient(w * 0.2, h * 0.3, 0, w * 0.2, h * 0.3, w * 0.55);
      nebula.addColorStop(0, "rgba(255,95,31,0.18)");
      nebula.addColorStop(0.5, "rgba(56,189,248,0.08)");
      nebula.addColorStop(1, "transparent");
      ctx.fillStyle = nebula;
      ctx.fillRect(0, 0, w, h);

      const nebula2 = ctx.createRadialGradient(w * 0.85, h * 0.7, 0, w * 0.85, h * 0.7, w * 0.5);
      nebula2.addColorStop(0, "rgba(236,72,153,0.14)");
      nebula2.addColorStop(0.55, "rgba(168,85,247,0.06)");
      nebula2.addColorStop(1, "transparent");
      ctx.fillStyle = nebula2;
      ctx.fillRect(0, 0, w, h);

      const nebula3 = ctx.createRadialGradient(w * 0.55, h * 0.15, 0, w * 0.55, h * 0.15, w * 0.4);
      nebula3.addColorStop(0, "rgba(163,230,53,0.08)");
      nebula3.addColorStop(1, "transparent");
      ctx.fillStyle = nebula3;
      ctx.fillRect(0, 0, w, h);

      for (const p of planets) drawPlanet(p, t);

      for (const star of stars) {
        star.x -= star.z * 0.35;
        if (star.x < 0) {
          star.x = w;
          star.y = rand() * h;
        }
        const twinkle = 0.45 + 0.55 * Math.abs(Math.sin(t * 0.03 + star.y));
        ctx.globalAlpha = twinkle;
        ctx.fillStyle = star.c;
        ctx.fillRect(star.x, star.y, star.s, star.s);
      }
      ctx.globalAlpha = 1;

      for (const a of asteroids) {
        a.x += a.vx;
        a.y += a.vy;
        a.rot += a.vr;
        if (a.x < -40) {
          a.x = w + 40;
          a.y = rand() * h;
        }
        drawAsteroid(a);
      }

      for (const inv of invaders) {
        inv.phase += inv.kind === "bee" ? 0.07 : inv.kind === "boss" ? 0.025 : 0.04;
        inv.x += inv.vx;
        inv.y += Math.sin(inv.phase) * inv.bob;
        if (inv.kind === "squid") inv.y += Math.cos(inv.phase * 1.6) * 0.25;
        if (inv.x < -50) inv.x = w + 50;
        if (inv.x > w + 50) inv.x = -50;
        drawInvader(inv, t);
      }

      raf = requestAnimationFrame(tick);
    };

    resize();
    tick();
    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <div className={`absolute inset-0 overflow-hidden ${className}`}>
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 90% 70% at 50% 40%, #141028 0%, #07060f 45%, #030303 100%)",
        }}
      />
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" aria-hidden />
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage: "radial-gradient(ellipse at center, black 30%, transparent 80%)",
        }}
      />
    </div>
  );
}
