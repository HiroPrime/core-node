const MAX_NEXT_LENGTH = 2048;

function isSafeRelative(value: string): boolean {
  if (!value.startsWith("/")) return false;
  // Protocol-relative ("//evil.com") and backslash forms ("/\evil.com", "/\\evil.com").
  if (value.startsWith("//") || value.startsWith("/\\")) return false;
  if (value.includes("\\")) return false;
  if (/[\u0000-\u001F\u007F]/.test(value)) return false;
  return true;
}

/**
 * Only a same-site relative path may come back from `next`.
 * Anything else, including protocol-relative and backslash tricks, becomes "/".
 */
export function safeSameSitePath(next: string | null | undefined, origin: string): string {
  if (typeof next !== "string" || next.length === 0 || next.length > MAX_NEXT_LENGTH) {
    return "/";
  }
  if (!isSafeRelative(next)) return "/";

  let decoded = next;
  for (let i = 0; i < 4; i++) {
    let step: string;
    try {
      step = decodeURIComponent(decoded);
    } catch {
      break;
    }
    if (step === decoded) break;
    decoded = step;
    if (!isSafeRelative(decoded)) return "/";
  }

  let resolved: URL;
  try {
    resolved = new URL(next, origin);
  } catch {
    return "/";
  }

  if (resolved.origin !== origin) return "/";
  if (resolved.username || resolved.password) return "/";
  if (!isSafeRelative(resolved.pathname)) return "/";
  if (resolved.search.includes("\\") || resolved.hash.includes("\\")) return "/";

  return `${resolved.pathname}${resolved.search}${resolved.hash}`;
}
