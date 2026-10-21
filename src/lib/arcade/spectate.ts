"use client";

import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";

/**
 * Arcade live spectating, phase 1: peer-to-peer WebRTC.
 *
 *   player canvas -> canvas.captureStream(30) -> one RTCPeerConnection per viewer
 *   signalling: Supabase Realtime broadcast on `spectate:<player_user_id>`
 *   live meta (score, game): RTCDataChannel "meta"
 *
 * STUN only (no TURN): some strict / symmetric NATs will fail to connect.
 * Phase 2 is an SFU (LiveKit), see docs/ARCADE-SPECTATOR.md.
 */

export const SPECTATE_ENABLED = process.env.NEXT_PUBLIC_ARCADE_SPECTATE !== "0" && process.env.NEXT_PUBLIC_ARCADE_SPECTATE !== "false";
export const MAX_VIEWERS = 3;
const ICE: RTCConfiguration = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };
const FPS = 30;
const META_MS = 500;
const JOIN_TIMEOUT_MS = 12000;

export const spectateChannel = (playerId: string) => `spectate:${playerId}`;

type Msg =
  | { kind: "join"; from: string }
  | { kind: "leave"; from: string }
  | { kind: "offer"; to: string; sdp: RTCSessionDescriptionInit }
  | { kind: "answer"; from: string; sdp: RTCSessionDescriptionInit }
  | { kind: "ice"; to?: string; from?: string; candidate: RTCIceCandidateInit }
  | { kind: "full"; to: string }
  | { kind: "unavailable"; to: string }
  | { kind: "ended" };

export type SpectateMeta = { score: number; game: string };

const canRtc = () => typeof window !== "undefined" && "RTCPeerConnection" in window;

function send(channel: RealtimeChannel, msg: Msg) {
  void channel.send({ type: "broadcast", event: "sig", payload: msg });
}

/* ------------------------------------------------------------------ */
/* Player side                                                         */
/* ------------------------------------------------------------------ */

type Peer = { pc: RTCPeerConnection; dc: RTCDataChannel | null };

export class SpectateHost {
  private channel: RealtimeChannel | null = null;
  private peers = new Map<string, Peer>();
  private stream: MediaStream | null = null;
  private metaTimer = 0;
  private closed = false;

  constructor(
    private readonly supabase: SupabaseClient,
    private readonly playerId: string,
    private readonly getCanvas: () => HTMLCanvasElement | null,
    private readonly getMeta: () => SpectateMeta,
  ) {}

  start() {
    if (!SPECTATE_ENABLED || !canRtc()) return;
    const channel = this.supabase.channel(spectateChannel(this.playerId), { config: { broadcast: { self: false } } });
    channel.on("broadcast", { event: "sig" }, ({ payload }) => void this.onMsg(payload as Msg)).subscribe();
    this.channel = channel;
  }

  /** Game over / left the cabinet: tell viewers and tear everything down. */
  stop() {
    if (this.closed) return;
    this.closed = true;
    if (this.channel) send(this.channel, { kind: "ended" });
    [...this.peers.keys()].forEach((id) => this.drop(id));
    this.stopStream();
    const ch = this.channel;
    this.channel = null;
    if (ch) window.setTimeout(() => void this.supabase.removeChannel(ch), 300);
  }

  private ensureStream(): MediaStream | null {
    if (this.stream) return this.stream;
    const canvas = this.getCanvas();
    if (!canvas || typeof canvas.captureStream !== "function") return null;
    this.stream = canvas.captureStream(FPS);
    return this.stream;
  }

  private stopStream() {
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    window.clearInterval(this.metaTimer);
    this.metaTimer = 0;
  }

  private drop(id: string) {
    const peer = this.peers.get(id);
    if (!peer) return;
    this.peers.delete(id);
    try {
      peer.dc?.close();
      peer.pc.close();
    } catch {
      /* already closed */
    }
    // Encode only while someone is watching.
    if (this.peers.size === 0) this.stopStream();
  }

  private tickMeta = () => {
    const meta = JSON.stringify(this.getMeta());
    this.peers.forEach((p) => {
      if (p.dc?.readyState === "open") p.dc.send(meta);
    });
  };

  private async onMsg(msg: Msg) {
    const ch = this.channel;
    if (!ch || this.closed || !msg) return;
    if (msg.kind === "join") {
      const viewer = String(msg.from || "");
      if (!viewer) return;
      if (this.peers.has(viewer)) this.drop(viewer);
      if (this.peers.size >= MAX_VIEWERS) return send(ch, { kind: "full", to: viewer });
      const stream = this.ensureStream();
      if (!stream) return send(ch, { kind: "unavailable", to: viewer });
      const pc = new RTCPeerConnection(ICE);
      const dc = pc.createDataChannel("meta");
      const peer: Peer = { pc, dc };
      this.peers.set(viewer, peer);
      stream.getVideoTracks().forEach((t) => pc.addTrack(t, stream));
      // Keep bitrate modest: a small corner window doesn't need more.
      pc.getSenders().forEach((s) => {
        const p = s.getParameters();
        if (!p.encodings || !p.encodings.length) p.encodings = [{}];
        p.encodings[0].maxBitrate = 1_200_000;
        p.encodings[0].maxFramerate = FPS;
        // Send ~540p no matter how big the (DPR-scaled) canvas is.
        const h = this.getCanvas()?.height ?? 540;
        p.encodings[0].scaleResolutionDownBy = Math.max(1, h / 540);
        void s.setParameters(p).catch(() => undefined);
      });
      pc.onicecandidate = (e) => {
        if (e.candidate) send(ch, { kind: "ice", to: viewer, candidate: e.candidate.toJSON() });
      };
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "failed" || pc.connectionState === "closed") this.drop(viewer);
      };
      dc.onopen = this.tickMeta;
      if (!this.metaTimer) this.metaTimer = window.setInterval(this.tickMeta, META_MS);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      send(ch, { kind: "offer", to: viewer, sdp: pc.localDescription!.toJSON() });
    } else if (msg.kind === "answer") {
      const peer = this.peers.get(String(msg.from));
      if (peer && peer.pc.signalingState === "have-local-offer") {
        await peer.pc.setRemoteDescription(msg.sdp).catch(() => this.drop(String(msg.from)));
      }
    } else if (msg.kind === "ice" && msg.from) {
      const peer = this.peers.get(msg.from);
      if (peer) await peer.pc.addIceCandidate(msg.candidate).catch(() => undefined);
    } else if (msg.kind === "leave") {
      this.drop(String(msg.from));
    }
  }
}

/* ------------------------------------------------------------------ */
/* Viewer side                                                         */
/* ------------------------------------------------------------------ */

export type ViewState = "connecting" | "live" | "ended" | "unavailable" | "full";

export class SpectateViewer {
  private channel: RealtimeChannel | null = null;
  private pc: RTCPeerConnection | null = null;
  private pendingIce: RTCIceCandidateInit[] = [];
  private timer = 0;
  private closed = false;

  constructor(
    private readonly supabase: SupabaseClient,
    private readonly playerId: string,
    private readonly viewerId: string,
    private readonly on: {
      state: (s: ViewState) => void;
      stream: (s: MediaStream) => void;
      meta: (m: SpectateMeta) => void;
    },
  ) {}

  start() {
    if (!SPECTATE_ENABLED || !canRtc()) {
      this.on.state("unavailable");
      return;
    }
    this.on.state("connecting");
    const channel = this.supabase.channel(spectateChannel(this.playerId), { config: { broadcast: { self: false } } });
    channel
      .on("broadcast", { event: "sig" }, ({ payload }) => void this.onMsg(payload as Msg))
      .subscribe((status) => {
        if (status === "SUBSCRIBED") send(channel, { kind: "join", from: this.viewerId });
        else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") this.finish("unavailable");
      });
    this.channel = channel;
    this.timer = window.setTimeout(() => {
      if (!this.pc || this.pc.connectionState !== "connected") this.finish("unavailable");
    }, JOIN_TIMEOUT_MS);
  }

  /** Back to arcade: tell the player and tear down. */
  close() {
    if (this.closed) return;
    if (this.channel) send(this.channel, { kind: "leave", from: this.viewerId });
    this.teardown();
  }

  private teardown() {
    this.closed = true;
    window.clearTimeout(this.timer);
    try {
      this.pc?.close();
    } catch {
      /* closed */
    }
    this.pc = null;
    const ch = this.channel;
    this.channel = null;
    if (ch) window.setTimeout(() => void this.supabase.removeChannel(ch), 300);
  }

  private finish(s: ViewState) {
    if (this.closed) return;
    this.on.state(s);
    this.close();
  }

  private async onMsg(msg: Msg) {
    const ch = this.channel;
    if (!ch || this.closed || !msg) return;
    if (msg.kind === "full" && msg.to === this.viewerId) return this.finish("full");
    if (msg.kind === "unavailable" && msg.to === this.viewerId) return this.finish("unavailable");
    if (msg.kind === "ended") return this.finish("ended");
    if (msg.kind === "offer" && msg.to === this.viewerId) {
      this.pc?.close();
      const pc = new RTCPeerConnection(ICE);
      this.pc = pc;
      pc.ontrack = (e) => {
        const stream = e.streams[0] ?? new MediaStream([e.track]);
        this.on.stream(stream);
      };
      pc.ondatachannel = (e) => {
        e.channel.onmessage = (m) => {
          try {
            const meta = JSON.parse(String(m.data)) as SpectateMeta;
            this.on.meta({ score: Number(meta.score) || 0, game: String(meta.game || "") });
          } catch {
            /* ignore */
          }
        };
      };
      pc.onicecandidate = (e) => {
        if (e.candidate) send(ch, { kind: "ice", from: this.viewerId, candidate: e.candidate.toJSON() });
      };
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "connected") {
          window.clearTimeout(this.timer);
          this.on.state("live");
        } else if (pc.connectionState === "failed") this.finish("unavailable");
        else if (pc.connectionState === "disconnected") {
          window.setTimeout(() => {
            if (pc.connectionState === "disconnected") this.finish("ended");
          }, 4000);
        }
      };
      await pc.setRemoteDescription(msg.sdp);
      for (const c of this.pendingIce.splice(0)) await pc.addIceCandidate(c).catch(() => undefined);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      send(ch, { kind: "answer", from: this.viewerId, sdp: pc.localDescription!.toJSON() });
    } else if (msg.kind === "ice" && msg.to === this.viewerId) {
      if (this.pc?.remoteDescription) await this.pc.addIceCandidate(msg.candidate).catch(() => undefined);
      else this.pendingIce.push(msg.candidate);
    }
  }
}
