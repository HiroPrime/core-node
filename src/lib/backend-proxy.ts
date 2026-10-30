import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { decideBackend, type GateUser } from "./backend-gate.ts";

/** Sent on every /backend answer, allowed or not: never indexed, never cached. */
const PRIVATE_HEADERS = {
  "X-Robots-Tag": "noindex, nofollow, noarchive, nosnippet",
  "Cache-Control": "private, no-store, max-age=0",
};

/**
 * /backend: the owner-only door to nexus-control's hidden Art Studio. Runs before everything else in src/proxy.ts.
 * Allowed requests are REWRITTEN (the corenode.nexus URL never changes); everything else is the site's normal 404.
 * Rules live in src/lib/backend-gate.ts (and are unit-tested there).
 */
export async function backendProxy(request: NextRequest): Promise<NextResponse> {
  const pending: { name: string; value: string; options?: Parameters<NextResponse["cookies"]["set"]>[2] }[] = [];

  const getUser = async (): Promise<GateUser> => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anon) return null;
    const supabase = createServerClient(url, anon, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (list) => { pending.push(...list); }, // token refresh: handed back to the browser below, never to nexus-control
      },
    });
    // getUser() asks Supabase to verify the access token; it is not just a cookie decode.
    const { data } = await supabase.auth.getUser();
    return (data.user as GateUser) ?? null;
  };

  const d = await decideBackend({
    pathname: request.nextUrl.pathname,
    search: request.nextUrl.search,
    method: request.method,
    authorization: request.headers.get("authorization"),
    getUser,
  });

  if (d.action === "notfound") {
    // Rewrite to a path that does not exist: the site's own 404 page, same as any unknown URL.
    return NextResponse.rewrite(new URL("/__backend-not-found", request.url), { headers: PRIVATE_HEADERS });
  }

  const headers = new Headers(request.headers);
  for (const h of d.remove) headers.delete(h);
  for (const [k, v] of Object.entries(d.set)) headers.set(k, v);
  const res = NextResponse.rewrite(new URL(d.url), { request: { headers }, headers: PRIVATE_HEADERS });
  if (d.kind === "owner") for (const c of pending) res.cookies.set(c.name, c.value, c.options);
  return res;
}
