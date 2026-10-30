import { createClient } from "@/lib/supabase/server";
import { tierForUser, type Tier } from "@/lib/account-tier";
import type { GateUser } from "@/lib/backend-gate";

/**
 * Server-side tier for the current request (Server Components, Route Handlers, Server Actions).
 * Reads the shared Core Node Supabase session cookie and asks Supabase to verify it (getUser), so it cannot be spoofed by the client.
 */
export async function getTier(): Promise<Tier> {
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    return tierForUser((data.user as GateUser) ?? null);
  } catch {
    return "guest";
  }
}