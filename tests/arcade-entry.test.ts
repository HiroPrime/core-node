import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ARCADE_ENTRY_LABEL, arcadeEntryAction, arcadeEntryExtras } from '../src/lib/arcade/entry-action.ts';

const guest = { ready: true, tier: 'guest' as const, signedIn: false };
const basic = { ready: true, tier: 'basic' as const, signedIn: true };
const owner = { ready: true, tier: 'owner' as const, signedIn: true };

test('arcade entry: wait while the tier hook is not ready, even if a session already flipped signedIn', () => {
  assert.equal(arcadeEntryAction({ ready: false, tier: 'guest', signedIn: false }), 'wait');
  assert.equal(arcadeEntryAction({ ready: false, tier: 'guest', signedIn: true }), 'wait');
  assert.equal(arcadeEntryAction({ ready: false, tier: 'basic', signedIn: true }), 'wait');
  assert.equal(arcadeEntryAction({ ready: false, tier: 'owner', signedIn: true }), 'wait');
});

test('arcade entry: signed out logs in; basic and owner play', () => {
  assert.equal(arcadeEntryAction(guest), 'login');
  assert.equal(arcadeEntryAction(basic), 'play');
  assert.equal(arcadeEntryAction(owner), 'play');
  assert.equal(arcadeEntryAction({ ready: true, tier: 'guest', signedIn: true }), 'login');
  assert.equal(arcadeEntryAction({ ready: true, tier: 'basic', signedIn: false }), 'login');
});

test('arcade entry: a signed-in player waits until the saved character has loaded', () => {
  assert.equal(arcadeEntryAction(basic, false), 'wait');
  assert.equal(arcadeEntryAction(owner, false), 'wait');
  assert.equal(arcadeEntryAction(guest, false), 'login');
});

test('arcade entry labels are Log in and Play, and the wait state has no label', () => {
  assert.equal(ARCADE_ENTRY_LABEL.login, 'Log in');
  assert.equal(ARCADE_ENTRY_LABEL.play, 'Play');
  assert.equal(ARCADE_ENTRY_LABEL.guest, 'Play as guest');
  assert.equal(ARCADE_ENTRY_LABEL.change, 'Change character');
  assert.equal('wait' in ARCADE_ENTRY_LABEL, false);
});

test('arcade extras: guest with Log in, change character with Play, nothing while waiting', () => {
  assert.deepEqual(arcadeEntryExtras('wait'), []);
  assert.deepEqual(arcadeEntryExtras('login'), ['guest']);
  assert.deepEqual(arcadeEntryExtras('play'), ['change']);
});

test('start screen asks useAccountTier and keeps guest and change character off the loading hold', () => {
  const src = readFileSync(new URL('../src/components/arcade/ArcadeStartScreen.tsx', import.meta.url), 'utf8');
  assert.match(src, /useAccountTier\(/);
  assert.match(src, /arcadeEntryAction\(/);
  assert.match(src, /arcadeEntryExtras\(/);
  assert.match(src, /ARCADE_ENTRY_LABEL\.login/);
  assert.match(src, /ARCADE_ENTRY_LABEL\.play/);
  assert.match(src, /ARCADE_ENTRY_LABEL\.guest/);
  assert.match(src, /ARCADE_ENTRY_LABEL\.change/);
  assert.match(src, /aria-label="Loading"/);
  assert.match(src, /extras\.includes\("guest"\)/);
  assert.match(src, /extras\.includes\("change"\)/);
  assert.doesNotMatch(src, /PRESS START/);
});
