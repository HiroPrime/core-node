import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

const PLANETS = new Set(["core", "prime", "grimm", "shipyard", "savepoint"]);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const planetId =
      typeof body?.planetId === "string" ? body.planetId.trim() : "";

    if (!planetId || !PLANETS.has(planetId)) {
      return NextResponse.json({ error: "planetId required" }, { status: 400 });
    }

    // Server-only service role. No anon fallback: without the key, skip tracking.
    const supabase = createServiceClient();
    if (!supabase) {
      return NextResponse.json({ ok: true, tracked: false });
    }

    const { error } = await supabase.rpc("track_core_node_explore", {
      p_planet_id: planetId,
    });

    if (error) {
      console.error("track_core_node_explore failed:", error.message);
      return NextResponse.json({ error: "Track failed" }, { status: 502 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("track explore error:", message);
    return NextResponse.json({ error: "Unavailable" }, { status: 503 });
  }
}
