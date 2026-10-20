"use client";

import { useEffect, useRef, useState } from "react";
import { AquaticRush } from "@/components/AquaticRush";
import { NeonChase } from "@/components/NeonChase";
import { VoidBeast } from "@/components/VoidBeast";

/**
 * ArcadeGame — the house arcade floor.
 *
 * Charlie walks a carpeted floor past every cabinet from the sprite sheet.
 * NEON CHASE, VOID BEAST, and AQUATIC RUSH are switched on: step up,
 * press E, and that cabinet's start screen comes up with 1 CREDIT and PLAY.
 *
 * Her walk6 pack is the 6-frame 35x64 walk (brawler-v2 idle), drawn at 3x. The floor is
 * bigger than the screen. The camera follows her, and zooms out as the
 * window shrinks so a phone still shows a wide slice of the arcade.
 * Tap the carpet to walk. Tap a machine to walk up to it.
 */

type Facing = "left" | "right" | "up" | "down";

type CabinetSpec = {
  id: string;
  name: string;
  playable?: boolean;
  glow: string;
};

type Cabinet = CabinetSpec & {
  x: number;
  y: number;
  w: number;
  h: number;
  img: HTMLImageElement;
};

const MOVE_KEYS = ["KeyW", "KeyA", "KeyS", "KeyD"];
const SPEED = 290;
const DEPTH_SPEED = 0.72;
const SCALE = 3;
const BOX_W = 48;
const BOX_H = 64;
const CHARLIE = "/charlie/brawler-v2/";
const CHARLIE_WALK = "/charlie/walk6/";
const SPRITE_REV = "p9";
const sprite = (name: string) => `${CHARLIE}${name}?v=${SPRITE_REV}`;
const walkSprite = (name: string) => `${CHARLIE_WALK}${name}?v=${SPRITE_REV}`;
const SPRITES: Record<Facing, string> = {
  left: walkSprite("left-1.png"),
  right: walkSprite("right-1.png"),
  up: walkSprite("up-1.png"),
  down: walkSprite("down-1.png"),
};
const IDLE: Record<Facing, string[]> = {
  left: [sprite("left-idle-1.png")],
  right: [sprite("right-idle-1.png")],
  up: [sprite("up-idle-1.png")],
  down: [sprite("down-idle-1.png")],
};
const IDLE_MS = 200;

const walkFrames = (direction: Facing, count: number) =>
  Array.from({ length: count }, (_, index) => walkSprite(`${direction}-${index + 1}.png`));
const WALK: Record<Facing, string[]> = {
  left: walkFrames("left", 6),
  right: walkFrames("right", 6),
  up: walkFrames("up", 6),
  down: walkFrames("down", 6),
};
const WALK_MS = 130;

const CABINET_H = 300;
const CABINET_GAP = 52;
const FLOOR_FRONT = 780;
const CARPET = "/arcade-bk/Gemini_Generated_Image_kdli4mkdli4mkdli.jpg";
const CARPET_SCALE = 0.42;
/** Window span (px) where the camera is at its closest. Smaller than this zooms out. */
const ZOOM_SPAN = 840;
const ZOOM_MIN = 0.32;
const ZOOM_CLOSE = 1.25;
type GameId = "neon-chase" | "void-beast" | "aquatic-rush";

const ATTRACT: Record<GameId, { src: string; mobile: string; title: string }> = {
  "neon-chase": {
    src: "/arcade-bk/start.jpg",
    mobile: "/arcade-bk/startmobile.jpg",
    title: "NEON CHASE",
  },
  "void-beast": {
    src: "/arcade-bk/Void%20Beast/start.jpg",
    mobile: "/arcade-bk/Void%20Beast/startmobile.jpg",
    title: "VOID BEAST",
  },
  "aquatic-rush": {
    src: "/arcade-bk/Aquatic%20Rush/start.jpg",
    mobile: "/arcade-bk/Aquatic%20Rush/startmobile.jpg",
    title: "AQUATIC RUSH",
  },
};

function EdgeBack({ onBack }: { onBack: () => void }) {
  const origin = useRef<{ x: number; y: number } | null>(null);
  return (
    <div
      className="arcade-back-edge"
      aria-hidden
      onPointerDown={(e) => {
        if (e.pointerType === "mouse" && e.button !== 0) return;
        origin.current = { x: e.clientX, y: e.clientY };
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
          /* a real finger still ends on pointerup */
        }
      }}
      onPointerUp={(e) => {
        if (!origin.current) return;
        const dx = e.clientX - origin.current.x;
        const dy = e.clientY - origin.current.y;
        origin.current = null;
        if (dx >= 64 && Math.abs(dx) > Math.abs(dy)) onBack();
      }}
      onPointerCancel={() => {
        origin.current = null;
      }}
    />
  );
}

const CABINETS: CabinetSpec[] = [
  { id: "neon-chase", name: "NEON CHASE", playable: true, glow: "#ff4ad2" },
  { id: "void-beast", name: "VOID BEAST", playable: true, glow: "#9b5cff" },
  { id: "aquatic-rush", name: "AQUATIC RUSH", playable: true, glow: "#3d8bff" },
  { id: "kakariko-chronicles", name: "KAKARIKO CHRONICLES", glow: "#ff4ad2" },
  { id: "dungeon-delve", name: "DUNGEON DELVE", glow: "#3dff8a" },
  { id: "spin-ball", name: "SPIN-BALL", glow: "#ffe14a" },
  { id: "mecha-force", name: "MECHA FORCE", glow: "#3df0ff" },
  { id: "tomb-crusade", name: "TOMB CRUSADE", glow: "#ff5a3d" },
  { id: "fast-food-fight", name: "FAST FOOD FIGHT", glow: "#ff8a3d" },
  { id: "steel-samurai", name: "STEEL SAMURAI", glow: "#d7e2ee" },
];

export function ArcadeGame() {
  const shellRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const playRef = useRef<HTMLButtonElement | null>(null);
  const [playing, setPlayingState] = useState(false);
  const [racing, setRacingState] = useState(false);
  const playingRef = useRef(false);
  const racingRef = useRef(false);
  const setPlaying = (on: boolean) => {
    playingRef.current = on;
    setPlayingState(on);
  };
  const setRacing = (on: boolean) => {
    racingRef.current = on;
    setRacingState(on);
  };
  const [cabinet, setCabinet] = useState<GameId>("neon-chase");
  const [portrait, setPortrait] = useState(false);
  const openRef = useRef<(id: string) => void>(() => {});
  const bootRef = useRef<(id: GameId) => void>(() => {});
  const depthRef = useRef(0);
  const backRef = useRef<() => void>(() => {});
  /** One extra history entry so the phone's back button stays on the arcade floor. */
  const rememberFloor = () => {
    if (depthRef.current > 0) return;
    history.pushState({ arcade: "floor" }, "");
    depthRef.current = 1;
  };
  openRef.current = (id: string) => {
    if (id !== "neon-chase" && id !== "void-beast" && id !== "aquatic-rush") return;
    setCabinet(id);
    setPlaying(true);
    rememberFloor();
  };
  bootRef.current = (id: GameId) => {
    setCabinet(id);
    setPlaying(false);
    setRacing(true);
    rememberFloor();
  };
  const startRace = () => {
    setPlaying(false);
    setRacing(true);
    rememberFloor();
  };
  const backOut = () => {
    if (racingRef.current) {
      setRacing(false);
      setPlaying(true);
    } else if (playingRef.current) {
      if (depthRef.current > 0) history.back();
      else setPlaying(false);
    }
  };
  backRef.current = backOut;

  useEffect(() => {
    const onPop = () => {
      if (depthRef.current <= 0) return;
      depthRef.current -= 1;
      setRacing(false);
      setPlaying(false);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  useEffect(() => {
    if (playing) playRef.current?.focus();
  }, [playing]);

  useEffect(() => {
    const read = () => setPortrait(window.innerWidth < 900 && window.innerHeight > window.innerWidth);
    read();
    window.addEventListener("resize", read);
    return () => window.removeEventListener("resize", read);
  }, []);

  useEffect(() => {
    const shell = shellRef.current;
    const canvas = canvasRef.current;
    if (!shell || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const held = new Set<string>();
    const qa = new URLSearchParams(window.location.search).get("qa");
    let nearId: string | null = null;

    const player = { x: BOX_W, y: BOX_H };
    let facing: Facing = "down";

    const imgs: Partial<Record<Facing, HTMLImageElement>> = {};
    (Object.keys(SPRITES) as Facing[]).forEach((dir) => {
      const im = new Image();
      im.onload = () => {
        imgs[dir] = im;
      };
      im.src = SPRITES[dir];
    });

    const loadLoops = (set: Record<Facing, string[]>) => {
      const out: Partial<Record<Facing, HTMLImageElement[]>> = {};
      (Object.keys(set) as Facing[]).forEach((dir) => {
        const loop: HTMLImageElement[] = [];
        set[dir].forEach((src, i) => {
          const im = new Image();
          im.onload = () => {
            loop[i] = im;
          };
          im.src = src;
        });
        out[dir] = loop;
      });
      return out;
    };
    const idleImgs = loadLoops(IDLE);
    const walkImgs = loadLoops(WALK);

    let carpet: HTMLImageElement | null = null;
    const cabinetImgs = new Map<string, HTMLImageElement>();
    let cabinets: Cabinet[] = [];
    let worldW = 1600;
    let worldH = 1200;
    let laidOut = false;
    let assetsLeft = CABINETS.length + 1;

    const displayFamily = (() => {
      const v = getComputedStyle(document.documentElement)
        .getPropertyValue("--font-display")
        .trim();
      return v || "Outfit, sans-serif";
    })();

    const layout = () => {
      if (laidOut || cabinetImgs.size < CABINETS.length) return;
      const sized = CABINETS.map((spec) => {
        const img = cabinetImgs.get(spec.id)!;
        const h = CABINET_H;
        const w = Math.round(img.width * (h / img.height));
        return { ...spec, img, w, h, x: 0, y: 0 };
      });
      const rowW = sized.reduce((sum, c) => sum + c.w, 0) + CABINET_GAP * (sized.length - 1);
      worldW = rowW + 360;
      worldH = 64 + CABINET_H + FLOOR_FRONT;
      let x = 180;
      const y = 64;
      sized.forEach((c) => {
        c.x = x;
        c.y = y;
        x += c.w + CABINET_GAP;
      });
      cabinets = sized;
      const neon = sized[0];
      player.x = neon.x + neon.w / 2 - BOX_W / 2;
      player.y = neon.y + neon.h + (qa === "near" ? 10 : 90);
      laidOut = true;
      if (qa === "race") bootRef.current("neon-chase");
      else if (qa === "beast") bootRef.current("void-beast");
      else if (qa === "rush") bootRef.current("aquatic-rush");
      else if (qa === "play") openRef.current("neon-chase");
      else if (qa === "vplay") openRef.current("void-beast");
      else if (qa === "aplay") openRef.current("aquatic-rush");
    };

    const assetReady = () => {
      assetsLeft -= 1;
      if (assetsLeft <= 0) layout();
    };

    {
      const im = new Image();
      im.onload = () => {
        carpet = im;
        assetReady();
      };
      im.src = CARPET;
    }
    CABINETS.forEach((spec) => {
      const im = new Image();
      im.onload = () => {
        cabinetImgs.set(spec.id, im);
        assetReady();
      };
      im.src = `/arcade/cabinets/${spec.id}.png`;
    });

    let w = 0;
    let h = 0;
    let dpr = 1;
    let camX = 0;
    let camY = 0;
    let zoom = 1;
    let goal: { x: number; y: number; play: boolean } | null = null;
    let raf = 0;
    let last = performance.now();
    let animationStartedAt = last;
    let animationKey = "idle:down";

    const resize = () => {
      w = shell.clientWidth;
      h = shell.clientHeight;
      if (w < 1 || h < 1) {
        w = 0;
        h = 0;
        return;
      }
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.imageSmoothingEnabled = false;
    };

    const blocked = (x: number, y: number) => {
      const left = x + 8;
      const right = x + BOX_W - 8;
      const top = y + 16;
      const bot = y + BOX_H;
      return cabinets.some((c) => {
        const baseTop = c.y + c.h * 0.58;
        const baseBot = c.y + c.h - 2;
        const baseLeft = c.x + c.w * 0.1;
        const baseRight = c.x + c.w * 0.9;
        return right > baseLeft && left < baseRight && bot > baseTop && top < baseBot;
      });
    };

    const approached = (c: Cabinet) => {
      const px = player.x + BOX_W / 2;
      const feet = player.y + BOX_H;
      const front = c.y + c.h;
      return Math.abs(px - (c.x + c.w / 2)) < c.w * 0.62 && feet > front - 6 && feet < front + 170;
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (racingRef.current) {
        held.clear();
        return;
      }
      if (playingRef.current) {
        if (e.code === "Enter" || e.code === "Space") {
          e.preventDefault();
          startRace();
        } else if (e.code === "Escape" || e.code === "KeyE") {
          backRef.current();
        }
        held.clear();
        return;
      }
      if (e.code === "KeyE" || e.code === "Enter") {
        if (nearId) {
          held.clear();
          goal = null;
          openRef.current(nearId);
        }
        return;
      }
      if (MOVE_KEYS.includes(e.code)) {
        e.preventDefault();
        goal = null;
        held.add(e.code);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      held.delete(e.code);
    };
    const onBlur = () => held.clear();

    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      if (w === 0) resize();

      if (w > 0) {
        let dx = 0;
        let dy = 0;
        if (!playingRef.current && laidOut) {
          if (held.has("KeyW")) dy -= 1;
          if (held.has("KeyS")) dy += 1;
          if (held.has("KeyA")) dx -= 1;
          if (held.has("KeyD")) dx += 1;
        }
        if (dx !== 0 || dy !== 0) {
          goal = null;
          if (dx !== 0 && dy !== 0) {
            dx *= Math.SQRT1_2;
            dy *= Math.SQRT1_2;
          }
        } else if (goal && laidOut && !playingRef.current) {
          const tx = goal.x - player.x;
          const ty = goal.y - player.y;
          const dist = Math.hypot(tx, ty);
          if (dist < 6) {
            if (!blocked(goal.x, player.y)) player.x = goal.x;
            if (!blocked(player.x, goal.y)) player.y = goal.y;
            const play = goal.play;
            goal = null;
            const here = cabinets.find((c) => c.playable && approached(c));
            if (play && here) openRef.current(here.id);
          } else {
            dx = tx / dist;
            dy = ty / dist;
          }
        }

        const prevX = player.x;
        const prevY = player.y;
        if (laidOut) {
          const nx = Math.max(0, Math.min(worldW - BOX_W, player.x + dx * SPEED * dt));
          const ny = Math.max(0, Math.min(worldH - BOX_H, player.y + dy * SPEED * DEPTH_SPEED * dt));
          if (!blocked(nx, player.y)) player.x = nx;
          if (!blocked(player.x, ny)) player.y = ny;
        }

        const movedX = player.x - prevX;
        const movedY = player.y - prevY;
        if (Math.abs(movedX) > Math.abs(movedY)) facing = movedX > 0 ? "right" : "left";
        else if (movedY < 0) facing = "up";
        else if (movedY > 0) facing = "down";

        const span = Math.min(w, h * 1.35);
        zoom = Math.max(ZOOM_MIN, Math.min(1, span / ZOOM_SPAN)) * ZOOM_CLOSE;
        const viewW = w / zoom;
        const viewH = h / zoom;
        camX =
          worldW <= viewW
            ? (worldW - viewW) / 2
            : Math.max(0, Math.min(worldW - viewW, player.x + BOX_W / 2 - viewW / 2));
        camY =
          worldH <= viewH
            ? (worldH - viewH) / 2
            : Math.max(0, Math.min(worldH - viewH, player.y + BOX_H / 2 - viewH / 2));

        ctx.setTransform(dpr * zoom, 0, 0, dpr * zoom, 0, 0);
        ctx.fillStyle = "#070714";
        ctx.fillRect(0, 0, viewW, viewH);

        if (carpet) {
          ctx.imageSmoothingEnabled = true;
          const tw = carpet.width * CARPET_SCALE;
          const th = carpet.height * CARPET_SCALE;
          const x0 = Math.floor(camX / tw) * tw;
          const y0 = Math.floor(camY / th) * th;
          for (let y = y0; y < camY + viewH + th; y += th) {
            for (let x = x0; x < camX + viewW + tw; x += tw) {
              ctx.drawImage(carpet, Math.round(x - camX), Math.round(y - camY), Math.ceil(tw) + 1, Math.ceil(th) + 1);
            }
          }
          ctx.imageSmoothingEnabled = false;
          ctx.fillStyle = "rgba(18, 0, 32, 0.28)";
          ctx.fillRect(0, 0, viewW, viewH);
        }

        let spriteFrame = imgs[facing] ?? imgs.down;
        const walkLoop = walkImgs[facing];
        const idleLoop = idleImgs[facing];
        const moving = dx !== 0 || dy !== 0;
        const nextAnimationKey = `${moving ? "walk" : "idle"}:${facing}`;
        if (nextAnimationKey !== animationKey) {
          animationKey = nextAnimationKey;
          animationStartedAt = now;
        }
        const animationTime = now - animationStartedAt;
        if (moving) {
          spriteFrame =
            (walkLoop && walkLoop.length
              ? walkLoop[Math.floor(animationTime / WALK_MS) % walkLoop.length]
              : undefined) ?? spriteFrame;
        } else if (idleLoop && idleLoop.length) {
          spriteFrame = idleLoop[Math.floor(animationTime / IDLE_MS) % idleLoop.length] ?? spriteFrame;
        }

        const close = laidOut ? cabinets.find(approached) ?? null : null;
        nearId = close?.playable ? close.id : null;

        const drawPlayer = () => {
          if (!spriteFrame) {
            ctx.fillStyle = "#fff";
            ctx.fillRect(Math.round(player.x - camX), Math.round(player.y - camY), BOX_W, BOX_H);
            return;
          }
          const sw = spriteFrame.width * SCALE;
          const sh = spriteFrame.height * SCALE;
          const sx = Math.round(player.x + (BOX_W - sw) / 2 - camX);
          const sy = Math.round(player.y + BOX_H - sh - camY);
          ctx.drawImage(spriteFrame, sx, sy, sw, sh);
        };

        const order: { foot: number; draw: () => void }[] = cabinets.map((c) => ({
          foot: c.y + c.h,
          draw: () => {
            const x = Math.round(c.x - camX);
            const y = Math.round(c.y - camY);
            ctx.save();
            ctx.shadowColor = c.glow;
            ctx.shadowBlur = 20 / zoom;
            ctx.drawImage(c.img, x, y, c.w, c.h);
            ctx.restore();
            ctx.drawImage(c.img, x, y, c.w, c.h);
          },
        }));
        order.push({ foot: player.y + BOX_H, draw: drawPlayer });
        order.sort((a, b) => a.foot - b.foot);
        order.forEach((item) => item.draw());

        if (close && !playingRef.current) {
          ctx.save();
          const label = close.playable ? "PLAY" : close.name;
          const screenPx = w < 900 ? 20 : 26;
          let namePx = screenPx;
          const applyName = (px: number) => {
            ctx.font = `700 ${px / zoom}px ${displayFamily}`;
          };
          applyName(namePx);
          while (namePx > 16 && ctx.measureText(label).width * zoom > w - 36) {
            namePx -= 1;
            applyName(namePx);
          }
          const textW = ctx.measureText(label).width;
          const padX = 12 / zoom;
          const padY = 7 / zoom;
          const boxW = textW + padX * 2;
          const boxH = namePx / zoom + padY * 2;
          const cx = Math.round(player.x + BOX_W / 2 - camX);
          const head = spriteFrame ? player.y + BOX_H - spriteFrame.height * SCALE : player.y;
          const top = Math.round(head - camY - boxH - 8 / zoom);
          ctx.fillStyle = "rgba(6, 4, 16, 0.9)";
          ctx.beginPath();
          ctx.roundRect(cx - boxW / 2, top, boxW, boxH, 8 / zoom);
          ctx.fill();
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillStyle = "#fff6c2";
          ctx.fillText(label, cx, top + boxH / 2);
          ctx.restore();
        }
      }

      raf = requestAnimationFrame(tick);
    };

    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      if (playingRef.current || racingRef.current || !laidOut || w < 1 || zoom <= 0) return;
      const rect = canvas.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) return;
      const sx = ((e.clientX - rect.left) / rect.width) * w;
      const sy = ((e.clientY - rect.top) / rect.height) * h;
      const wx = sx / zoom + camX;
      const wy = sy / zoom + camY;
      const hit = [...cabinets].reverse().find(
        (c) => wx >= c.x && wx <= c.x + c.w && wy >= c.y && wy <= c.y + c.h,
      );
      if (hit) {
        if (hit.playable && approached(hit)) {
          goal = null;
          held.clear();
          openRef.current(hit.id);
          return;
        }
        goal = {
          x: Math.max(0, Math.min(worldW - BOX_W, hit.x + hit.w / 2 - BOX_W / 2)),
          y: Math.max(0, Math.min(worldH - BOX_H, hit.y + hit.h + 48 - BOX_H)),
          play: Boolean(hit.playable),
        };
        return;
      }
      let gx = Math.max(0, Math.min(worldW - BOX_W, wx - BOX_W / 2));
      let gy = Math.max(0, Math.min(worldH - BOX_H, wy - BOX_H));
      for (let i = 0; i < 6 && blocked(gx, gy); i += 1) gy = Math.min(worldH - BOX_H, gy + 28);
      if (blocked(gx, gy)) return;
      goal = { x: gx, y: gy, play: false };
    };

    resize();
    raf = requestAnimationFrame(tick);
    window.addEventListener("resize", resize);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    canvas.addEventListener("pointerdown", onPointerDown);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      canvas.removeEventListener("pointerdown", onPointerDown);
    };
  }, []);

  return (
    <div ref={shellRef} className="game-shell">
      <canvas
        ref={canvasRef}
        className="game-canvas"
        aria-label="Arcade. Tap the floor to walk Charlie. Tap a machine to play. WASD and E still work."
      />
      {racing && cabinet === "neon-chase" && (
        <NeonChase onExit={() => { setRacing(false); setPlaying(true); }} />
      )}
      {racing && cabinet === "void-beast" && (
        <VoidBeast onExit={() => { setRacing(false); setPlaying(true); }} />
      )}
      {racing && cabinet === "aquatic-rush" && (
        <AquaticRush onExit={() => { setRacing(false); setPlaying(true); }} />
      )}
      {(playing || racing) && <EdgeBack onBack={backOut} />}
      {playing && !racing && (
        <div className="game-overlay" role="dialog" aria-label={ATTRACT[cabinet].title}>
          <button type="button" className="neon-close" onClick={backOut} aria-label="Close">
            X
          </button>
          <div className="neon-frame">
            {/* eslint-disable-next-line @next/next/no-img-element -- a static local attract screen on a full-bleed dialog */}
            <img
              src={portrait ? ATTRACT[cabinet].mobile : ATTRACT[cabinet].src}
              alt={ATTRACT[cabinet].title}
            />
            <div className="neon-ready">
              <p className="neon-credit">1 CREDIT</p>
              <button ref={playRef} type="button" className="neon-play" onClick={startRace}>
                PLAY
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ArcadeGame;
