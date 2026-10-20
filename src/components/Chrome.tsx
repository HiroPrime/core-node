import Link from "next/link";
import { CoreNodeLogo } from "@/components/CoreNodeLogo";
import { SiteFooter } from "@/components/SiteFooter";

const LINKS = [
  { href: "/", label: "Press Start" },
  { href: "/select", label: "Nodes" },
  { href: "/arcade", label: "Arcade" },
  { href: "/stack", label: "Stack" },
];

export function Chrome({ children }: { children?: React.ReactNode }) {
  return (
    <>
      <header className="chrome">
        <Link href="/" className="chrome-mark" aria-label="Core Node">
          <CoreNodeLogo size={40} />
        </Link>
        <nav className="chrome-nav">
          {LINKS.map((link) => (
            <Link key={link.href} href={link.href}>
              {link.label}
            </Link>
          ))}
        </nav>
      </header>
      {children}
      <SiteFooter />
    </>
  );
}

export default Chrome;