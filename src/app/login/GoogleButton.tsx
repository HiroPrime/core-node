"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { markFreshSignIn } from "@/lib/session-guard";

/**
 * Same Google flow the arcade modal uses (same redirectTo=/auth/callback, same auth_next cookie), returning to the homepage.
 * prompt=select_account makes Google show the account chooser. No login_hint on purpose, so any account can be picked.
 */
export default function GoogleButton() {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const go = async () => {
    setBusy(true);
    setFailed(false);
    try {
      markFreshSignIn();
      document.cookie = `auth_next=${encodeURIComponent("/")}; Path=/; Max-Age=600; SameSite=Lax${window.location.protocol === "https:" ? "; Secure" : ""}`;
      const { error } = await createClient().auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: { prompt: "select_account" },
        },
      });
      if (error) throw error;
    } catch {
      setBusy(false);
      setFailed(true);
    }
  };

  return (
    <div className="login-google">
      <button type="button" className="login-submit" onClick={go} disabled={busy}>
        {busy ? "Opening Google…" : "Continue with Google"}
      </button>
      {failed ? <p role="alert" className="login-error">Sign-in did not start. Try again.</p> : null}
    </div>
  );
}