"use client";

import { createClient } from "@/lib/supabase/client";

export type ArcadeGameId = "neon-chase" | "void-beast" | "aquatic-rush" | "spin-ball";
export const ARCADE_GAME_IDS: ArcadeGameId[] = ["neon-chase", "void-beast", "aquatic-rush", "spin-ball"];

export type BoardRow = { rank: number; name: string; score: number; mine?: boolean };

const LOCAL_KEY = "arcade-local-scores-v1";
const LOCAL_NAME = "YOU";

type LocalScores = Partial<Record<ArcadeGameId, number[]>>;

function readLocal(): LocalScores {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY) || "{}") as LocalScores;
  } catch {
    return {};
  }
}

function writeLocal(gameId: ArcadeGameId, score: number) {
  try {
    const all = readLocal();
    const list = [...(all[gameId] ?? []), score].sort((a, b) => b - a).slice(0, 10);
    all[gameId] = list;
    localStorage.setItem(LOCAL_KEY, JSON.stringify(all));
  } catch {
    /* private mode */
  }
}

function hasSupabaseEnv() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

/**
 * Record a finished run.
 * - Guests (no userId): localStorage only. Never sent to Supabase.
 * - Signed in: written to Supabase for that account (RLS also requires a
 *   real, non-anonymous session whose uid matches).
 * Never throws.
 */
export async function submitScore(
  gameId: ArcadeGameId,
  score: number,
  userId: string | null,
): Promise<"remote" | "local" | "failed"> {
  const value = Math.max(0, Math.floor(Number(score) || 0));
  if (!userId) {
    writeLocal(gameId, value);
    return "local";
  }
  if (value <= 0 || !hasSupabaseEnv()) return "failed";
  try {
    const supabase = createClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user || data.user.id !== userId || data.user.is_anonymous) return "failed";
    const { error } = await supabase.from("arcade_scores").insert({ user_id: userId, game_id: gameId, score: value });
    return error ? "failed" : "remote";
  } catch {
    return "failed";
  }
}

/**
 * On sign-in: save this browser's guest best per game to the account, then
 * clear the guest scores so they are only uploaded once. Returns how many
 * games were saved.
 */
export async function syncGuestScores(userId: string): Promise<number> {
  const all = readLocal();
  const bests = ARCADE_GAME_IDS.map((g) => [g, (all[g] ?? [])[0] ?? 0] as const).filter(([, v]) => v > 0);
  if (!bests.length || !hasSupabaseEnv()) return 0;
  try {
    const supabase = createClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user || data.user.id !== userId || data.user.is_anonymous) return 0;
    const { error } = await supabase
      .from("arcade_scores")
      .insert(bests.map(([game_id, score]) => ({ user_id: userId, game_id, score })));
    if (error) return 0;
    localStorage.removeItem(LOCAL_KEY);
    return bests.length;
  } catch {
    return 0;
  }
}

/** Top N for a game's active season. Falls back to this device's guest scores. */
export async function fetchTopScores(gameId: ArcadeGameId, limit = 5, myUserId?: string | null): Promise<BoardRow[]> {
  if (hasSupabaseEnv()) {
    try {
      const supabase = createClient();
      const { data, error } = await supabase.rpc("arcade_top_scores", { p_game_id: gameId, p_limit: limit });
      if (!error && Array.isArray(data)) {
        return (data as { rank: number; user_id: string; username: string; score: number }[]).map((r) => ({
          rank: Number(r.rank),
          name: (r.username || "PLAYER").toUpperCase().slice(0, 12),
          score: r.score,
          mine: Boolean(myUserId && r.user_id === myUserId),
        }));
      }
    } catch {
      /* fall through to local */
    }
  }
  const local = readLocal()[gameId] ?? [];
  return local.slice(0, limit).map((score, i) => ({ rank: i + 1, name: LOCAL_NAME, score, mine: true }));
}

/** Best guest score on this device. */
export function localBest(gameId: ArcadeGameId): number {
  return (readLocal()[gameId] ?? [])[0] ?? 0;
}
