import type { Metadata } from "next";
import DecoyForm from "./DecoyForm";
import GoogleButton from "./GoogleButton";
import { safeSiteNext } from "@/lib/safe-next";

export const metadata: Metadata = {
  title: "Log in",
  robots: { index: false, follow: false },
  alternates: { canonical: null },
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string | string[] }> }) {
  const sp = await searchParams;
  const raw = Array.isArray(sp.next) ? sp.next[0] : sp.next;
  return (
    <main className="page login-page">
      <h1 className="login-title">Log in</h1>
      <DecoyForm />
      <div className="login-or" aria-hidden="true">or</div>
      <GoogleButton next={safeSiteNext(raw)} />
    </main>
  );
}