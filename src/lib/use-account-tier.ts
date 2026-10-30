"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Tier } from "@/lib/account-tier";

export type AccountState = { ready: boolean; tier: Tier; signedIn: boolean };

/**
 * Client hook for the shared Core Node session. `signedIn` follows the browser Supabase session (display only);
 * `tier` always comes from the server (/api/account/tier), so a tampered client can show UI but cannot gain access.
 * Until `ready` is true the state is always { tier: "guest", signedIn: false }: nothing is reported as signed in before the server has answered.
 * If the server cannot be reached the hook fails CLOSED (ready, guest, signedIn false). This is UI state only; real access is always checked on the server.
 */
export function useAccountTier(): AccountState {
  const [state, setState] = useState<AccountState>({ ready: false, tier: "guest", signedIn: false });

  useEffect(() => {
    let alive = true;
    const supabase = createClient();
    const refresh = async () => {
      const { data } = await supabase.auth.getSession();
      if (!alive) return;
      if (!data.session) return setState({ ready: true, tier: "guest", signedIn: false });
      try {
        const r = await fetch("/api/account/tier", { cache: "no-store", credentials: "same-origin" });
        const j = (await r.json()) as { tier?: Tier };
        const tier: Tier = j.tier === "owner" || j.tier === "basic" ? j.tier : "guest";
        if (alive) setState({ ready: true, tier, signedIn: tier !== "guest" });
      } catch {
        if (alive) setState({ ready: true, tier: "guest", signedIn: false });
      }
    };
    void refresh();
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "TOKEN_REFRESHED") return;
      void refresh();
    });
    return () => { alive = false; sub.subscription.unsubscribe(); };
  }, []);

  return state;
}