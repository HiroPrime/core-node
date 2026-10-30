import type { Metadata } from "next";
import DecoyForm from "./DecoyForm";
import GoogleButton from "./GoogleButton";

export const metadata: Metadata = {
  title: "Log in",
  robots: { index: false, follow: false },
  alternates: { canonical: null },
};

export default function LoginPage() {
  return (
    <main className="page login-page">
      <h1 className="login-title">Log in</h1>
      <DecoyForm />
      <div className="login-or" aria-hidden="true">or</div>
      <GoogleButton />
    </main>
  );
}