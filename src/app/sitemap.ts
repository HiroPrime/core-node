import type { MetadataRoute } from "next";
import { NODES } from "@/lib/universe";

const BASE = "https://corenode.nexus";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = ["", "/universe", "/select", "/arcade", "/stack", "/contact"];
  return [
    ...pages.map((path) => ({
      url: `${BASE}${path}`,
      changeFrequency: "weekly" as const,
      priority: path === "" ? 1 : 0.7,
    })),
    ...NODES.map((node) => ({
      url: `${BASE}/node/${node.id}`,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];
}