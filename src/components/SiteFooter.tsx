import Link from "next/link";
import { ME } from "@/lib/me";

/** Every page, linked for people and crawlers. Plain links, no JS needed. */
export const SITE_LINKS = [
  { href: "/", label: "Press Start" },
  { href: "/universe", label: "My Universe" },
  { href: "/select", label: "Nodes" },
  { href: "/arcade", label: "Arcade" },
  { href: "/stack", label: "Stack" },
  { href: "/contact", label: "Contact" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
];

/**
 * SiteFooter - the quiet strip under every page.
 *
 * Full-screen pages (the arcade floor, the Level Select) fill the viewport
 * above it, so here it waits below the fold instead of covering the game.
 */
export function SiteFooter() {
  return (
    <footer className="site-foot">
      <nav className="site-foot-nav" aria-label="Site">
        {SITE_LINKS.map((link) => (
          <Link key={link.href} href={link.href}>
            {link.label}
          </Link>
        ))}
      </nav>
      <div className="site-foot-contact">
        <a href={`mailto:${ME.email}`}>{ME.email}</a>
        <a href={ME.linkedin} target="_blank" rel="noopener noreferrer me">
          LinkedIn
        </a>
        <a href={ME.x} target="_blank" rel="noopener noreferrer me">
          X @basic_hiro
        </a>
      </div>
      <p className="site-foot-sign">&copy; {new Date().getFullYear()} Core Node &middot; BasicHiro</p>
    </footer>
  );
}

export default SiteFooter;