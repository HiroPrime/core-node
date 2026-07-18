import type { Metadata } from "next";
import { Orbitron, Space_Grotesk } from "next/font/google";
import PlanetOnePager from "./PlanetOnePager";

const orbitron = Orbitron({
  subsets: ["latin"],
  variable: "--font-orbitron",
  weight: ["500", "700", "800", "900"],
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Core Node | Planet",
  description: "The central node of the Nexus constellation — digital foundry and living ecosystem hub.",
};

export default function PlanetPage() {
  return (
    <div className={`${orbitron.variable} ${spaceGrotesk.variable}`}>
      <PlanetOnePager />
    </div>
  );
}
