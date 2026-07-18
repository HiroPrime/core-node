import type { Metadata } from "next";
import { Orbitron } from "next/font/google";

const orbitron = Orbitron({
  subsets: ["latin"],
  variable: "--font-orbitron",
  weight: ["500", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "Core Node | Map",
  description: "Navigate the Nexus constellation map.",
};

export default function MapLayout({ children }: { children: React.ReactNode }) {
  return <div className={orbitron.variable}>{children}</div>;
}
