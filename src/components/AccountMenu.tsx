"use client";

import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { clearClaim } from "@/lib/session-guard";
import { useAccountTier } from "@/lib/use-account-tier";

/** Top-menu account entry: Account (signed out) / Log out (signed in) / Backend (server says owner tier only). */
export function AccountMenu() {
  const { tier, signedIn } = useAccountTier();

  const logout = async () => {
    const supabase = createClient();
    const { data } = await supabase.auth.getUser();
    if (data.user) clearClaim(data.user.id);
    await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
    window.location.assign("/");
  };

  return (
    <>
      {tier === "owner" ? <Link href="/backend" prefetch={false}>Backend</Link> : null}
      {signedIn ? (
        <button type="button" className="chrome-account" onClick={logout}>Log out</button>
      ) : (
        <Link href="/login">Account</Link>
      )}
    </>
  );
}

export default AccountMenu;