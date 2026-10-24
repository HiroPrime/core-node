import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { SITE_ID } from "@/lib/site-ids";

const METRIC_LABEL = "Population";
const ALLOWED_ORIGINS = new Set(["https://corenode.nexus", "https://www.corenode.nexus"]);

function corsHeaders(request: Request): Record<string, string> {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
    Vary: "Origin",
  };
  const origin = request.headers.get("origin");
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }
  return headers;
}

function statsResponse(request: Request, population: number) {
  const safe = Number.isFinite(population) ? Math.max(0, Math.floor(population)) : 0;
  return NextResponse.json(
    { population: safe, metric: METRIC_LABEL },
    { status: 200, headers: corsHeaders(request) }
  );
}

export async function OPTIONS(request: Request) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(request) });
}

export async function GET(request: Request) {
  try {
    const supabase = createServiceClient();
    if (!supabase) return statsResponse(request, 0);
    const { data, error } = await supabase
      .from("site_metrics")
      .select("total_unique_visitors")
      .eq("site_id", SITE_ID)
      .maybeSingle();

    if (error) {
      console.error("stats population read failed:", error.message);
      return statsResponse(request, 0);
    }

    return statsResponse(request, Number(data?.total_unique_visitors ?? 0));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("stats route error:", message);
    return statsResponse(request, 0);
  }
}
