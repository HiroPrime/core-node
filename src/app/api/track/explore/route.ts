import { NextResponse } from "next/server";
import { parsePlanetId } from "@/lib/planet-id";
import { clientAddress, limitExplore } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const limit = limitExplore(clientAddress(request));
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many requests" },
      {
        status: 429,
        headers: { "Retry-After": String(limit.retryAfterSeconds) },
      },
    );
  }

  try {
    const body = await request.json();
    const parsed = parsePlanetId(body?.planetId);
    if (!parsed.ok) {
      const message = parsed.error === "required" ? "planetId required" : "Invalid planetId";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const supabase = await createClient();
    const { error } = await supabase.rpc("track_core_node_explore", {
      p_planet_id: parsed.planetId,
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
