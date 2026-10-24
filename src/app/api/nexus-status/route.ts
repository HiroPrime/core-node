import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PRIVATE_HEADERS = {
  "Cache-Control": "no-store",
  "X-Robots-Tag": "noindex",
};

/**
 * Cabinets this dashboard reports. The three playable games are the only
 * `arcade_scores.game_id` values the table allows. SPIN-BALL is on the floor
 * but has no score rows yet, so it is still listed.
 */
const GAMES = [
  { id: "neon-chase", name: "NEON CHASE" },
  { id: "void-beast", name: "VOID BEAST" },
  { id: "aquatic-rush", name: "AQUATIC RUSH" },
  { id: "spin-ball", name: "SPIN-BALL" },
] as const;

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

type GameStat = { name: string; plays: number | null; highScore: number | null };

type NexusStatus = {
  stats: { label: string; value: number | null }[];
  updatedAt: string;
  details: {
    games: GameStat[];
    signedInVsGuest: { signedIn: number | null; guest: number | null };
    signupsByProvider: { google: number | null; discord: number | null };
  };
};

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: PRIVATE_HEADERS });
}

/** Bearer token must match NEXUS_STATUS_TOKEN. Unset env or any mismatch is unauthorized. */
function bearerAuthorized(request: Request): boolean {
  const expected = process.env.NEXUS_STATUS_TOKEN;
  if (!expected) return false;

  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return false;

  const provided = Buffer.from(header.slice("Bearer ".length));
  const secret = Buffer.from(expected);
  if (provided.length !== secret.length) return false;
  return timingSafeEqual(provided, secret);
}

function earliestProvider(
  identities: { provider?: string; created_at?: string }[] | undefined,
  fallback: unknown,
): string | null {
  let chosen: string | null = null;
  let chosenAt = Number.POSITIVE_INFINITY;
  for (const identity of identities ?? []) {
    if (!identity.provider) continue;
    const parsed = identity.created_at ? Date.parse(identity.created_at) : Number.NaN;
    const stamp = Number.isFinite(parsed) ? parsed : Number.POSITIVE_INFINITY;
    if (chosen === null || stamp < chosenAt) {
      chosen = identity.provider;
      chosenAt = stamp;
    }
  }
  if (chosen) return chosen;
  return typeof fallback === "string" && fallback ? fallback : null;
}

async function countScores(
  supabase: SupabaseClient,
  opts: { gameId?: string; since?: string },
): Promise<number | null> {
  try {
    let query = supabase.from("arcade_scores").select("score", { count: "exact", head: true });
    if (opts.gameId) query = query.eq("game_id", opts.gameId);
    if (opts.since) query = query.gte("created_at", opts.since);
    const { count, error } = await query;
    if (error || count === null) {
      if (error) console.error("nexus-status arcade_scores count failed:", error.message);
      return null;
    }
    return count;
  } catch (err) {
    console.error("nexus-status arcade_scores count failed:", err instanceof Error ? err.message : "Unknown error");
    return null;
  }
}

async function maxScore(supabase: SupabaseClient, gameId?: string): Promise<number | null> {
  try {
    let query = supabase.from("arcade_scores").select("score");
    if (gameId) query = query.eq("game_id", gameId);
    const { data, error } = await query.order("score", { ascending: false }).limit(1);
    if (error) {
      console.error("nexus-status arcade_scores max failed:", error.message);
      return null;
    }
    const raw = data?.[0]?.score;
    if (raw === undefined || raw === null) return null;
    const value = typeof raw === "number" ? raw : Number(raw);
    return Number.isFinite(value) ? value : null;
  } catch (err) {
    console.error("nexus-status arcade_scores max failed:", err instanceof Error ? err.message : "Unknown error");
    return null;
  }
}

async function countPlayers(supabase: SupabaseClient): Promise<number | null> {
  try {
    const { count, error } = await supabase
      .from("arcade_players")
      .select("character_id", { count: "exact", head: true });
    if (error || count === null) {
      if (error) console.error("nexus-status arcade_players count failed:", error.message);
      return null;
    }
    return count;
  } catch (err) {
    console.error("nexus-status arcade_players count failed:", err instanceof Error ? err.message : "Unknown error");
    return null;
  }
}

/** Count-only. Service role required — anon RLS would hide every row and look like zero. */
async function countProfiles(supabase: SupabaseClient): Promise<number | null> {
  try {
    const { count, error } = await supabase.from("profiles").select("created_at", { count: "exact", head: true });
    if (error || count === null) {
      if (error) console.error("nexus-status profiles count failed:", error.message);
      return null;
    }
    return count;
  } catch (err) {
    console.error("nexus-status profiles count failed:", err instanceof Error ? err.message : "Unknown error");
    return null;
  }
}

/**
 * Non-anonymous accounts, split by the provider on their earliest identity
 * (the one they signed up with). Only the three counts leave this function.
 */
async function countSignups(
  supabase: SupabaseClient,
): Promise<{ total: number; google: number; discord: number } | null> {
  try {
    const perPage = 1000;
    let page = 1;
    let total = 0;
    let google = 0;
    let discord = 0;

    for (;;) {
      const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
      if (error) {
        console.error("nexus-status signup count failed:", error.message);
        return null;
      }
      const users = data?.users ?? [];
      for (const user of users) {
        if (user.is_anonymous || user.deleted_at) continue;
        total += 1;
        const provider = earliestProvider(user.identities, user.app_metadata?.provider);
        if (provider === "google") google += 1;
        else if (provider === "discord") discord += 1;
      }
      if (users.length < perPage) break;
      page += 1;
      if (page > 100) return null;
    }

    return { total, google, discord };
  } catch (err) {
    console.error("nexus-status signup count failed:", err instanceof Error ? err.message : "Unknown error");
    return null;
  }
}

function statusPayload(input: {
  updatedAt: string;
  plays7d: number | null;
  topScore: number | null;
  signups: number | null;
  games: GameStat[];
  signedIn: number | null;
  google: number | null;
  discord: number | null;
}): NexusStatus {
  return {
    stats: [
      { label: "Plays (7d)", value: input.plays7d },
      { label: "Top high score", value: input.topScore },
      { label: "Sign-ups", value: input.signups },
      // Floor presence and spectator sessions are Realtime broadcasts, not rows.
      { label: "Live viewers", value: null },
    ],
    updatedAt: input.updatedAt,
    details: {
      games: input.games,
      // Guest runs never leave the browser, so there is no guest total to count.
      signedInVsGuest: { signedIn: input.signedIn, guest: null },
      signupsByProvider: { google: input.google, discord: input.discord },
    },
  };
}

async function buildStatus(): Promise<NexusStatus> {
  const updatedAt = new Date().toISOString();
  const blankGames: GameStat[] = GAMES.map((game) => ({ name: game.name, plays: null, highScore: null }));
  const service = createServiceClient();

  let db: SupabaseClient | null = service;
  if (!db) {
    try {
      db = await createClient();
    } catch (err) {
      console.error("nexus-status client failed:", err instanceof Error ? err.message : "Unknown error");
      db = null;
    }
  }

  if (!db) {
    return statusPayload({
      updatedAt,
      plays7d: null,
      topScore: null,
      signups: null,
      games: blankGames,
      signedIn: null,
      google: null,
      discord: null,
    });
  }

  const since = new Date(Date.now() - WEEK_MS).toISOString();
  const [plays7d, topScore, signedIn, games, signups] = await Promise.all([
    countScores(db, { since }),
    maxScore(db),
    countPlayers(db),
    Promise.all(
      GAMES.map(async (game) => ({
        name: game.name,
        plays: await countScores(db, { gameId: game.id }),
        highScore: await maxScore(db, game.id),
      })),
    ),
    service
      ? countSignups(service).then(async (counted) => {
          if (counted) return counted;
          const total = await countProfiles(service);
          return { total, google: null as number | null, discord: null as number | null };
        })
      : Promise.resolve({ total: null as number | null, google: null as number | null, discord: null as number | null }),
  ]);

  return statusPayload({
    updatedAt,
    plays7d,
    topScore,
    signups: signups.total,
    games,
    signedIn,
    google: signups.google,
    discord: signups.discord,
  });
}

export async function GET(request: Request) {
  if (!bearerAuthorized(request)) return json({ error: "Unauthorized" }, 401);

  try {
    return json(await buildStatus());
  } catch (err) {
    console.error("nexus-status failed:", err instanceof Error ? err.message : "Unknown error");
    return json(
      statusPayload({
        updatedAt: new Date().toISOString(),
        plays7d: null,
        topScore: null,
        signups: null,
        games: GAMES.map((game) => ({ name: game.name, plays: null, highScore: null })),
        signedIn: null,
        google: null,
        discord: null,
      }),
    );
  }
}
