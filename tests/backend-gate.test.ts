import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ASSERTION_HEADER, bearerOk, decideBackend, isBackendOwner, isLoginRoute, LOGIN_PATH, mapBackendPath, safeBackendReturn, signAssertion, type GateUser } from '../src/lib/backend-gate.ts';

const OWNER = 'basichiro@corenode.nexus';
const STUDIO = 's'.repeat(40);
const PROXY = 'p'.repeat(40);
const env = { BACKEND_ALLOWED_EMAIL: OWNER, BACKEND_PROXY_SECRET: PROXY, STUDIO_SECRET: STUDIO, NEXUS_CONTROL_URL: 'https://control.example.com' };
const google = (email: string, extra: Record<string, unknown> = {}) => ({ provider: 'google', identity_data: { email, email_verified: true, sub: 'g-123', ...extra } });
const ownerUser: GateUser = { email: 'BasicHiro@CoreNode.nexus', email_confirmed_at: '2026-01-01T00:00:00Z', identities: [google(OWNER)] };
const otherUser: GateUser = { email: 'someone@gmail.com', email_confirmed_at: '2026-01-01T00:00:00Z', identities: [google('someone@gmail.com')] };
const run = (pathname: string, user: GateUser | 'throw', e: Record<string, string | undefined> = env, more: { method?: string; authorization?: string | null; search?: string } = {}) =>
  decideBackend({ pathname, getUser: async () => { if (user === 'throw') throw new Error('x'); return user; }, env: e, ...more });

test('owner allowed: page, api and assets are forwarded to nexus-control with a signed assertion (and no cookie/authorization)', async () => {
  const page = await run('/backend', ownerUser);
  assert.equal(page.action, 'forward');
  if (page.action !== 'forward') return;
  assert.equal(page.url, 'https://control.example.com/art-studio');
  assert.ok(page.set[ASSERTION_HEADER].startsWith('v1.'));
  assert.ok(page.remove.includes('cookie') && page.remove.includes('authorization'));
  const B = '0b8f3a52-1c3e-4d3a-9d41-6f0c1d2e3f40';
  for (const [p, t] of [
    ['/backend/', '/art-studio'],
    ['/backend/api/generate', '/api/art-studio/generate'],
    [`/backend/api/jobs/${B}`, `/api/art-studio/jobs/${B}`],
    [`/backend/api/jobs/${B}/image/2`, `/api/art-studio/jobs/${B}/image/2`],
    ['/backend/_assets/_next/static/chunks/abc-123.js', '/backend/_assets/_next/static/chunks/abc-123.js'],
  ] as const) {
    const d = await run(p, ownerUser, env, { method: p.includes('generate') ? 'POST' : 'GET', search: '?dpl=1' });
    assert.equal(d.action, 'forward', p);
    if (d.action === 'forward') assert.equal(d.url, `https://control.example.com${t}?dpl=1`);
  }
});

test('other signed-in user gets 404 (also unverified email, anonymous, non-Google identity, email only on a different identity)', async () => {
  assert.deepEqual(await run('/backend', otherUser), { action: 'notfound' });
  for (const u of [
    { ...ownerUser, email_confirmed_at: null },
    { ...ownerUser, is_anonymous: true },
    { ...ownerUser, identities: [google(OWNER, { email_verified: false })] },
    { ...ownerUser, identities: [{ provider: 'email', identity_data: { email: OWNER, email_verified: true } }] },
    { ...ownerUser, identities: [google('someone@gmail.com')] },
    { ...ownerUser, identities: [] },
    { ...ownerUser, identities: null },
  ] as GateUser[]) assert.deepEqual(await run('/backend', u), { action: 'notfound' });
});

test('signed-out gets 404; so does a user lookup that throws', async () => {
  assert.deepEqual(await run('/backend', null), { action: 'notfound' });
  assert.deepEqual(await run('/backend', 'throw'), { action: 'notfound' });
});

test('env unset = deny all, even for the owner: BACKEND_ALLOWED_EMAIL, BACKEND_PROXY_SECRET, NEXUS_CONTROL_URL', async () => {
  for (const key of ['BACKEND_ALLOWED_EMAIL', 'BACKEND_PROXY_SECRET', 'NEXUS_CONTROL_URL'] as const) {
    for (const v of [undefined, '', '   ']) {
      assert.deepEqual(await run('/backend', ownerUser, { ...env, [key]: v }), { action: 'notfound' }, `${key}=${JSON.stringify(v)}`);
    }
  }
  assert.deepEqual(await run('/backend', ownerUser, { ...env, BACKEND_PROXY_SECRET: 'short' }), { action: 'notfound' });
  assert.deepEqual(await run('/backend', ownerUser, {}), { action: 'notfound' });
  assert.deepEqual(await run('/backend', ownerUser, { ...env, NEXUS_CONTROL_URL: 'http://control.example.com' }), { action: 'notfound' }); // plain http only for loopback
  assert.equal((await run('/backend', ownerUser, { ...env, NEXUS_CONTROL_URL: 'http://127.0.0.1:3100' })).action, 'forward');
});

test('optional Google sub pin: wrong sub is 404, right sub is allowed', async () => {
  assert.deepEqual(await run('/backend', ownerUser, { ...env, BACKEND_ALLOWED_GOOGLE_SUB: 'other' }), { action: 'notfound' });
  assert.equal((await run('/backend', ownerUser, { ...env, BACKEND_ALLOWED_GOOGLE_SUB: 'g-123' })).action, 'forward');
  assert.equal(isBackendOwner(ownerUser, { BACKEND_ALLOWED_EMAIL: OWNER }), true);
  assert.equal(isBackendOwner(ownerUser, {}), false);
});

test('watcher endpoints: STUDIO_SECRET bearer only, no session needed, 404 when missing or wrong, owner session alone is not enough', async () => {
  const p = '/backend/api/watch/jobs';
  const ok = await run(p, null, env, { authorization: `Bearer ${STUDIO}` });
  assert.equal(ok.action, 'forward');
  if (ok.action === 'forward') { assert.equal(ok.url, 'https://control.example.com/api/art-studio/watch/jobs'); assert.deepEqual(ok.set, {}); assert.ok(!ok.remove.includes('authorization')); assert.ok(ok.remove.includes('cookie')); }
  for (const a of [null, '', 'Bearer ', 'Bearer wrong', `bearer ${STUDIO}`, STUDIO, `Bearer ${STUDIO} `, `Bearer ${STUDIO}x`, `Bearer ${'a'.repeat(100_000)}`])
    assert.deepEqual(await run(p, null, env, { authorization: a }), { action: 'notfound' }, String(a).slice(0, 20));
  assert.deepEqual(await run(p, ownerUser, env, {}), { action: 'notfound' }); // owner cookie, no bearer
  for (const e of [{ ...env, STUDIO_SECRET: undefined }, { ...env, STUDIO_SECRET: '' }, { ...env, STUDIO_SECRET: '  ' }])
    assert.deepEqual(await run(p, null, e, { authorization: `Bearer ${STUDIO}` }), { action: 'notfound' });
  const B = '0b8f3a52-1c3e-4d3a-9d41-6f0c1d2e3f40';
  for (const [path, m, t] of [['/backend/api/watch/queue', 'GET', 'queue'], ['/backend/api/watch/reap', 'POST', 'reap'], [`/backend/api/watch/jobs/${B}`, 'POST', `jobs/${B}`], [`/backend/api/watch/jobs/${B}/upload`, 'POST', `jobs/${B}/upload`]] as const) {
    const d = await run(path, null, env, { method: m, authorization: `Bearer ${STUDIO}` });
    assert.equal(d.action, 'forward', path);
    if (d.action === 'forward') assert.equal(d.url, `https://control.example.com/api/art-studio/watch/${t}`);
  }
});

test('the watcher exemption is only for api/watch: a bearer does not open the page, owner API or assets', async () => {
  for (const p of ['/backend', '/backend/api/generate', '/backend/_assets/_next/static/chunks/a.js'])
    assert.deepEqual(await run(p, null, env, { authorization: `Bearer ${STUDIO}` }), { action: 'notfound' }, p);
});

test('anything not allowlisted is 404, even for the owner (no traversal, no other nexus-control routes, no odd methods)', async () => {
  const B = '0b8f3a52-1c3e-4d3a-9d41-6f0c1d2e3f40';
  for (const p of [
    '/backend/api', '/backend/api/', '/backend/api/whoami', '/backend/api/health', '/backend/api/generate/x', '/backend/api/jobs', '/backend/api/jobs/not-a-uuid', `/backend/api/jobs/${B}/image/3`,
    '/backend/api/watch', '/backend/api/watch/', '/backend/api/watch/other', '/backend/login', '/backend/savepoint', '/backend/x', '/backendx', '/backend/api/../savepoint',
    '/backend/_assets/_next/static/../../api/health', '/backend/_assets/_next/static/%2e%2e/x.js', '/backend/_assets/_next/static/a//b.js', '/backend/_assets/_next/static/', '/backend/_assets/other', '/backend/_assets/_next/image',
    '/Backend', '/backend%2Fapi%2Fgenerate',
  ]) assert.deepEqual(await run(p, ownerUser, env, { authorization: `Bearer ${STUDIO}` }), { action: 'notfound' }, p);
  assert.equal(mapBackendPath('/backend', 'PUT'), null);
  assert.equal(mapBackendPath('/backend', 'OPTIONS'), null);
  assert.equal(mapBackendPath('/backend/api/watch/queue', 'DELETE'), null);
});

test('assertion matches nexus-control format (v1.<payload>.<hmac hex>), expires in 60s, needs a 32+ char secret', () => {
  const now = Date.UTC(2026, 9, 29, 12, 0, 0);
  const v = signAssertion(OWNER, PROXY, now)!;
  const [h, p, s] = v.split('.');
  assert.equal(h, 'v1');
  assert.match(s, /^[0-9a-f]{64}$/);
  assert.deepEqual(JSON.parse(Buffer.from(p, 'base64url').toString()), { e: OWNER, b: '/backend', exp: Math.floor(now / 1000) + 60 });
  assert.equal(signAssertion(OWNER, 'short'), null);
  assert.equal(signAssertion(OWNER, undefined), null);
});

test('bearerOk is constant-time (timingSafeEqual on hashes), never === on the secret', () => {
  assert.equal(bearerOk(`Bearer ${STUDIO}`, env), true);
  assert.equal(bearerOk(`Bearer ${STUDIO}`, {}), false);
  const src = readFileSync(new URL('../src/lib/backend-gate.ts', import.meta.url), 'utf8');
  assert.match(src, /timingSafeEqual\(/);
  assert.doesNotMatch(src, /===\s*secret|secret\s*===|header\s*===/);
});

test('source check: src/proxy.ts hands /backend to the gate before anything else (before the /api, /_next and "." early exits)', () => {
  const src = readFileSync(new URL('../src/proxy.ts', import.meta.url), 'utf8');
  const gate = src.indexOf('backendProxy(request)');
  assert.ok(gate > 0 && gate < src.indexOf('pathname.startsWith("/api")'));
  assert.ok(gate < src.indexOf('pathname.includes(".")'));
});

test('source check: /backend is not advertised in robots or the sitemap', () => {
  for (const f of ['../src/app/robots.ts', '../src/app/sitemap.ts']) assert.doesNotMatch(readFileSync(new URL(f, import.meta.url), 'utf8'), /backend/i);
});

test('padded emails are denied: no trim anywhere in the email compare (user email, identity email, or the allowed env value)', async () => {
  const padded = ' ' + OWNER + ' ';
  for (const u of [
    { ...ownerUser, email: padded },
    { ...ownerUser, email: OWNER + '\n' },
    { ...ownerUser, identities: [google(padded)] },
  ] as GateUser[]) assert.deepEqual(await run('/backend', u), { action: 'notfound' }, JSON.stringify(u?.email));
  assert.deepEqual(await run('/backend', ownerUser, { ...env, BACKEND_ALLOWED_EMAIL: padded }), { action: 'notfound' }, 'padded env value denies everyone');
  assert.equal(isBackendOwner(ownerUser, env), true, 'sanity: the exact owner still passes');
  assert.equal(isBackendOwner({ ...ownerUser, email: padded }, env), false);
});

test('optional Vercel protection bypass: sent upstream only when NEXUS_CONTROL_BYPASS is set; client-supplied one is stripped', async () => {
  const secret = 'b'.repeat(24);
  const withB = { ...env, NEXUS_CONTROL_BYPASS: secret };
  const o = await run('/backend', ownerUser, withB);
  assert.equal(o.action, 'forward');
  if (o.action === 'forward') { assert.equal(o.set['x-vercel-protection-bypass'], secret); assert.ok(o.remove.includes('x-vercel-protection-bypass')); }
  const w = await decideBackend({ pathname: '/backend/api/watch/queue', method: 'GET', authorization: 'Bearer ' + STUDIO, getUser: async () => null, env: withB });
  assert.equal(w.action, 'forward');
  if (w.action === 'forward') assert.equal(w.set['x-vercel-protection-bypass'], secret);
  for (const bad of [undefined, '', 'short']) {
    const n = await run('/backend', ownerUser, { ...env, NEXUS_CONTROL_BYPASS: bad });
    if (n.action === 'forward') assert.equal(n.set['x-vercel-protection-bypass'], undefined, String(bad));
  }
});

test('/backend/login: only that exact path, GET/HEAD; everything else under /backend is still gated; it is never mapped upstream', async () => {
  assert.equal(LOGIN_PATH, '/backend/login');
  assert.equal(isLoginRoute('/backend/login'), true);
  assert.equal(isLoginRoute('/backend/login', 'HEAD'), true);
  for (const p of ['/backend/login/', '/backend/login/x', '/backend/loginx', '/backend', '/backend/', '/login', '/BACKEND/login', '/backend/api/login']) assert.equal(isLoginRoute(p), false, p);
  for (const m of ['POST', 'PUT', 'DELETE', 'PATCH']) assert.equal(isLoginRoute('/backend/login', m), false, m);
  assert.deepEqual(await run('/backend/login', null), { action: 'notfound' }, 'never forwarded upstream, even for the owner');
  assert.deepEqual(await run('/backend/login', ownerUser), { action: 'notfound' });
  assert.deepEqual(await run('/backend', null), { action: 'notfound' }, 'signed-out /backend is still a 404');
});

test('safeBackendReturn: only /backend paths; no open redirect', () => {
  for (const ok of ['/backend', '/backend/', '/backend/api/x', '/backend?x=1', '/backend/a?b=c']) assert.equal(safeBackendReturn(ok), ok, ok);
  assert.equal(safeBackendReturn(encodeURIComponent('/backend/a?b=c')), '/backend/a?b=c');
  for (const bad of [undefined, null, 5, '', 'backend', '/', '/arcade', '/backendx', '/backend@evil.com', '//evil.com', '/\\evil.com', '/backend\\x', 'https://evil.com', 'https://evil.com/backend', 'javascript:alert(1)',
    '/backend//evil.com', '/backend/../arcade', '/backend/%2e%2e/arcade', '/backend/%252e%252e/x', '/backend%2F..%2F..', '/backend\n/x', '/backend\r', '/backend/x#frag', '/backend/%', '%2F%2Fevil.com', '/arcade/backend', ' /backend', '/backend/' + 'a'.repeat(300)])
    assert.equal(safeBackendReturn(bad), '/backend', String(bad));
});