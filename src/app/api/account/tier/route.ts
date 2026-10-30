import { NextResponse } from "next/server";
import { getTier } from "@/lib/account-tier-server";

export const dynamic = "force-dynamic";

/** GET /api/account/tier -> { tier: "guest" | "basic" | "owner", signedIn: boolean }. Server-verified, never cached, reveals nothing else. */
export async function GET() {
  const tier = await getTier();
  return NextResponse.json({ tier, signedIn: tier !== "guest" }, { headers: { "Cache-Control": "private, no-store, max-age=0" } });
}