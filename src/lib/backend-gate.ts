// Owner-only gate and path map for /backend, which serves nexus-control's hidden Art Studio on corenode.nexus.
// Pure decision logic (no Next imports, relative imports only) so node:test can load it. src/proxy.ts applies it before anything else runs.
//
// What decides access (server-side, on every request, no client-side check anywhere):
//   owner routes (the page, /backend/api/*, /backend/_assets/*):
//     the Supabase user from `supabase.auth.getUser()` (verified against Supabase, not just decoded from the cookie) must have
//       - `email` equal (case-insensitive, exact) to BACKEND_ALLOWED_EMAIL
//       - `email_confirmed_at` set, and not anonymous
//       - a GOOGLE identity whose `identity_data.email_verified` is true and whose `identity_data.email` equals that same address
//       - and, when BACKEND_ALLOWED_GOOGLE_SUB is set, that Google identity's `identity_data.sub` equals it
//     BACKEND_ALLOWED_EMAIL unset/blank = nobody. There is no fallback that admits anyone else.
//   watcher routes (/backend/api/watch/*): no session (the Omen has none), STUDIO_SECRET bearer only, constant-time compare.
//     Anything else, including a valid owner session, gets 404 there.
// Every refusal is the same 404 as an unknown URL. Nothing outside the allowlisted paths below is ever forwarded.
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

export const BACKEND_BASE = '/backend';
export const ASSERTION_HEADER = 'x-nexus-backend-assertion';
const ASSERTION_TTL_SECONDS = 60;
const MIN_SECRET_CHARS = 32;

export type GateIdentity = { provider?: string; identity_data?: Record<string, unknown> | null };
export type GateUser = {
  email?: string | null;
  email_confirmed_at?: string | null;
  is_anonymous?: boolean;
  identities?: GateIdentity[] | null;
} | null;
type Env = Record<string, string | undefined>;

const lc = (s: unknown) => (typeof s === 'string' ? s.trim().toLowerCase() : '');

/** True only for the one allowed owner account. */
export function isBackendOwner(user: GateUser | undefined, env: Env = process.env): boolean {
  const allowed = lc(env.BACKEND_ALLOWED_EMAIL);
  if (!allowed || !user || user.is_anonymous || !user.email_confirmed_at) return false;
  if (lc(user.email) !== allowed) return false;
  const pin = env.BACKEND_ALLOWED_GOOGLE_SUB?.trim();
  return (user.identities ?? []).some((i) => {
    if (i.provider !== 'google') return false;
    const d = i.identity_data ?? {};
    if (d.email_verified !== true || lc(d.email) !== allowed) return false;
    return !pin || d.sub === pin || d.provider_id === pin;
  });
}

const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const OWNER_API = [new RegExp(`^generate$`), new RegExp(`^jobs/${UUID}$`, 'i'), new RegExp(`^jobs/${UUID}/image/[0-2]$`, 'i')];
const WATCH_API = [/^jobs$/, new RegExp(`^jobs/${UUID}$`, 'i'), new RegExp(`^jobs/${UUID}/upload$`, 'i'), /^queue$/, /^reap$/];
const ASSET_TAIL = /^[A-Za-z0-9_\-./~%[\]()@+]{1,300}$/;
const METHODS: Record<'owner' | 'watcher', readonly string[]> = { owner: ['GET', 'HEAD', 'POST', 'DELETE'], watcher: ['GET', 'POST'] };

export type BackendRoute = { kind: 'owner' | 'watcher'; target: string };

/** Allowlisted map from a corenode.nexus path to the nexus-control path. Anything not listed is null (404). */
export function mapBackendPath(pathname: string, method = 'GET'): BackendRoute | null {
  let route: BackendRoute | null = null;
  if (pathname === BACKEND_BASE || pathname === `${BACKEND_BASE}/`) route = { kind: 'owner', target: '/art-studio' };
  else if (pathname.startsWith(`${BACKEND_BASE}/api/watch/`)) {
    const rest = pathname.slice(`${BACKEND_BASE}/api/watch/`.length);
    if (WATCH_API.some((r) => r.test(rest))) route = { kind: 'watcher', target: `/api/art-studio/watch/${rest}` };
  } else if (pathname.startsWith(`${BACKEND_BASE}/api/`)) {
    const rest = pathname.slice(`${BACKEND_BASE}/api/`.length);
    if (OWNER_API.some((r) => r.test(rest))) route = { kind: 'owner', target: `/api/art-studio/${rest}` };
  } else if (pathname.startsWith(`${BACKEND_BASE}/_assets/_next/static/`)) {
    const rest = pathname.slice(`${BACKEND_BASE}/_assets/_next/static/`.length);
    let decoded = rest;
    try { decoded = decodeURIComponent(rest); } catch { return null; }
    if (ASSET_TAIL.test(rest) && !decoded.split('/').some((s) => s === '..' || s === '.' || s === '') && !/[\\]/.test(decoded)) route = { kind: 'owner', target: `${BACKEND_BASE}/_assets/_next/static/${rest}` };
  }
  return route && METHODS[route.kind].includes(method.toUpperCase()) ? route : null;
}

/** `Authorization: Bearer <STUDIO_SECRET>`, constant time (both sides hashed so lengths always match). Unset secret = never. */
export function bearerOk(header: string | null | undefined, env: Env = process.env): boolean {
  const secret = env.STUDIO_SECRET;
  if (!secret || !secret.trim()) return false;
  const a = createHash('sha256').update(header ?? '').digest();
  const b = createHash('sha256').update(`Bearer ${secret}`).digest();
  return timingSafeEqual(a, b);
}

/** Signed "the owner passed the gate" value for nexus-control (same format as nexus-control lib/art-studio/backend-assertion.ts). */
export function signAssertion(email: string, secret: string | undefined, nowMs = Date.now()): string | null {
  if (!secret || secret.trim().length < MIN_SECRET_CHARS) return null;
  const payload = Buffer.from(JSON.stringify({ e: email, b: BACKEND_BASE, exp: Math.floor(nowMs / 1000) + ASSERTION_TTL_SECONDS })).toString('base64url');
  return `v1.${payload}.${createHmac('sha256', secret).update(`v1.${payload}`).digest('hex')}`;
}

export function upstreamOrigin(env: Env = process.env): string | null {
  try {
    const u = new URL(env.NEXUS_CONTROL_URL ?? '');
    const local = ['localhost', '127.0.0.1', '::1', '[::1]'].includes(u.hostname);
    if (u.protocol !== 'https:' && !(u.protocol === 'http:' && local)) return null;
    return u.origin;
  } catch {
    return null;
  }
}

export type Decision =
  | { action: 'notfound' }
  | { action: 'forward'; url: string; kind: 'owner' | 'watcher'; set: Record<string, string>; remove: string[] };

/** Headers that must never reach nexus-control: Core Node's session cookies, and any client-supplied assertion. */
const ALWAYS_REMOVE = ['cookie', ASSERTION_HEADER];

export async function decideBackend(input: {
  pathname: string;
  search?: string;
  method?: string;
  authorization?: string | null;
  getUser: () => Promise<GateUser>;
  env?: Env;
  nowMs?: number;
}): Promise<Decision> {
  const env = input.env ?? process.env;
  const route = mapBackendPath(input.pathname, input.method ?? 'GET');
  const origin = upstreamOrigin(env);
  if (!route || !origin) return { action: 'notfound' };
  const url = `${origin}${route.target}${input.search ?? ''}`;

  if (route.kind === 'watcher') {
    return bearerOk(input.authorization, env) ? { action: 'forward', url, kind: 'watcher', set: {}, remove: ALWAYS_REMOVE } : { action: 'notfound' };
  }

  if (!lc(env.BACKEND_ALLOWED_EMAIL)) return { action: 'notfound' };
  let user: GateUser = null;
  try { user = await input.getUser(); } catch { return { action: 'notfound' }; }
  if (!isBackendOwner(user, env)) return { action: 'notfound' };
  const assertion = signAssertion(lc(user!.email), env.BACKEND_PROXY_SECRET, input.nowMs);
  if (!assertion) return { action: 'notfound' };
  return { action: 'forward', url, kind: 'owner', set: { [ASSERTION_HEADER]: assertion }, remove: [...ALWAYS_REMOVE, 'authorization'] };
}
