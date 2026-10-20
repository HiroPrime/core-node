function supabaseConnectSources(): string[] {
  const sources = ["https://*.supabase.co", "wss://*.supabase.co"];
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!raw) return sources;

  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" && url.protocol !== "http:") return sources;
    const ws = `${url.protocol === "https:" ? "wss:" : "ws:"}//${url.host}`;
    if (!sources.includes(url.origin)) sources.push(url.origin);
    if (!sources.includes(ws)) sources.push(ws);
  } catch {
    // Ignore a malformed public URL and keep the hosted Supabase wildcard.
  }

  return sources;
}

/**
 * CSP that matches how this site is actually built:
 * Next serves its own scripts, fonts, and CSS. React style attributes need
 * style 'unsafe-inline'. Next's bootstrap scripts need script 'unsafe-inline'.
 * Dev uses eval for refresh; production does not.
 * Gamepad is left enabled — the arcade and node select poll the Gamepad API.
 */
export function contentSecurityPolicy(nodeEnv = process.env.NODE_ENV ?? "production"): string {
  const scriptSrc = ["'self'", "'unsafe-inline'"];
  if (nodeEnv !== "production") scriptSrc.push("'unsafe-eval'");

  const directives = [
    "default-src 'self'",
    `script-src ${scriptSrc.join(" ")}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    `connect-src 'self' ${supabaseConnectSources().join(" ")}`,
    "media-src 'self'",
    "worker-src 'self' blob:",
    "frame-src 'none'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ];

  return directives.join("; ");
}

export function securityHeaders(nodeEnv = process.env.NODE_ENV ?? "production"): { key: string; value: string }[] {
  return [
    { key: "Content-Security-Policy", value: contentSecurityPolicy(nodeEnv) },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    {
      key: "Permissions-Policy",
      value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), bluetooth=(), display-capture=(), interest-cohort=()",
    },
    { key: "X-Frame-Options", value: "DENY" },
  ];
}
