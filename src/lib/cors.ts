/**
 * Origins allowed to read public stats from the browser.
 * Same-origin requests do not need CORS. These are this site plus the other
 * Nexus properties that share the population contract.
 */
const OWN_ORIGINS = new Set([
  "https://corenode.nexus",
  "https://www.corenode.nexus",
  "https://savepoint.nexus",
  "https://www.savepoint.nexus",
  "https://primeportal.nexus",
  "https://www.primeportal.nexus",
  "https://nexusprime.nexus",
  "https://www.nexusprime.nexus",
  "https://grimmfracture.nexus",
  "https://www.grimmfracture.nexus",
]);

export function isAllowedCorsOrigin(origin: string, allowLocalhost = false): boolean {
  if (OWN_ORIGINS.has(origin)) return true;
  if (!allowLocalhost) return false;

  try {
    const url = new URL(origin);
    return url.protocol === "http:" && (url.hostname === "localhost" || url.hostname === "127.0.0.1");
  } catch {
    return false;
  }
}

export function statsCorsHeaders(request: Request): Record<string, string> {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin",
    "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
  };

  const origin = request.headers.get("origin");
  const allowLocalhost = process.env.NODE_ENV !== "production";
  if (origin && isAllowedCorsOrigin(origin, allowLocalhost)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }

  return headers;
}
