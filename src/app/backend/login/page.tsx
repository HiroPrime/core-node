import type { Metadata } from "next";
import { safeBackendReturn } from "@/lib/backend-gate";
import LoginClient from "./LoginClient";

// Hidden owner entry (not linked anywhere). Never indexed; the headers come from src/lib/backend-proxy.ts, this is belt and braces.
export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false, nocache: true, noarchive: true, nosnippet: true },
  alternates: { canonical: null },
};

export const dynamic = "force-dynamic";

export default async function BackendLoginPage({ searchParams }: { searchParams: Promise<{ next?: string | string[] }> }) {
  const sp = await searchParams;
  const raw = Array.isArray(sp.next) ? sp.next[0] : sp.next;
  return <LoginClient next={safeBackendReturn(raw)} />;
}