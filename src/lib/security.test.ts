import assert from "node:assert/strict";
import test from "node:test";
import { isAllowedCorsOrigin, statsCorsHeaders } from "./cors";
import { MAX_PLANET_ID_LENGTH, parsePlanetId } from "./planet-id";
import { clientAddress, createRateLimiter } from "./rate-limit";
import { safeSameSitePath } from "./safe-redirect";
import { contentSecurityPolicy, securityHeaders } from "./security-headers";
import { NODES } from "./universe";

const ORIGIN = "https://corenode.nexus";

test("planet id accepts only real planets and caps length", () => {
  for (const node of NODES) {
    assert.deepEqual(parsePlanetId(node.id), { ok: true, planetId: node.id });
    assert.deepEqual(parsePlanetId(`  ${node.id}  `), { ok: true, planetId: node.id });
  }

  assert.deepEqual(parsePlanetId(""), { ok: false, error: "required" });
  assert.deepEqual(parsePlanetId("   "), { ok: false, error: "required" });
  assert.deepEqual(parsePlanetId(undefined), { ok: false, error: "required" });
  assert.deepEqual(parsePlanetId(12), { ok: false, error: "required" });
  assert.deepEqual(parsePlanetId("not-a-planet"), { ok: false, error: "invalid" });
  assert.deepEqual(parsePlanetId("Core"), { ok: false, error: "invalid" });
  assert.deepEqual(parsePlanetId("//evil.com"), { ok: false, error: "invalid" });
  assert.deepEqual(parsePlanetId(`/${"a".repeat(MAX_PLANET_ID_LENGTH)}`), {
    ok: false,
    error: "invalid",
  });
  assert.deepEqual(parsePlanetId("a".repeat(MAX_PLANET_ID_LENGTH + 1)), {
    ok: false,
    error: "invalid",
  });
  assert.equal(NODES.length > 0, true);
});

test("explore rate limit blocks a burst and resets with the window", () => {
  const limit = createRateLimiter(3, 1_000);
  const now = 10_000;
  assert.equal(limit("1.2.3.4", now).ok, true);
  assert.equal(limit("1.2.3.4", now + 1).ok, true);
  assert.equal(limit("1.2.3.4", now + 2).ok, true);
  const blocked = limit("1.2.3.4", now + 3);
  assert.equal(blocked.ok, false);
  if (!blocked.ok) assert.equal(blocked.retryAfterSeconds >= 1, true);
  assert.equal(limit("5.6.7.8", now + 3).ok, true);
  assert.equal(limit("1.2.3.4", now + 1_000).ok, true);
});

test("client address prefers the platform real ip", () => {
  const request = new Request("https://corenode.nexus/api/track/explore", {
    headers: {
      "x-real-ip": "203.0.113.8",
      "x-forwarded-for": "198.51.100.4, 203.0.113.8",
    },
  });
  assert.equal(clientAddress(request), "203.0.113.8");
  assert.equal(clientAddress(new Request("https://corenode.nexus/")), "unknown");
});

test("stats CORS reflects own origins and never uses a wildcard", () => {
  const own = [
    "https://corenode.nexus",
    "https://www.corenode.nexus",
    "https://savepoint.nexus",
    "https://primeportal.nexus",
    "https://nexusprime.nexus",
    "https://grimmfracture.nexus",
  ];
  for (const origin of own) {
    assert.equal(isAllowedCorsOrigin(origin), true);
    const headers = statsCorsHeaders(new Request("https://corenode.nexus/api/stats", { headers: { origin } }));
    assert.equal(headers["Access-Control-Allow-Origin"], origin);
    assert.equal(JSON.stringify(headers).includes("*"), false);
  }

  assert.equal(isAllowedCorsOrigin("https://evil.example"), false);
  assert.equal(isAllowedCorsOrigin("http://localhost:3001"), false);
  assert.equal(isAllowedCorsOrigin("http://localhost:3001", true), true);
  assert.equal(isAllowedCorsOrigin("http://127.0.0.1:3000", true), true);
  assert.equal(isAllowedCorsOrigin("https://localhost:3001", true), false);
  assert.equal(isAllowedCorsOrigin("null"), false);

  const blocked = statsCorsHeaders(
    new Request("https://corenode.nexus/api/stats", { headers: { origin: "https://evil.example" } }),
  );
  assert.equal(blocked["Access-Control-Allow-Origin"], undefined);
  assert.equal(blocked.Vary, "Origin");

  const sameOrigin = statsCorsHeaders(new Request("https://corenode.nexus/api/stats"));
  assert.equal(sameOrigin["Access-Control-Allow-Origin"], undefined);
});

test("auth next only accepts safe same-site relative paths", () => {
  const allowed: Array<[string, string]> = [
    ["/", "/"],
    ["/select", "/select"],
    ["/node/prime", "/node/prime"],
    ["/?reset=true", "/?reset=true"],
    ["/node/prime?x=1#y", "/node/prime?x=1#y"],
    ["/select?next=//evil.com", "/select?next=//evil.com"],
    ["/foo/../../select", "/select"],
  ];
  for (const [input, expected] of allowed) {
    assert.equal(safeSameSitePath(input, ORIGIN), expected, input);
  }

  const rejected = [
    null,
    undefined,
    "",
    "//evil.com",
    "///evil.com",
    "/\\evil.com",
    "/\\\\evil.com",
    "/\\/evil.com",
    "\\\\evil.com",
    "/\\@evil.com",
    "https://evil.com",
    "https://corenode.nexus/select",
    "//corenode.nexus/select",
    "/\\corenode.nexus",
    "/%2f%2fevil.com",
    "/%2F%2Fevil.com",
    "/%5Cevil.com",
    "/%5c%5cevil.com",
    "/%252f%252fevil.com",
    "/foo/%2e%2e//evil.com",
    "/\nevil.com",
    "/\tevil.com",
    "/%09/evil.com",
    "/select\\",
    "/select?x=\\",
    " /select",
    "a".repeat(3000),
  ];
  for (const input of rejected) {
    assert.equal(safeSameSitePath(input, ORIGIN), "/", JSON.stringify(input));
  }
});

test("security headers include CSP, nosniff, referrer, and permissions policy", () => {
  const production = contentSecurityPolicy("production");
  assert.match(production, /frame-ancestors 'none'/);
  assert.match(production, /default-src 'self'/);
  assert.match(production, /script-src 'self' 'unsafe-inline'/);
  assert.equal(production.includes("'unsafe-eval'"), false);
  assert.equal(production.includes("upgrade-insecure-requests"), false);
  assert.match(production, /style-src 'self' 'unsafe-inline'/);
  assert.match(production, /https:\/\/\*\.supabase\.co/);
  assert.equal(production.includes("gamepad"), false);

  const development = contentSecurityPolicy("development");
  assert.match(development, /'unsafe-eval'/);
  assert.equal(development.includes("upgrade-insecure-requests"), false);

  const headers = Object.fromEntries(securityHeaders("production").map((header) => [header.key, header.value]));
  assert.equal(headers["X-Content-Type-Options"], "nosniff");
  assert.equal(headers["Referrer-Policy"], "strict-origin-when-cross-origin");
  assert.match(headers["Permissions-Policy"], /camera=\(\)/);
  assert.match(headers["Permissions-Policy"], /microphone=\(\)/);
  assert.match(headers["Permissions-Policy"], /geolocation=\(\)/);
  assert.equal(headers["Permissions-Policy"].includes("gamepad"), false);
  assert.equal(headers["X-Frame-Options"], "DENY");
  assert.match(headers["Content-Security-Policy"], /frame-ancestors 'none'/);
});
