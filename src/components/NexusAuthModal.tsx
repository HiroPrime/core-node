"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

type AuthView = "landing" | "login" | "signup" | "forgot" | "update_password" | "onboarding";

type Message = { type: "" | "error" | "info" | "success" | "success_action"; text: string };

const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden>
    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
);

const DiscordIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 127.14 96.36" aria-hidden>
    <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a67.58,67.58,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.31,60,73.31,53s5-12.74,11.43-12.74S96.33,46,96.22,53,91.08,65.69,84.69,65.69Z" />
  </svg>
);

type Props = {
  open: boolean;
  onClose: () => void;
  user: User | null;
  onUserChange: (user: User | null) => void;
};

export default function NexusAuthModal({ open, onClose, user, onUserChange }: Props) {
  const [view, setView] = useState<AuthView>("landing");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [username, setUsername] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [newsletter, setNewsletter] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<Message>({ type: "", text: "" });

  const resetForm = useCallback(() => {
    setEmail("");
    setPassword("");
    setConfirm("");
    setUsername("");
    setAvatarUrl("");
    setNewsletter(false);
    setMessage({ type: "", text: "" });
  }, []);

  const evaluateSession = useCallback(
    async (sessionUser: User | null) => {
      if (!sessionUser) {
        onUserChange(null);
        return;
      }
      onUserChange(sessionUser);

      const metaUsername = sessionUser.user_metadata?.username as string | undefined;
      const supabase = createClient();
      const { data: profile } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", sessionUser.id)
        .maybeSingle();

      const hasUsername = Boolean(profile?.username || metaUsername);
      if (!hasUsername) {
        setView("onboarding");
        setUsername(metaUsername || "");
      }
    },
    [onUserChange]
  );

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      void evaluateSession(session?.user ?? null);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      void evaluateSession(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, [evaluateSession]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = window.location.href;
    if (url.includes("type=recovery") || url.includes("reset=true")) {
      setView("update_password");
    }
    const params = new URLSearchParams(window.location.search);
    if (params.get("auth_error")) {
      setMessage({ type: "error", text: "Sign-in failed. Please try again." });
      setView("login");
      params.delete("auth_error");
      const qs = params.toString();
      window.history.replaceState(
        {},
        "",
        `${window.location.pathname}${qs ? `?${qs}` : ""}${window.location.hash}`
      );
    }
  }, []);

  useEffect(() => {
    if (open && user && view === "landing") {
      // keep landing for account actions via trigger button
    }
  }, [open, user, view]);

  const handleAuth = async (
    action: "login" | "signup" | "reset" | "update_password",
    provider?: "google" | "discord"
  ) => {
    setLoading(true);
    setMessage({ type: "", text: "" });
    const supabase = createClient();

    try {
      if (provider) {
        const oauthOptions: {
          redirectTo: string;
          queryParams?: { prompt: string };
        } = {
          // Always return to the host the user started on (local / preview / prod).
          redirectTo: `${window.location.origin}/auth/callback`,
        };
        const { error } = await supabase.auth.signInWithOAuth({
          provider,
          options: oauthOptions,
        });
        if (error) throw error;
        return;
      }

      if (action === "signup") {
        if (password !== confirm) throw new Error("Passwords do not match.");
        if (!username.trim()) throw new Error("Callsign (username) is required.");
        if (username.trim().length < 2) throw new Error("Callsign must be at least 2 characters.");

        setMessage({ type: "info", text: "Opening a channel..." });
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              username: username.trim(),
              avatar_url: avatarUrl || undefined,
              newsletter_opt_in: newsletter,
            },
          },
        });
        if (error) throw error;
        if (data.user?.identities?.length === 0) {
          throw new Error("Email already registered. Try logging in.");
        }

        if (data.session && data.user) {
          const { error: profileError } = await supabase.from("profiles").upsert({
            id: data.user.id,
            email,
            username: username.trim(),
            avatar_url: avatarUrl || null,
            newsletter_opt_in: newsletter,
          });
          if (profileError) throw new Error(`DB Error: ${profileError.message}`);
          onUserChange(data.user);
          onClose();
          setView("landing");
          resetForm();
        } else {
          setMessage({
            type: "success",
            text: "Check your inbox to confirm the channel.",
          });
        }
      } else if (action === "login") {
        if (!email || !password) throw new Error("Email and password required.");
        setMessage({ type: "info", text: "Scanning credentials..." });
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (data.session) {
          onUserChange(data.user);
          onClose();
          setView("landing");
          resetForm();
        }
      } else if (action === "reset") {
        const siteOrigin =
          process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || window.location.origin;
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${siteOrigin}/?reset=true`,
        });
        if (error) throw error;
        setMessage({ type: "success", text: "Reset link sent. Check your email." });
      } else if (action === "update_password") {
        if (password !== confirm) throw new Error("Passwords do not match.");
        if (password.length < 6) throw new Error("Password must be at least 6 characters.");
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        setMessage({ type: "success_action", text: "Password recalibrated. You are online." });
        setPassword("");
        setConfirm("");
      }
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Auth failed",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOnboarding = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!username.trim() || username.trim().length < 2) {
      setMessage({ type: "error", text: "Callsign must be at least 2 characters." });
      return;
    }
    setLoading(true);
    setMessage({ type: "", text: "" });
    const supabase = createClient();
    try {
      const { error: metaErr } = await supabase.auth.updateUser({
        data: { username: username.trim(), newsletter_opt_in: newsletter },
      });
      if (metaErr) throw metaErr;

      const { error: profileError } = await supabase.from("profiles").upsert({
        id: user.id,
        email: user.email,
        username: username.trim(),
        avatar_url: avatarUrl || user.user_metadata?.avatar_url || null,
        newsletter_opt_in: newsletter,
      });
      if (profileError) throw new Error(profileError.message);

      setView("landing");
      onClose();
      resetForm();
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Could not save profile",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    onUserChange(null);
    onClose();
    setView("landing");
    resetForm();
  };

  if (!open && view !== "onboarding") return null;
  if (!open && view === "onboarding" && !user) return null;

  const show = open || (view === "onboarding" && !!user);

  if (!show) return null;

  const inputClass =
    "w-full bg-black/50 border border-white/15 rounded-xl px-4 py-3.5 text-white outline-none focus:border-[#FF5F1F] transition-colors";
  const btnPrimary =
    "w-full bg-[#FF5F1F] text-[#050505] py-3.5 rounded-2xl font-black uppercase tracking-widest text-sm hover:scale-[1.02] transition-all disabled:opacity-50";
  const btnGhost =
    "w-full bg-white/5 border border-white/15 text-white py-3.5 rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-white/10 transition-all";

  return (
    <div className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div
        className="relative w-full max-w-md overflow-hidden rounded-[28px] border border-[#FF5F1F]/35 bg-[#0a0a0a]/95 p-8 shadow-[0_0_50px_rgba(255,95,31,0.25)]"
        style={{ fontFamily: "var(--font-space), ui-sans-serif, system-ui, sans-serif" }}
      >
        <div className="pointer-events-none absolute top-0 left-1/2 h-32 w-full -translate-x-1/2 bg-[#FF5F1F] opacity-20 blur-3xl" />

        {view !== "onboarding" && (
          <button
            type="button"
            onClick={() => {
              onClose();
              setView("landing");
              setMessage({ type: "", text: "" });
            }}
            className="absolute top-5 right-5 z-50 rounded-full border border-white/15 bg-black/40 px-3 py-1 text-xs font-bold uppercase tracking-widest text-white/60 hover:text-white"
          >
            Close
          </button>
        )}

        {message.text && message.type !== "success_action" && (
          <div
            className={`mb-5 rounded-xl border p-3 text-center text-xs font-mono ${
              message.type === "error"
                ? "border-red-500/30 bg-red-500/10 text-red-400"
                : message.type === "info"
                  ? "border-[#FF5F1F]/30 bg-[#FF5F1F]/10 text-[#FF5F1F]"
                  : "border-green-500/30 bg-green-500/10 text-green-400"
            }`}
          >
            {message.text}
          </div>
        )}

        {message.type === "success_action" && (
          <div className="flex flex-col items-center py-6">
            <h2
              className="mb-3 text-center text-2xl font-black text-white"
              style={{ fontFamily: "var(--font-orbitron), sans-serif" }}
            >
              Channel Secure.
            </h2>
            <p className="mb-8 text-center text-sm text-white/60">{message.text}</p>
            <button
              type="button"
              className={btnPrimary}
              onClick={() => {
                onClose();
                setView("landing");
                setMessage({ type: "", text: "" });
              }}
            >
              Acknowledge
            </button>
          </div>
        )}

        {view === "landing" && message.type !== "success_action" && (
          <div className="flex flex-col items-center py-4">
            <p
              className="mb-2 text-[10px] font-bold uppercase tracking-[0.35em] text-[#FF5F1F]"
              style={{ fontFamily: "var(--font-orbitron), sans-serif" }}
            >
              Core Node Access
            </p>
            <h2
              className="mb-2 text-2xl font-black text-white"
              style={{ fontFamily: "var(--font-orbitron), sans-serif" }}
            >
              {user ? "Account Online" : "Join the Grid"}
            </h2>
            <p className="mb-8 px-2 text-center text-xs text-white/50">
              {user
                ? `Signed in as ${user.user_metadata?.username || user.email}`
                : "Log in to sync your constellation identity across Nexus worlds."}
            </p>
            {user ? (
              <button type="button" className={btnGhost} onClick={handleLogout}>
                Sign Out
              </button>
            ) : (
              <>
                <button type="button" className={`${btnPrimary} mb-3`} onClick={() => setView("login")}>
                  Enter Node
                </button>
                <button type="button" className={btnGhost} onClick={() => setView("signup")}>
                  Create Callsign
                </button>
              </>
            )}
          </div>
        )}

        {view === "login" && message.type !== "success_action" && (
          <div>
            <h2
              className="mb-2 text-center text-2xl font-black text-white"
              style={{ fontFamily: "var(--font-orbitron), sans-serif" }}
            >
              Enter Node
            </h2>
            <p className="mb-6 text-center text-xs text-white/50">Scan credentials to open the channel.</p>
            <div className="mb-4 space-y-3">
              <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
              <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} />
            </div>
            <button type="button" className="mb-6 text-xs text-[#FF5F1F] hover:underline" onClick={() => setView("forgot")}>
              Lost access key?
            </button>
            <button type="button" disabled={loading} className={`${btnPrimary} mb-6`} onClick={() => handleAuth("login")}>
              {loading ? "..." : "Login"}
            </button>
            <OAuthRow
              onGoogle={() => handleAuth("login", "google")}
              onDiscord={() => handleAuth("login", "discord")}
            />
            <p className="mt-6 text-center text-xs text-white/45">
              New here?{" "}
              <button type="button" className="font-bold text-[#FF5F1F]" onClick={() => setView("signup")}>
                Create callsign
              </button>
            </p>
          </div>
        )}

        {view === "signup" && message.type !== "success_action" && (
          <div className="max-h-[80vh] overflow-y-auto">
            <h2
              className="mb-2 text-center text-2xl font-black text-white"
              style={{ fontFamily: "var(--font-orbitron), sans-serif" }}
            >
              Create Callsign
            </h2>
            <p className="mb-6 text-center text-xs text-white/50">Username required. Avatar optional.</p>
            <div className="mb-4 space-y-3">
              <input type="text" placeholder="Callsign (username)" maxLength={32} value={username} onChange={(e) => setUsername(e.target.value)} className={inputClass} />
              <input type="url" placeholder="Avatar URL (optional)" value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} className={inputClass} />
              <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
              <input type="password" placeholder="Password (min 6)" value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} />
              <input type="password" placeholder="Confirm password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className={inputClass} />
            </div>
            <label className="mb-6 flex items-start gap-3 rounded-xl border border-white/10 bg-black/30 p-3 text-xs text-white/55">
              <input type="checkbox" checked={newsletter} onChange={(e) => setNewsletter(e.target.checked)} className="mt-0.5 accent-[#FF5F1F]" />
              Send me Core Node constellation updates (optional).
            </label>
            <button type="button" disabled={loading} className={`${btnPrimary} mb-6`} onClick={() => handleAuth("signup")}>
              {loading ? "..." : "Open Channel"}
            </button>
            <OAuthRow
              onGoogle={() => handleAuth("signup", "google")}
              onDiscord={() => handleAuth("signup", "discord")}
            />
            <p className="mt-6 text-center text-xs text-white/45">
              Already online?{" "}
              <button type="button" className="font-bold text-[#FF5F1F]" onClick={() => setView("login")}>
                Login
              </button>
            </p>
          </div>
        )}

        {view === "forgot" && message.type !== "success_action" && (
          <div>
            <h2
              className="mb-2 text-center text-2xl font-black text-white"
              style={{ fontFamily: "var(--font-orbitron), sans-serif" }}
            >
              Reset Key
            </h2>
            <p className="mb-6 text-center text-xs text-white/50">We will ping a recovery link to your inbox.</p>
            <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className={`${inputClass} mb-6`} />
            <button type="button" disabled={loading || !email} className={`${btnPrimary} mb-4`} onClick={() => handleAuth("reset")}>
              {loading ? "..." : "Send Reset Link"}
            </button>
            <button type="button" className="w-full text-center text-xs text-white/45 hover:text-white" onClick={() => setView("login")}>
              ← Back to login
            </button>
          </div>
        )}

        {view === "update_password" && message.type !== "success_action" && (
          <div>
            <h2
              className="mb-2 text-center text-2xl font-black text-white"
              style={{ fontFamily: "var(--font-orbitron), sans-serif" }}
            >
              Recalibrate
            </h2>
            <p className="mb-6 text-center text-xs text-white/50">Enter a new access passphrase.</p>
            <input type="password" placeholder="New password" value={password} onChange={(e) => setPassword(e.target.value)} className={`${inputClass} mb-3`} />
            <input type="password" placeholder="Confirm password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className={`${inputClass} mb-6`} />
            <button
              type="button"
              disabled={loading || !password || !confirm}
              className={btnPrimary}
              onClick={() => handleAuth("update_password")}
            >
              {loading ? "..." : "Save Password"}
            </button>
          </div>
        )}

        {view === "onboarding" && user && (
          <form onSubmit={handleOnboarding}>
            <h2
              className="mb-2 text-center text-2xl font-black text-white"
              style={{ fontFamily: "var(--font-orbitron), sans-serif" }}
            >
              Pick Callsign
            </h2>
            <p className="mb-6 text-center text-xs text-white/50">One more step — choose your grid identity.</p>
            <input
              type="text"
              placeholder="Callsign (username)"
              maxLength={32}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className={`${inputClass} mb-4`}
              required
            />
            <label className="mb-6 flex items-start gap-3 rounded-xl border border-white/10 bg-black/30 p-3 text-xs text-white/55">
              <input type="checkbox" checked={newsletter} onChange={(e) => setNewsletter(e.target.checked)} className="mt-0.5 accent-[#FF5F1F]" />
              Optional constellation newsletter.
            </label>
            <button type="submit" disabled={loading || !username.trim()} className={btnPrimary}>
              {loading ? "..." : "Initialize"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function OAuthRow({
  onGoogle,
  onDiscord,
}: {
  onGoogle: () => void;
  onDiscord: () => void;
}) {
  return (
    <>
      <div className="relative mb-6 flex items-center justify-center">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-white/10" />
        </div>
        <span className="relative bg-[#0a0a0a] px-3 text-[10px] font-mono uppercase tracking-widest text-white/40">
          Or continue with
        </span>
      </div>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onGoogle}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 py-3 text-sm text-white hover:bg-white/10"
        >
          <GoogleIcon /> Google
        </button>
        <button
          type="button"
          onClick={onDiscord}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 py-3 text-sm text-white hover:border-[#5865F2] hover:bg-[#5865F2]/20"
        >
          <DiscordIcon /> Discord
        </button>
      </div>
    </>
  );
}

/** Compact trigger for headers / CTAs */
export function NexusAuthTrigger({
  user,
  onOpen,
}: {
  user: User | null;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="inline-flex items-center justify-center rounded-full border border-[#FF5F1F]/50 bg-black/40 px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-[#FF5F1F] hover:bg-[#FF5F1F]/15 transition-colors"
      style={{ fontFamily: "var(--font-orbitron), sans-serif" }}
    >
      {user ? user.user_metadata?.username || "Account" : "Login"}
    </button>
  );
}
