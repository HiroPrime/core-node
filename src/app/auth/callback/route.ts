import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Cookie set by NexusAuthModal before an OAuth redirect: where to go after. */
const NEXT_COOKIE = "auth_next";

/** Only same-site relative paths ("/arcade"), never "//evil" or "/\evil". */
function safePath(value: string | null | undefined): string | null {
  if (!value) return null;
  let v = value;
  try {
    v = decodeURIComponent(value);
  } catch {
    return null;
  }
  if (!v.startsWith("/") || v.startsWith("//") || v.includes("\\") || /[\r\n]/.test(v)) return null;
  return v;
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next =
    safePath(searchParams.get("next")) ?? safePath(request.cookies.get(NEXT_COOKIE)?.value) ?? "/";

  const done = (to: string) => {
    const res = NextResponse.redirect(`${origin}${to}`);
    res.cookies.set(NEXT_COOKIE, "", { path: "/", maxAge: 0 });
    return res;
  };

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Single session: revoke this account's other sessions (refresh tokens).
      await supabase.auth.signOut({ scope: "others" }).catch(() => undefined);
      return done(next);
    }
  }

  return done(next === "/" ? "/?auth_error=callback_failed" : `${next}${next.includes("?") ? "&" : "?"}auth_error=callback_failed`);
}