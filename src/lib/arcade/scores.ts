"use client";

import { createClient } from "@/lib/supabase/client";

export type ArcadeGameId = "neon-chase" | "void-beast" | "aquatic-rush";
export const ARCADE_GAME_IDS: ArcadeGameId[] = ["neon-chase", "void-beast", "aquatic-rush"];

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
 * Record a finished run. Always kept locally; also written to Supabase when
 * signed in. Never throws: a failed upload just stays local.
 */
export async function submitScore(gameId: ArcadeGameId, score: number): Promise<"remote" | "local"> {
  const value = Math.max(0, Math.floor(Number(score) || 0));
  writeLocal(gameId, value);
  if (value <= 0 || !hasSupabaseEnv()) return "local";
  try {
    const supabase = createClient();
    const { data } = await supabase.auth.getUser();
    const user = data.user;
    if (!user) return "local";
    const { error } = await supabase.from("arcade_scores").insert({ user_id: user.id, game_id: gameId, score: value });
    return error ? "local" : "remote";
  } catch {
    return "local";
  }
}

/** Top N for a game's active season. Falls back to this device's scores. */
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

/** Best score this player has on record (remote if signed in, else local). */
export function localBest(gameId: ArcadeGameId): number {
  return (readLocal()[gameId] ?? [])[0] ?? 0;
}
