import type { Metadata } from "next";
import { ArcadeGame } from "@/components/ArcadeGame";

export const metadata: Metadata = {
  title: "Arcade — Core Node",
  description:
    "The Core Node arcade. Walk the carpet past the cabinets. NEON CHASE is the one that's on.",
};

/**
 * /arcade — the arcade floor.
 *
 * Charlie walks the carpet. Every cabinet from the sheet stands on it.
 * NEON CHASE is the one that turns on.
 */
export default function ArcadePage() {
  return (
    <main className="arcade">
      <ArcadeGame />
    </main>
  );
}
