import { NextResponse } from "next/server";
import { createServiceClient, createClient } from "@/lib/supabase/server";
import { SITE_ID } from "@/lib/site-ids";

const METRIC_LABEL = "Population";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
};

function statsResponse(population: number) {
  const safe = Number.isFinite(population) ? Math.max(0, Math.floor(population)) : 0;
  return NextResponse.json(
    { population: safe, metric: METRIC_LABEL },
    { status: 200, headers: corsHeaders }
  );
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function GET() {
  try {
    const supabase = createServiceClient() ?? (await createClient());
    const { data, error } = await supabase
      .from("site_metrics")
      .select("total_unique_visitors")
      .eq("site_id", SITE_ID)
      .maybeSingle();

    if (error) {
      console.error("stats population read failed:", error.message);
      return statsResponse(0);
    }

    return statsResponse(Number(data?.total_unique_visitors ?? 0));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("stats route error:", message);
    return statsResponse(0);
  }
}
