"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Tier } from "@/lib/account-tier";

export type AccountState = { ready: boolean; tier: Tier; signedIn: boolean };

/**
 * Client hook for the shared Core Node session. `signedIn` follows the browser Supabase session (display only);
 * `tier` always comes from the server (/api/account/tier), so a tampered client can show UI but cannot gain access.
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
      setState((s) => ({ ...s, signedIn: true }));
      try {
        const r = await fetch("/api/account/tier", { cache: "no-store", credentials: "same-origin" });
        const j = (await r.json()) as { tier?: Tier };
        const tier: Tier = j.tier === "owner" || j.tier === "basic" ? j.tier : "guest";
        if (alive) setState({ ready: true, tier, signedIn: tier !== "guest" });
      } catch {
        if (alive) setState({ ready: true, tier: "basic", signedIn: true });
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