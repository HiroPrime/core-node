import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Core Node",
  description: "A press. BasicHiro & Mora Fae.",
};

export default function MapLayout({ children }: { children: React.ReactNode }) {
  return children;
}
