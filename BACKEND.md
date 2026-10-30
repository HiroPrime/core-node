# /backend: owner-only door to nexus-control's Art Studio

`https://corenode.nexus/backend` is a proxy REWRITE (the URL in the browser never changes) to the hidden Art Studio page served by nexus-control.
No menu, link, robots or sitemap entry. Every answer carries `X-Robots-Tag: noindex...` and `Cache-Control: private, no-store`.
All rules are in `src/lib/backend-gate.ts` (pure, unit-tested: `npm test`); `src/lib/backend-proxy.ts` applies them; `src/proxy.ts` calls it first, before every other early exit.

## Who gets in
Owner routes (page `/backend`, `/backend/api/{generate,jobs/<id>,jobs/<id>/image/<0-2>}`, `/backend/_assets/_next/static/*`):
`supabase.auth.getUser()` (verified against Supabase) must return a user whose `email` equals `BACKEND_ALLOWED_EMAIL` (case-insensitive, exact),
with `email_confirmed_at` set, not anonymous, and a **Google identity** whose `identity_data.email_verified` is true and `identity_data.email` is the same address;
if `BACKEND_ALLOWED_GOOGLE_SUB` is set the Google identity's `identity_data.sub` must equal it. `BACKEND_ALLOWED_EMAIL` unset = nobody.
Anyone else (other signed-in users, signed-out, errors, env unset) gets the site's normal 404.
Allowed requests are forwarded with the browser's cookies and Authorization **removed**, plus a 60 s HMAC assertion (`BACKEND_PROXY_SECRET`) that nexus-control verifies again.

Watcher routes (`/backend/api/watch/{jobs,jobs/<id>,jobs/<id>/upload,queue,reap}`): no session; `Authorization: Bearer STUDIO_SECRET`, constant time, 404 when missing/wrong/unset.
Nothing else is exempt. Everything not on the allowlist is 404 (including `..`, other methods, other nexus-control routes).

## Env vars (names only)
BACKEND_ALLOWED_EMAIL, BACKEND_ALLOWED_GOOGLE_SUB (optional pin), BACKEND_PROXY_SECRET (32+ chars, same value as nexus-control), NEXUS_CONTROL_URL (https origin of nexus-control, server-only), STUDIO_SECRET (same value as nexus-control and the Omen).
Existing Core Node vars are reused for the session: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY.

## Omen watcher once deployed
`NEXUS_URL=https://corenode.nexus/backend` in `.env.omen` (the watcher appends `/api/watch/...`, which lands on `/backend/api/watch/...`). Same `STUDIO_SECRET`.
