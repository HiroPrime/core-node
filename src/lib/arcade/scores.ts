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

type TopScoreRow = {
  rank: number;
  display_name: string;
  score: number;
  created_at: string;
  mine: boolean;
};

/**
 * One in-flight run token per game. Issued when the countdown starts and
 * consumed when that run's score is submitted. Guests never call the RPC.
 */
const pendingRuns = new Map<ArcadeGameId, Promise<string | null>>();

async function requestRun(gameId: ArcadeGameId): Promise<string | null> {
  if (!hasSupabaseEnv()) return null;
  try {
    const supabase = createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user || auth.user.is_anonymous) return null;
    const { data, error } = await supabase.rpc("arcade_start_run", { p_game: gameId });
    if (error || typeof data !== "string" || data.length === 0) return null;
    return data;
  } catch {
    return null;
  }
}

/** Ask the server for a single-use run token. Safe to call for guests. */
export function startRun(gameId: ArcadeGameId): void {
  pendingRuns.set(gameId, requestRun(gameId));
}

/**
 * Tell the server this signed-in run is still going, and what the score is.
 * No-ops for guests, for a run that has already been submitted, and when a
 * newer run has replaced this one. The server decides whether the beat counts.
 */
export async function checkpointRun(gameId: ArcadeGameId, score: number): Promise<void> {
  const runPromise = pendingRuns.get(gameId);
  if (!runPromise || !hasSupabaseEnv()) return;
  try {
    const runId = await runPromise;
    if (pendingRuns.get(gameId) !== runPromise || !runId) return;
    const value = Math.max(0, Math.floor(Number(score) || 0));
    const supabase = createClient();
    await supabase.rpc("arcade_checkpoint", { p_run_id: runId, p_score: value });
  } catch {
    /* the next beat tries again */
  }
}

/**
 * Record a finished run.
 * - Guests (no userId): localStorage only. Never sent to Supabase, including
 *   after the guest later signs in.
 * - Signed in: arcade_submit_score for the token issued at countdown.
 * Never throws. Never inserts into arcade_scores from the browser.
 */
export async function submitScore(
  gameId: ArcadeGameId,
  score: number,
  userId: string | null,
): Promise<"remote" | "local" | "failed"> {
  const value = Math.max(0, Math.floor(Number(score) || 0));
  const runPromise = pendingRuns.get(gameId) ?? null;
  pendingRuns.delete(gameId);

  if (!userId) {
    writeLocal(gameId, value);
    return "local";
  }
  if (value <= 0 || !hasSupabaseEnv()) return "failed";

  try {
    const supabase = createClient();
    const authPromise = supabase.auth.getUser();
    const [authResult, runId] = await Promise.all([authPromise, runPromise ?? Promise.resolve(null)]);
    const user = authResult.data.user;
    if (!user || user.id !== userId || user.is_anonymous || !runId) return "failed";
    const { data, error } = await supabase.rpc("arcade_submit_score", { p_run_id: runId, p_score: value });
    return error || data !== true ? "failed" : "remote";
  } catch {
    return "failed";
  }
}

/** Top N for a game's active season. Falls back to this device's guest scores. */
export async function fetchTopScores(gameId: ArcadeGameId, limit = 5): Promise<BoardRow[]> {
  if (hasSupabaseEnv()) {
    try {
      const supabase = createClient();
      const { data, error } = await supabase.rpc("arcade_board", { p_game: gameId, p_limit: limit });
      if (!error && Array.isArray(data)) {
        return (data as TopScoreRow[]).map((r) => ({
          rank: Number(r.rank),
          name: (r.display_name || "PLAYER").toUpperCase().slice(0, 12),
          score: Number(r.score),
          mine: r.mine === true,
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
