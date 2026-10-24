import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

/**
 * POST /api/arcade/admin/reset
 *
 * Admin-only. The signed-in user's email must be listed in ARCADE_ADMIN_EMAILS
 * (comma-separated). Uses the service role, server-side only.
 *
 * Body (JSON), one of:
 *   { "action": "reset-game", "gameId": "neon-chase", "scope": "season" | "all" }
 *       Deletes that game's scores in the active season (default) or every season.
 *   { "action": "new-season", "name": "Season 2", "id"?: "season-2" }
 *       Ends the active season and starts a new active one. Old scores stay.
 */

const GAME_IDS = new Set(["neon-chase", "void-beast", "aquatic-rush", "spin-ball"]);

function adminEmails() {
  return (process.env.ARCADE_ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const email = auth.user?.email?.toLowerCase();
  if (!auth.user || !email) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }
  if (!adminEmails().includes(email)) {
    return NextResponse.json({ error: "Not an arcade admin." }, { status: 403 });
  }

  const service = createServiceClient();
  if (!service) {
    return NextResponse.json({ error: "Service role is not configured." }, { status: 500 });
  }

  let body: { action?: string; gameId?: string; scope?: string; name?: string; id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body must be JSON." }, { status: 400 });
  }

  if (body.action === "reset-game") {
    const gameId = String(body.gameId ?? "");
    if (!GAME_IDS.has(gameId)) {
      return NextResponse.json({ error: "Unknown gameId." }, { status: 400 });
    }
    let query = service.from("arcade_scores").delete({ count: "exact" }).eq("game_id", gameId);
    if (body.scope !== "all") {
      const { data: active } = await service.from("arcade_seasons").select("id").eq("is_active", true).maybeSingle();
      query = query.eq("season_id", active?.id ?? "all-time");
    }
    const { error, count } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, action: "reset-game", gameId, scope: body.scope === "all" ? "all" : "season", deleted: count ?? 0 });
  }

  if (body.action === "new-season") {
    const name = String(body.name ?? "").trim().slice(0, 64);
    if (!name) return NextResponse.json({ error: "Season name required." }, { status: 400 });
    const id =
      String(body.id ?? "")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9-]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 48) || `season-${Date.now()}`;
    const now = new Date().toISOString();
    const { error: endError } = await service
      .from("arcade_seasons")
      .update({ is_active: false, ends_at: now })
      .eq("is_active", true);
    if (endError) return NextResponse.json({ error: endError.message }, { status: 500 });
    const { error } = await service.from("arcade_seasons").insert({ id, name, starts_at: now, is_active: true });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, action: "new-season", season: { id, name, starts_at: now } });
  }

  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}
