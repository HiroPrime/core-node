import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { SITE_STATS_ENDPOINTS, type SiteStatsResponse } from "@/lib/site-stats";
import { SITE_TO_PLANET, type NexusSiteId } from "@/lib/site-ids";

type NodePopulation = {
  population: number;
  metric: string | null;
  ok: boolean;
  error?: string;
};

async function fetchSiteStats(url: string): Promise<NodePopulation> {
  try {
    const res = await fetch(url, {
      next: { revalidate: 60 },
      headers: { Accept: "application/json" },
    });

    if (!res.ok) {
      return { population: 0, metric: null, ok: false, error: `HTTP ${res.status}` };
    }

    const data = (await res.json()) as SiteStatsResponse;
    const population = Number(data?.population);

    if (!Number.isFinite(population)) {
      return { population: 0, metric: null, ok: false, error: "Invalid population" };
    }

    return {
      population: Math.max(0, Math.floor(population)),
      metric: "Population",
      ok: true,
    };
  } catch (err) {
    return {
      population: 0,
      metric: null,
      ok: false,
      error: err instanceof Error ? err.message : "Fetch failed",
    };
  }
}

async function fromConstellationRpc(): Promise<Record<string, NodePopulation> | null> {
  const supabase = createServiceClient();
  if (!supabase) return null;

  const { data, error } = await supabase.rpc("get_constellation_population");
  if (error || !Array.isArray(data)) {
    if (error) console.error("get_constellation_population failed:", error.message);
    return null;
  }

  const nodes: Record<string, NodePopulation> = {};
  for (const row of data as { site_id?: string; total_unique_visitors?: number }[]) {
    const siteId = row.site_id as NexusSiteId | undefined;
    if (!siteId) continue;
    const planetId = SITE_TO_PLANET[siteId];
    if (!planetId) continue;
    const population = Math.max(0, Math.floor(Number(row.total_unique_visitors ?? 0)));
    nodes[planetId] = {
      population: Number.isFinite(population) ? population : 0,
      metric: "Population",
      ok: true,
    };
  }
  return nodes;
}

export async function GET() {
  const rpcNodes = await fromConstellationRpc();

  let nodes: Record<string, NodePopulation>;

  if (rpcNodes) {
    nodes = { ...rpcNodes };
    // Prime Portal stays on its own Supabase — always pull via public stats.
    nodes.prime = await fetchSiteStats(SITE_STATS_ENDPOINTS.prime);
  } else {
    const entries = await Promise.all(
      Object.entries(SITE_STATS_ENDPOINTS).map(async ([id, url]) => {
        const stats = await fetchSiteStats(url);
        return [id, stats] as const;
      })
    );
    nodes = Object.fromEntries(entries);
  }

  return NextResponse.json(
    { nodes, updatedAt: new Date().toISOString() },
    {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    }
  );
}
