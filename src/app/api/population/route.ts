import { NextResponse } from 'next/server';
import { SITE_STATS_ENDPOINTS, type SiteStatsResponse } from '@/lib/site-stats';

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
      headers: { Accept: 'application/json' },
    });

    if (!res.ok) {
      return { population: 0, metric: null, ok: false, error: `HTTP ${res.status}` };
    }

    const data = (await res.json()) as SiteStatsResponse;
    const population = Number(data?.population);

    if (!Number.isFinite(population)) {
      return { population: 0, metric: null, ok: false, error: 'Invalid population' };
    }

    return {
      population: Math.max(0, Math.floor(population)),
      metric: 'Population',
      ok: true,
    };
  } catch (err) {
    return {
      population: 0,
      metric: null,
      ok: false,
      error: err instanceof Error ? err.message : 'Fetch failed',
    };
  }
}

export async function GET() {
  const entries = await Promise.all(
    Object.entries(SITE_STATS_ENDPOINTS).map(async ([id, url]) => {
      const stats = await fetchSiteStats(url);
      return [id, stats] as const;
    })
  );

  const nodes = Object.fromEntries(entries);

  return NextResponse.json(
    { nodes, updatedAt: new Date().toISOString() },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    }
  );
}
