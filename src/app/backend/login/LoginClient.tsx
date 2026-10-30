"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { markFreshSignIn } from "@/lib/session-guard";

/**
 * Starts the SAME Google sign-in the arcade modal uses (NexusAuthModal): same redirectTo (/auth/callback, already on the Supabase
 * allow list), same `auth_next` return cookie that /auth/callback already reads. Nothing shared is changed; only the return path
 * is a validated /backend path instead of the page the modal sat on.
 */
export default function LoginClient({ next }: { next: string }) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const go = async () => {
    setBusy(true);
    setFailed(false);
    try {
      markFreshSignIn();
      document.cookie = `auth_next=${encodeURIComponent(next)}; Path=/; Max-Age=600; SameSite=Lax${window.location.protocol === "https:" ? "; Secure" : ""}`;
      const { error } = await createClient().auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) throw error;
    } catch {
      setBusy(false);
      setFailed(true);
    }
  };

  return (
    <main style={{ minHeight: "60vh", display: "grid", placeItems: "center", padding: "6rem 1rem" }}>
      <div style={{ textAlign: "center" }}>
        <button type="button" onClick={go} disabled={busy} style={{ padding: "0.9rem 1.6rem", fontSize: "1rem", cursor: busy ? "wait" : "pointer" }}>
          {busy ? "Opening Google…" : "Continue with Google"}
        </button>
        {failed ? <p role="alert" style={{ marginTop: "1rem" }}>Sign-in did not start. Try again.</p> : null}
      </div>
    </main>
  );
}