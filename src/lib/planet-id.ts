import { NODES } from "./universe";

/** Longest real id today is "savepoint" (9). This cap rejects oversized payloads before the allowlist. */
export const MAX_PLANET_ID_LENGTH = 64;

const REAL_PLANET_IDS = new Set(NODES.map((node) => node.id));

export type PlanetIdResult =
  | { ok: true; planetId: string }
  | { ok: false; error: "required" | "invalid" };

/**
 * Accept only a real constellation planet id.
 * Length is checked on the raw string so a huge payload is rejected before trim.
 */
export function parsePlanetId(value: unknown): PlanetIdResult {
  if (typeof value !== "string") return { ok: false, error: "required" };
  if (value.length > MAX_PLANET_ID_LENGTH) return { ok: false, error: "invalid" };

  const planetId = value.trim();
  if (!planetId) return { ok: false, error: "required" };
  if (!REAL_PLANET_IDS.has(planetId)) return { ok: false, error: "invalid" };

  return { ok: true, planetId };
}
