import { isBackendOwner, type GateUser } from "./backend-gate.ts";

/**
 * Core Node account tiers. Computed ONLY on the server from a Supabase-verified user (supabase.auth.getUser), never from a client claim.
 *   guest : signed out (or an anonymous Supabase session, which is not an account)
 *   basic : any signed-in account
 *   owner : the one verified Google account allowed into /backend (exactly isBackendOwner from backend-gate.ts: BACKEND_ALLOWED_EMAIL, confirmed email, google identity with email_verified, optional sub pin)
 */
export type Tier = "guest" | "basic" | "owner";

export function tierForUser(user: GateUser | undefined, env: Record<string, string | undefined> = process.env): Tier {
  if (!user || user.is_anonymous) return "guest";
  return isBackendOwner(user, env) ? "owner" : "basic";
}

export const TIER_RANK: Record<Tier, number> = { guest: 0, basic: 1, owner: 2 };
/** true when `have` is at least `need` (e.g. atLeast(tier, "basic") for "signed in"). */
export function atLeast(have: Tier, need: Tier): boolean {
  return TIER_RANK[have] >= TIER_RANK[need];
}