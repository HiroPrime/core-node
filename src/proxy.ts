import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SITE_ID, VISITOR_COOKIE } from "@/lib/site-ids";
import { BACKEND_BASE } from "@/lib/backend-gate";
import { backendProxy } from "@/lib/backend-proxy";

const ONE_YEAR = 60 * 60 * 24 * 365;

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // /backend is owner-only and decided entirely by backendProxy (404 unless allowed). It runs before every other rule on purpose.
  if (pathname === BACKEND_BASE || pathname.startsWith(BACKEND_BASE + "/")) {
    return backendProxy(request);
  }

  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Safety net: if Supabase falls back to the Site URL ("/?code=..."), finish the
  // OAuth exchange in /auth/callback (which returns to the saved path).
  if (pathname === "/" && request.nextUrl.searchParams.has("code") && !request.nextUrl.searchParams.has("reset")) {
    const cb = request.nextUrl.clone();
    cb.pathname = "/auth/callback";
    return NextResponse.redirect(cb);
  }

  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (url && anon) {
    const supabase = createServerClient(url, anon, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    });
    await supabase.auth.getUser();
  }

  if (!request.cookies.has(VISITOR_COOKIE)) {
    const visitorId = crypto.randomUUID();
    response.cookies.set(VISITOR_COOKIE, visitorId, {
      path: "/",
      maxAge: ONE_YEAR,
      sameSite: "lax",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
    });

    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (url && key) {
      void fetch(`${url}/rest/v1/rpc/record_unique_visitor`, {
        method: "POST",
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          p_site_id: SITE_ID,
          p_visitor_key: visitorId,
        }),
      }).catch(() => {});
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
