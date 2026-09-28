import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Core Node",
  description: "My personal Core Node.",
};

export default function MapLayout({ children }: { children: React.ReactNode }) {
  return children;
}
