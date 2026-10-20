"use client";

import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import type { Facing } from "@/lib/arcade/roster";

/**
 * Arcade floor presence over a Supabase Realtime broadcast channel.
 * Position only (no chat). Each client sends ~10 updates/sec; remote players
 * are rendered INTERP_MS in the past, interpolating between received samples.
 */

export const FLOOR_CHANNEL = "arcade-floor";
export const SEND_MS = 100;
export const INTERP_MS = 100;
const STALE_MS = 5000;
const MAX_SAMPLES = 20;

export type FloorState = {
  id: string;
  name: string;
  character: string;
  x: number;
  y: number;
  facing: Facing;
  moving: boolean;
  /** Game id while this player is inside a cabinet, else null. */
  playing: string | null;
  /** Best score for the game being played (for spectators). */
  best: number;
};

type Sample = { t: number; x: number; y: number; facing: Facing; moving: boolean };
type Remote = { state: FloorState; samples: Sample[]; seen: number };

export type RemoteView = FloorState;

export class FloorPresence {
  private channel: RealtimeChannel | null = null;
  private remotes = new Map<string, Remote>();
  private lastSend = 0;
  private lastKey = "";
  private live = false;

  constructor(private readonly me: { id: string; broadcast: boolean }) {}

  start() {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return;
    try {
      const supabase = createClient();
      const channel = supabase.channel(FLOOR_CHANNEL, { config: { broadcast: { self: false, ack: false } } });
      channel
        .on("broadcast", { event: "pos" }, ({ payload }) => this.receive(payload as FloorState))
        .on("broadcast", { event: "bye" }, ({ payload }) => {
          const id = (payload as { id?: string })?.id;
          if (id) this.remotes.delete(id);
        })
        .subscribe((status) => {
          this.live = status === "SUBSCRIBED";
        });
      this.channel = channel;
    } catch {
      this.channel = null;
    }
  }

  stop() {
    const channel = this.channel;
    this.channel = null;
    if (!channel) return;
    try {
      if (this.live && this.me.broadcast) void channel.send({ type: "broadcast", event: "bye", payload: { id: this.me.id } });
      void channel.unsubscribe();
    } catch {
      /* already gone */
    }
  }

  /** Call every frame; throttles itself to SEND_MS (with a 1s keepalive when idle). */
  send(now: number, state: FloorState) {
    if (!this.channel || !this.live || !this.me.broadcast) return;
    const key = `${Math.round(state.x)},${Math.round(state.y)},${state.facing},${state.moving},${state.playing}`;
    const due = now - this.lastSend >= SEND_MS && (key !== this.lastKey || now - this.lastSend >= 1000);
    if (!due) return;
    this.lastSend = now;
    this.lastKey = key;
    void this.channel.send({ type: "broadcast", event: "pos", payload: state });
  }

  private receive(p: FloorState) {
    if (!p || typeof p.id !== "string" || p.id === this.me.id) return;
    if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) return;
    const now = performance.now();
    const r = this.remotes.get(p.id) ?? { state: p, samples: [], seen: now };
    r.state = {
      ...p,
      name: String(p.name ?? "PLAYER").slice(0, 16),
      character: String(p.character ?? "charlie"),
      best: Number(p.best) || 0,
      playing: p.playing ? String(p.playing) : null,
    };
    r.seen = now;
    r.samples.push({ t: now, x: p.x, y: p.y, facing: p.facing, moving: Boolean(p.moving) });
    if (r.samples.length > MAX_SAMPLES) r.samples.splice(0, r.samples.length - MAX_SAMPLES);
    this.remotes.set(p.id, r);
  }

  /** Remote players as they were INTERP_MS ago. */
  view(now: number): RemoteView[] {
    const out: RemoteView[] = [];
    const at = now - INTERP_MS;
    for (const [id, r] of this.remotes) {
      if (now - r.seen > STALE_MS) {
        this.remotes.delete(id);
        continue;
      }
      const s = r.samples;
      let x = s[s.length - 1].x;
      let y = s[s.length - 1].y;
      let facing = s[s.length - 1].facing;
      let moving = s[s.length - 1].moving && now - r.seen < 400;
      if (s.length > 1 && at < s[s.length - 1].t) {
        let i = s.length - 2;
        while (i > 0 && s[i].t > at) i -= 1;
        const a = s[i];
        const b = s[i + 1];
        const k = b.t > a.t ? Math.max(0, Math.min(1, (at - a.t) / (b.t - a.t))) : 1;
        x = a.x + (b.x - a.x) * k;
        y = a.y + (b.y - a.y) * k;
        facing = k < 0.5 ? a.facing : b.facing;
        moving = a.moving || b.moving;
      }
      out.push({ ...r.state, x, y, facing, moving });
    }
    return out;
  }
}
