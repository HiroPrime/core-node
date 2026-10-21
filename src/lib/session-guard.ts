"use client";

import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Single-session login, client side.
 *
 * Each signed-in browser holds a session claim { nonce, ts } in localStorage.
 * A fresh sign-in (no claim yet for this user in this browser, or
 * markFreshSignIn() was called) mints a new claim and broadcasts it on
 * Realtime channel `session:<user_id>`. Any other client of the same user
 * holding an older claim signs out locally.
 *
 * Server side, every successful sign-in also calls
 * signOut({ scope: "others" }) so older refresh tokens are revoked.
 */

export type SessionClaim = { nonce: string; ts: number };

const KEY = "nexus-session-claim-v1";
const FRESH = "nexus-session-fresh-v1";

const newNonce = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

/** Call right after a successful sign-in in this browser. */
export function markFreshSignIn() {
  try {
    localStorage.setItem(FRESH, "1");
  } catch {
    /* private mode */
  }
}

function read(userId: string): SessionClaim | null {
  try {
    const raw = JSON.parse(localStorage.getItem(`${KEY}:${userId}`) || "null") as SessionClaim | null;
    return raw && typeof raw.nonce === "string" && Number.isFinite(raw.ts) ? raw : null;
  } catch {
    return null;
  }
}

/** This browser's claim for the user, minting one if needed. `fresh` = just minted. */
export function currentClaim(userId: string, force = false): { claim: SessionClaim; fresh: boolean } {
  let fresh = force;
  try {
    fresh = fresh || localStorage.getItem(FRESH) === "1";
    localStorage.removeItem(FRESH);
  } catch {
    /* private mode */
  }
  const existing = read(userId);
  if (existing && !fresh) return { claim: existing, fresh: false };
  const claim = { nonce: newNonce(), ts: Date.now() };
  try {
    localStorage.setItem(`${KEY}:${userId}`, JSON.stringify(claim));
  } catch {
    /* private mode */
  }
  return { claim, fresh: true };
}

export function clearClaim(userId: string) {
  try {
    localStorage.removeItem(`${KEY}:${userId}`);
  } catch {
    /* private mode */
  }
}

/** True when `other` is a newer login than `mine`. */
export function supersedes(other: SessionClaim | null | undefined, mine: SessionClaim): boolean {
  if (!other || typeof other.nonce !== "string" || !Number.isFinite(other.ts)) return false;
  if (other.nonce === mine.nonce) return false;
  return other.ts > mine.ts || (other.ts === mine.ts && other.nonce > mine.nonce);
}

/**
 * Join `session:<user_id>`. Broadcasts this browser's claim when it is fresh
 * (and re-announces on join so late subscribers hear it), and calls
 * onSuperseded when a newer login of the same user shows up.
 */
export function startSessionGuard(
  supabase: SupabaseClient,
  userId: string,
  claim: SessionClaim,
  fresh: boolean,
  onSuperseded: () => void,
): () => void {
  let done = false;
  const channel = supabase.channel(`session:${userId}`, { config: { broadcast: { self: false } } });
  const announce = () =>
    void channel.send({ type: "broadcast", event: "claim", payload: { type: "claim", ...claim } });
  channel
    .on("broadcast", { event: "claim" }, ({ payload }) => {
      if (done) return;
      const other = payload as SessionClaim;
      if (supersedes(other, claim)) {
        done = true;
        onSuperseded();
      } else if (other?.nonce !== claim.nonce) {
        // An older session is still around: tell it again.
        announce();
      }
    })
    .subscribe((status) => {
      if (status === "SUBSCRIBED") {
        // Fresh logins claim; older ones also announce so a newer, already
        // connected device can answer and kick them if they came back online.
        announce();
        if (fresh) window.setTimeout(announce, 1500);
      }
    });
  return () => {
    done = true;
    void supabase.removeChannel(channel);
  };
}