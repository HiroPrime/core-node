"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { ArcadeGame } from "@/components/ArcadeGame";
import NexusAuthModal from "@/components/NexusAuthModal";
import { ArcadeStartScreen } from "@/components/arcade/ArcadeStartScreen";
import { CharacterSelect } from "@/components/arcade/CharacterSelect";
import { loadDisplayName, loadSavedCharacter, saveCharacter } from "@/lib/arcade/player";
import { createClient } from "@/lib/supabase/client";
import { clearClaim, currentClaim, startSessionGuard, type SessionClaim } from "@/lib/session-guard";

/**
 * Arcade outer shell: start screen -> sign in -> character select -> floor.
 * The main page stays up for signed-in players; Play uses their saved character
 * or opens character select. That is the same start path as before.
 */

type Stage = "boot" | "start" | "select" | "world";

const hasSupabase = () =>
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export function ArcadeShell() {
  const [stage, setStage] = useState<Stage>(() => (hasSupabase() ? "boot" : "start"));
  const [user, setUser] = useState<User | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [name, setName] = useState<string | null>(null);
  const [characterId, setCharacterId] = useState<string | null>(null);
  const booted = useRef(false);
  const wantsSelect = useRef(false);
  const userIdRef = useRef<string | null>(null);
  const [claim, setClaim] = useState<SessionClaim | null>(null);
  const [claimFresh, setClaimFresh] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const kicked = useRef(false);

  /** Mint or reuse this browser's login claim for the user. */
  const adopt = useCallback((u: User | null, freshLogin: boolean) => {
    if (!u) {
      setClaim(null);
      return;
    }
    kicked.current = false;
    const next = currentClaim(u.id, freshLogin);
    setClaim(next.claim);
    setClaimFresh(next.fresh);
  }, []);

  /** A newer login of this account exists: sign out here, back to start. */
  const kick = useCallback(() => {
    if (kicked.current) return;
    kicked.current = true;
    const uid = userIdRef.current;
    if (uid) clearClaim(uid);
    userIdRef.current = null;
    setUser(null);
    setClaim(null);
    setAuthOpen(false);
    setStage("start");
    setNotice("Signed in on another device");
    window.setTimeout(() => setNotice(null), 6000);
    void createClient().auth.signOut({ scope: "local" }).catch(() => undefined);
  }, []);

  const fallbackName = (u: User) =>
    (u.user_metadata?.username as string | undefined) ||
    (u.user_metadata?.full_name as string | undefined) ||
    (u.email ? u.email.split("@")[0] : "PLAYER");

  const enterAs = useCallback(async (u: User | null, fromBoot: boolean) => {
    const saved = await loadSavedCharacter(u?.id ?? null);
    if (u) setName(await loadDisplayName(u.id, fallbackName(u)));
    setCharacterId(saved);
    // Main page first. Play (onStart) is what enters the floor or character select.
    if (fromBoot) setStage("start");
    else setStage(saved && !wantsSelect.current ? "world" : "select");
  }, []);

  useEffect(() => {
    if (!hasSupabase()) return;
    const supabase = createClient();
    let alive = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      const u = data.session?.user ?? null;
      userIdRef.current = u?.id ?? null;
      setUser(u);
      adopt(u, false);
      booted.current = true;
      void enterAs(u, true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      const prev = userIdRef.current;
      userIdRef.current = u?.id ?? null;
      setUser(u);
      if (booted.current && prev !== (u?.id ?? null)) adopt(u, Boolean(u));
      if (booted.current && u && prev !== u.id) {
        // Signed in from the modal (email/password) without leaving the page.
        setAuthOpen(false);
        void enterAs(u, false);
      }
    });
    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, [enterAs, adopt]);

  // Single session: listen on `session:<user_id>` for a newer login.
  useEffect(() => {
    if (!user || !claim || !hasSupabase()) return;
    return startSessionGuard(createClient(), user.id, claim, claimFresh, kick);
  }, [user, claim, claimFresh, kick]);

  const pick = (id: string) => {
    setCharacterId(id);
    void saveCharacter(user?.id ?? null, id);
    setStage("world");
  };

  return (
    <>
      {notice && (
        <p className="arcade-session-notice" role="status">
          {notice}
        </p>
      )}
      {(stage === "boot" || stage === "start") && (
        <ArcadeStartScreen
          entryReady={stage === "start"}
          onStart={() => {
            wantsSelect.current = false;
            setStage(characterId ? "world" : "select");
          }}
          onSignIn={() => {
            // The modal returns OAuth to this page. /login sends people home, so it is only the fallback when Supabase is not configured.
            if (hasSupabase()) setAuthOpen(true);
            else window.location.assign("/login");
          }}
        />
      )}
      {stage === "select" && (
        <CharacterSelect initial={characterId} playerName={user ? name : null} onPick={pick} />
      )}
      {stage === "world" && (
        <ArcadeGame
          key={characterId ?? "charlie"}
          characterId={characterId ?? "charlie"}
          playerName={user ? name : null}
          userId={user?.id ?? null}
          sessionClaim={claim}
          onSuperseded={kick}
          onChangeCharacter={user ? () => setStage("select") : undefined}
        />
      )}
      {hasSupabase() && (
        <NexusAuthModal open={authOpen} onClose={() => setAuthOpen(false)} user={user} onUserChange={setUser} />
      )}
    </>
  );
}

export default ArcadeShell;
