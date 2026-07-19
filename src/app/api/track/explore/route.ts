import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const planetId =
      typeof body?.planetId === "string" ? body.planetId.trim() : "";

    if (!planetId) {
      return NextResponse.json({ error: "planetId required" }, { status: 400 });
    }

    const supabase = await createClient();
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
