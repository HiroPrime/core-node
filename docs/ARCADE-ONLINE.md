# Arcade online: phase 1 setup (branch `arcade-online`)

## Flow
`/arcade` -> `ArcadeStartScreen` (placeholder, `src/components/arcade/ArcadeStartScreen.tsx`)
-> sign in (existing `NexusAuthModal`, Google/Discord/email) -> `CharacterSelect` -> floor (`ArcadeGame`).
- Signed in with a saved character: straight to the floor.
- PLAY AS GUEST: offline as before. Scores stay in localStorage, and guests don't broadcast presence.
- OAuth now returns to the page it started on (`/auth/callback?next=<path>`).

## To turn it on (BasicHiro)
1. **Apply the migrations** in `supabase/migrations` in filename order
   (`supabase db push`, or paste them into the SQL editor). `20261020120000_arcade_online.sql`
   creates `arcade_seasons` (seeded with `all-time`, active), `arcade_players`, `arcade_scores`, RLS, and the
   leaderboard. `20261024043000_arcade_score_hardening.sql` removes direct inserts: scores go through
   `arcade_start_run` / `arcade_submit_score`, and `arcade_top_scores(game, limit)` returns a display name,
   score, date, and `mine` with no user id. It assumes `public.profiles(id, username)` exists (it does).
2. **Env**: set `ARCADE_ADMIN_EMAILS=you@example.com,other@example.com` on Vercel (server-only).
   `SUPABASE_SERVICE_ROLE_KEY` must already be set (it is, for /api/population).
3. **Realtime**: presence uses *broadcast* on channel `arcade-floor`. Realtime must be enabled for the
   project (Project Settings -> Realtime). No table publication is needed. If you later turn on
   "private channels only", add a Realtime authorization policy for `arcade-floor`.

Until the migration is applied, everything falls back to local scores and the boards show this device's runs.

## Admin
`POST /api/arcade/admin/reset` (signed in as an admin email, cookie session):
```js
fetch("/api/arcade/admin/reset", { method: "POST", headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ action: "reset-game", gameId: "neon-chase", scope: "season" /* or "all" */ }) })
fetch("/api/arcade/admin/reset", { method: "POST", headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ action: "new-season", name: "Season 2" }) })
```

## Pieces
- `src/lib/arcade/roster.ts`: 5-slot roster (Charlie + 4 locked placeholders).
- `src/lib/arcade/scores.ts`: `startRun(gameId)` at countdown, `submitScore(gameId, score, userId)` through the RPC, and `fetchTopScores`. Guest scores stay in localStorage and are not uploaded on sign-in.
- `src/lib/arcade/player.ts`: saved character and display name.
- `src/lib/arcade/presence.ts`: 10 Hz broadcast, rendered 100 ms in the past with interpolation.
- Floor: a top-5 board in front of each playable machine, other players with name tags, and a WATCH stub (see `ARCADE-SPECTATOR.md`).
