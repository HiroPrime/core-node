/** Shared Nexus site IDs for visitor + metrics tracking. */
export const NEXUS_SITES = [
  "core_node",
  "nexus_prime",
  "grimm_fracture",
  "save_point",
  "kidquest",
  "my_character",
] as const;

export type NexusSiteId = (typeof NEXUS_SITES)[number];

export const SITE_ID: NexusSiteId = "core_node";
export const VISITOR_COOKIE = "cn_vid";

/** Map Core Node planet carousel ids → Nexus site_metrics ids (null = external Prime Portal). */
export const PLANET_TO_SITE: Record<string, NexusSiteId | null> = {
  core: "core_node",
  shipyard: "nexus_prime",
  grimm: "grimm_fracture",
  savepoint: "save_point",
  prime: null,
};

/** Map Nexus site_id → constellation planet id used by /api/population. */
export const SITE_TO_PLANET: Partial<Record<NexusSiteId, string>> = {
  core_node: "core",
  nexus_prime: "shipyard",
  grimm_fracture: "grimm",
  save_point: "savepoint",
};
