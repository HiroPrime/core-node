import { NextResponse } from "next/server";
import { statsCorsHeaders } from "@/lib/cors";
import { SITE_ID } from "@/lib/site-ids";
import { createServiceClient, createClient } from "@/lib/supabase/server";

const METRIC_LABEL = "Population";

function statsResponse(population: number, request: Request) {
  const safe = Number.isFinite(population) ? Math.max(0, Math.floor(population)) : 0;
  return NextResponse.json(
    { population: safe, metric: METRIC_LABEL },
    { status: 200, headers: statsCorsHeaders(request) },
  );
}

export async function OPTIONS(request: Request) {
  return new NextResponse(null, { status: 204, headers: statsCorsHeaders(request) });
}

export async function GET(request: Request) {
  try {
    const supabase = createServiceClient() ?? (await createClient());
    const { data, error } = await supabase
      .from("site_metrics")
      .select("total_unique_visitors")
      .eq("site_id", SITE_ID)
      .maybeSingle();

    if (error) {
      console.error("stats population read failed:", error.message);
      return statsResponse(0, request);
    }

    return statsResponse(Number(data?.total_unique_visitors ?? 0), request);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("stats route error:", message);
    return statsResponse(0, request);
  }
}
