import { NextResponse } from 'next/server';

/**
 * Core Node public stats.
 * Population = unique visitor count (stubbed at 0 until local tracking exists).
 */
export async function GET() {
  const body = {
    population: 0,
    metric: 'Population',
  };

  return NextResponse.json(body, {
    headers: {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
