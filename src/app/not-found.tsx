import Link from "next/link";
import ArcadeSpaceBackdrop from "@/components/ArcadeSpaceBackdrop";
import { CircuitGrid } from "@/components/CircuitGrid";

export const metadata = { title: "Lost signal" };

export default function NotFound() {
  return (
    <main className="arcade">
      <ArcadeSpaceBackdrop className="is-faint" />
      <CircuitGrid />
      <div className="arcade-inner is-scrolling">
        <header className="page-head">
          <p className="arcade-kicker">404 &middot; Lost signal</p>
          <h1 className="page-title">No Node at this address</h1>
          <p className="page-lede">This corner of the Grid is empty. Pick a way back in.</p>
        </header>
        <div className="brief-actions">
          <Link href="/" className="btn primary">Press Start</Link>
          <Link href="/select" className="btn ghost">Level Select</Link>
          <Link href="/arcade" className="btn ghost">Arcade</Link>
        </div>
      </div>
    </main>
  );
}