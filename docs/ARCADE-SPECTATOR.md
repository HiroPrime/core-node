# Arcade spectator mode: design (phase 1 = stub only)

_Status: design. Phase 1 ships only the UI stub on branch `arcade-online`._

## What exists now (stub)
- Each client on the floor broadcasts `playing: <gameId> | null` and `best` (its best score for that game) on the Realtime channel `arcade-floor`.
- When you stand at a machine someone else is playing, a **WATCH <NAME>** button appears. Clicking it opens a small corner window (not fullscreen) with the player's name, the game, their high score and a "LIVE VIEW COMING SOON" area.
- No video is sent anywhere yet.

## Goal
One player plays, and at most one nearby viewer (expected) watches a live video of their game in that small window, with low latency (under 1 s) and very low cost, given low expected player counts.

## Source of the video
Every game renders into one `<canvas>`. `canvas.captureStream(30)` gives a `MediaStream` with no extra rendering work and leaves the games unchanged. Cap it at 30 fps and 540p (canvas is DPR-scaled; downscale through an offscreen canvas if needed).

## Options

### A. Peer-to-peer WebRTC, signalled over Supabase Realtime (recommended first)
- Viewer clicks WATCH and sends `spectate-request {to}` on a private per-pair broadcast channel (`arcade-spectate:<playerId>`).
- Player's client creates an `RTCPeerConnection`, adds the `captureStream` track, and exchanges offer/answer/ICE over that channel.
- STUN: public Google/Cloudflare STUN. TURN: needed for roughly 10-20% of networks (symmetric NAT). Use Cloudflare Calls TURN or a small coturn box; credentials minted by a Next.js route (`/api/arcade/turn`) for signed-in users only.
- Cost: about zero without TURN. Latency: about 150-400 ms.
- Downside: the player uploads the stream (fine for 1 viewer, about 1-2 Mbps), and there's no server-side recording.
- Not truly "server-side". It's the cheapest path to a working live view; the next option is the server-side upgrade.

### B. SFU (LiveKit Cloud or self-hosted LiveKit), the "server-side stream"
- Player publishes the `captureStream` track to a LiveKit room `arcade:<playerId>` and viewers subscribe. The server relays it, so the player uploads once no matter how many people watch.
- Token route: `POST /api/arcade/livekit-token` (signed-in, server-side `LIVEKIT_API_KEY/SECRET`). The player gets `canPublish`, viewers get `canSubscribe` only.
- Start publishing lazily, only when a viewer requests it (same Realtime request message), and stop after 30 s with no viewers.
- LiveKit Cloud's free tier covers this scale. Optional egress recording later.
- Latency: about 200-500 ms. Handles NAT/TURN for us.

### C. Canvas frame relay over WebSocket (not recommended)
- Send `toBlob('image/webp')` frames at 10 fps through Realtime broadcast or a WS server.
- Simple, but heavy (about 0.5-1.5 MB/s) and choppy, and Realtime message limits make it a poor fit. Only worth it as a debug fallback.

## Recommendation
1. Phase 2: **Option A** (P2P + Supabase signalling + Cloudflare TURN fallback). It reuses the existing `arcade-floor` presence for discovery.
2. If viewers per player grow beyond 1-2, or recording or moderation is wanted: move publishing to **Option B (LiveKit)**. The client API (`startPublishing(stream)` / `watch(playerId)`) stays the same.

## Privacy and safety
- Only signed-in players can be watched. Add a per-player "allow spectators" toggle (default on) stored in `arcade_players`.
- The video only, no audio and no chat (matches the "no chat" rule).
- The player sees a small "1 WATCHING" badge while streaming.

## Work items for phase 2
- `src/lib/arcade/spectate.ts` (signalling + RTCPeerConnection), `/api/arcade/turn`.
- Hook `captureStream` from each game's canvas through a ref passed by `ArcadeGame`.
- Replace the "LIVE VIEW COMING SOON" box with a `<video autoPlay muted playsInline>`.
