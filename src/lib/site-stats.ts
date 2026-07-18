/** Each site reports unique visitors as `population`. */
export type SiteStatsResponse = {
  population: number;
  metric?: string;
};

/** Public /api/stats endpoints for each constellation node. */
export const SITE_STATS_ENDPOINTS: Record<string, string> = {
  core: 'https://corenode.nexus/api/stats',
  prime: 'https://primeportal.nexus/api/stats',
  grimm: 'https://grimmfracture.nexus/api/stats',
  shipyard: 'https://nexusprime.nexus/api/stats',
  savepoint: 'https://savepoint.nexus/api/stats',
};

export function statsUrlFromExplore(exploreUrl: string): string {
  return `${new URL(exploreUrl).origin}/api/stats`;
}
