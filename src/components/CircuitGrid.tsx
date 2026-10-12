/**
 * CircuitGrid — the universe the Press Start screen sits in.
 *
 * A flat dark plane of live circuit traces. Pure CSS, no canvas: a grid of
 * traces with traces that "carry signal" — a slow gold pulse travelling along
 * them, so the plane reads as alive instead of printed.
 *
 * Kept separate from ArcadeSpaceBackdrop (stars, asteroids) so the press screen
 * can layer the two: this as the base plane, space behind it.
 */
export function CircuitGrid({ className = "" }: { className?: string }) {
  return (
    // Plain CSS classes, not Tailwind utilities: this project has no Tailwind
    // layer, so `fixed`/`inset-0` would compile to nothing. .circuit-grid pins
    // to the viewport in arcade.css so the plane is the floor of the whole site.
    <div className={`circuit-grid ${className}`} aria-hidden>
      {/* Base plane. Deliberately no solid fill: this layer sits ON TOP of the
          arcade space canvas, so an opaque background here would hide the whole
          universe. Only a faint gold bloom, then the traces over live pixels. */}
      <div
        className="circuit-layer"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 42%, rgba(227,148,26,0.06) 0%, transparent 62%)",
        }}
      />

      {/* Traces — horizontal and vertical, like a board */}
      <div
        className="circuit-traces circuit-layer"
        style={{
          backgroundImage:
            "linear-gradient(rgba(227,148,26,0.11) 1px, transparent 1px), linear-gradient(90deg, rgba(227,148,26,0.11) 1px, transparent 1px)",
          backgroundSize: "72px 72px",
          maskImage:
            "radial-gradient(ellipse 78% 66% at 50% 45%, black 12%, rgba(0,0,0,0.55) 58%, transparent 88%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 78% 66% at 50% 45%, black 12%, rgba(0,0,0,0.55) 58%, transparent 88%)",
        }}
      />

      {/* Thicker trunk lines — where signal thickens and something got built */}
      <div
        className="circuit-trunks circuit-layer"
        style={{
          backgroundImage:
            "linear-gradient(rgba(227,148,26,0.2) 2px, transparent 2px), linear-gradient(90deg, rgba(227,148,26,0.2) 2px, transparent 2px)",
          backgroundSize: "288px 288px",
          maskImage:
            "radial-gradient(ellipse 70% 60% at 50% 45%, black 8%, transparent 82%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 70% 60% at 50% 45%, black 8%, transparent 82%)",
        }}
      />

      {/* Signal running the traces */}
      <div className="circuit-signal-h circuit-layer" />
      <div className="circuit-signal-v circuit-layer" />

      {/* Nodes on the grid — solder pads */}
      <div
        className="circuit-pads circuit-layer"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(227,148,26,0.5) 1.4px, transparent 1.6px)",
          backgroundSize: "144px 144px",
          maskImage:
            "radial-gradient(ellipse 70% 60% at 50% 45%, black 10%, transparent 80%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 70% 60% at 50% 45%, black 10%, transparent 80%)",
        }}
      />
    </div>
  );
}

export default CircuitGrid;
