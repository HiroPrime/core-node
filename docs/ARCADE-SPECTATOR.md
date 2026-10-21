# Arcade spectator mode: design (phase 1 = stub only)

_Status: phase 1 (peer-to-peer WebRTC) is built on branch `arcade-online`. Phase 2 (LiveKit SFU and TURN) is still design._

## What's built (phase 1)
- **Flag:** `NEXT_PUBLIC_ARCADE_SPECTATE`. It's on when unset; set it to `0` or `false` to disable both sides.
- **Discovery:** the existing `arcade-floor` presence (`playing: <gameId>`, `best`). Standing at a machine someone else is playing shows **WATCH <NAME>**.
- **Signalling:** Supabase Realtime broadcast on `spectate:<player_user_id>`, event `sig`, with messages
  `join / offer / answer / ice / leave / full / unavailable / ended`.
- **Player side (`SpectateHost`, `src/lib/arcade/spectate.ts`):**
  - It listens only while the player is inside a cabinet and signed in.
  - On the first `join` it starts `canvas.captureStream(30)` on the game canvas. Nothing is encoded before that.
  - Each viewer gets one `RTCPeerConnection`, capped at about 1.2 Mbps and about 540p (`scaleResolutionDownBy`).
  - There are at most **3 viewers**; extras get `full`.
  - When the last viewer leaves, the capture stops. Leaving the cabinet sends `ended` and tears everything down.
  - The live score and game go over a `meta` data channel every 500 ms. The games report their score through an optional `onScore` prop, with no gameplay change.
- **Viewer side (`SpectateViewer` + `SpectateWindow`):**
  - The small corner window shows the name, game, live score and high score, plus a `<video autoplay muted playsinline>`.
  - States: CONNECTING, LIVE, GAME ENDED, UNAVAILABLE (no answer within 12 s, ICE failed, or the player isn't streaming) and TOO MANY VIEWERS.
  - **BACK TO ARCADE** sends `leave` and closes the peer.
- **ICE:** public STUN `stun:stun.l.google.com:19302` only. **No TURN**, so strict or symmetric NATs (some mobile carriers, corporate networks) may stay on UNAVAILABLE. Phase 2 fixes this (TURN or LiveKit, below).

## How to test
1. Use two browsers or devices on **two different accounts**. Single-session login signs out a second login of the same account.
2. Both open `/arcade`, sign in, pick a character and walk onto the floor. Each should see the other walking.
3. Player A walks to NEON CHASE, VOID BEAST or AQUATIC RUSH and presses PLAY.
4. Player B walks up to the same machine. **WATCH A** appears at the bottom; click it.
5. The corner window should go CONNECTING, then LIVE with A's game and a rising SCORE.
6. A leaves the cabinet (X or Esc): B sees GAME ENDED. B's BACK TO ARCADE closes the window and the peer.
7. For the viewer cap, open 4 viewers on 4 accounts: the 4th gets TOO MANY VIEWERS.
8. Local testing over LAN: run `next start -H 0.0.0.0` and open `http://<pc-ip>:3001` on the tablet. Note that `getUserMedia`/WebRTC work over plain http, but some mobile browsers want HTTPS. The cloudflared tunnel gives you that.

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
