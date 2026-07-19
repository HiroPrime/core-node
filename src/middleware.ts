import { NextResponse, type NextRequest } from "next/server";
import { SITE_ID, VISITOR_COOKIE } from "@/lib/site-ids";

const ONE_YEAR = 60 * 60 * 24 * 365;

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const response = NextResponse.next();
  if (request.cookies.has(VISITOR_COOKIE)) {
    return response;
  }

  const visitorId = crypto.randomUUID();
  response.cookies.set(VISITOR_COOKIE, visitorId, {
    path: "/",
    maxAge: ONE_YEAR,
    sameSite: "lax",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
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

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
