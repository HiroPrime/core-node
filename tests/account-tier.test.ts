import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { atLeast, tierForUser } from '../src/lib/account-tier.ts';
import type { GateUser } from '../src/lib/backend-gate.ts';

const OWNER = 'basichiro@corenode.nexus';
const env = { BACKEND_ALLOWED_EMAIL: OWNER };
const google = (email: string, extra: Record<string, unknown> = {}) => ({ provider: 'google', identity_data: { email, email_verified: true, sub: 'g-1', ...extra } });
const base = { email_confirmed_at: '2026-01-01T00:00:00Z' };

test('tiers: guest / basic / owner, owner exactly as strict as the backend gate', () => {
  assert.equal(tierForUser(null, env), 'guest');
  assert.equal(tierForUser(undefined, env), 'guest');
  assert.equal(tierForUser({ ...base, email: 'x@y.com', is_anonymous: true, identities: [] }, env), 'guest', 'anonymous session is not an account');
  assert.equal(tierForUser({ ...base, email: 'x@gmail.com', identities: [google('x@gmail.com')] }, env), 'basic');
  assert.equal(tierForUser({ email: 'x@gmail.com', identities: [] }, env), 'basic', 'any signed-in account is basic');
  assert.equal(tierForUser({ ...base, email: 'BasicHiro@CoreNode.nexus', identities: [google(OWNER)] }, env), 'owner');
  // not owner: unconfirmed, non-google, unverified google, wrong google email, padded email, anonymous, no env
  assert.equal(tierForUser({ email: OWNER, identities: [google(OWNER)] }, env), 'basic');
  assert.equal(tierForUser({ ...base, email: OWNER, identities: [{ provider: 'email', identity_data: { email: OWNER, email_verified: true } }] }, env), 'basic');
  assert.equal(tierForUser({ ...base, email: OWNER, identities: [google(OWNER, { email_verified: false })] }, env), 'basic');
  assert.equal(tierForUser({ ...base, email: OWNER, identities: [google('other@gmail.com')] }, env), 'basic');
  assert.equal(tierForUser({ ...base, email: ` ${OWNER}`, identities: [google(OWNER)] }, env), 'basic');
  assert.equal(tierForUser({ ...base, email: OWNER, identities: [google(OWNER)] }, {}), 'basic');
  assert.equal(tierForUser({ ...base, email: OWNER, is_anonymous: true, identities: [google(OWNER)] }, env), 'guest');
});

test('pin: owner needs the pinned google sub when BACKEND_ALLOWED_GOOGLE_SUB is set', () => {
  const u: GateUser = { ...base, email: OWNER, identities: [google(OWNER, { sub: 'g-1' })] };
  assert.equal(tierForUser(u, { ...env, BACKEND_ALLOWED_GOOGLE_SUB: 'g-1' }), 'owner');
  assert.equal(tierForUser(u, { ...env, BACKEND_ALLOWED_GOOGLE_SUB: 'g-2' }), 'basic');
});

test('atLeast ordering', () => {
  assert.equal(atLeast('owner', 'basic'), true);
  assert.equal(atLeast('basic', 'owner'), false);
  assert.equal(atLeast('guest', 'basic'), false);
  assert.equal(atLeast('basic', 'basic'), true);
});

test('decoy form never sends, logs or stores anything (static guard)', () => {
  const src = readFileSync(new URL('../src/app/login/DecoyForm.tsx', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  for (const bad of [/fetch\s*\(/, /XMLHttpRequest/, /sendBeacon/, /WebSocket/, /EventSource/, /localStorage/, /sessionStorage/, /indexedDB/, /document\.cookie/, /console\./, /createClient/, /supabase/i, /\baction\s*=/, /\bmethod\s*=/, /\bname\s*=/, /useState\(\s*["'`]/, /e\.target|FormData|\.value\b/])
    assert.doesNotMatch(src, bad, String(bad));
  assert.match(src, /Incorrect username or password/);
  assert.match(src, /preventDefault\(\)/);
});

test('google button: select_account, no login_hint, returns home; arcade modal + shared auth untouched', () => {
  const src = readFileSync(new URL('../src/app/login/GoogleButton.tsx', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  assert.match(src, /prompt:\s*"select_account"/);
  assert.doesNotMatch(src, /login_hint/);
  assert.match(src, /encodeURIComponent\("\/"\)/);
  assert.match(src, /\/auth\/callback/);
});