/**
 * Post-login return path for /login?next=. Same-origin RELATIVE paths only; anything else becomes "/" (the homepage).
 * Rejected: absolute URLs, protocol-relative ("//host"), backslashes, control chars, "#", encoded tricks ("%" left after one decode),
 * dot segments, over-long values, and paths that would loop or hit machinery (/login, /auth, /api).
 * /auth/callback validates the value again on its side; this is the first check, not the only one.
 */
export function safeSiteNext(value: unknown): string {
  if (typeof value !== "string" || value.length === 0 || value.length > 200) return "/";
  let v: string;
  try { v = decodeURIComponent(value); } catch { return "/"; }
  if (!v.startsWith("/") || v.startsWith("//")) return "/";
  if (/[\u0000-\u001f\u007f\\#%]/.test(v) || v.includes("..")) return "/";
  const path = v.split("?")[0].toLowerCase();
  if (/^\/(login|auth|api|_next)(\/|$)/.test(path) || path.startsWith("/__")) return "/";
  return v;
}