type CoreNodeLogoProps = {
  width?: number;
  className?: string;
  showWordmark?: boolean;
};

/** Shared Core Node mark — orange orbital ring + wordmark */
export default function CoreNodeLogo({
  width = 240,
  className = "",
  showWordmark = true,
}: CoreNodeLogoProps) {
  const mark = Math.round(width * 0.28);

  return (
    <div
      className={`flex items-center gap-[0.55em] ${className}`}
      style={{
        width,
        fontFamily: "var(--font-orbitron), ui-sans-serif, system-ui, sans-serif",
      }}
    >
      <svg
        width={mark}
        height={mark}
        viewBox="0 0 64 64"
        fill="none"
        aria-hidden
        className="shrink-0"
      >
        <circle cx="32" cy="32" r="28" stroke="#FF5F1F" strokeWidth="3" opacity="0.35" />
        <circle cx="32" cy="32" r="18" stroke="#FF5F1F" strokeWidth="2.5" opacity="0.7" />
        <circle cx="32" cy="32" r="8" fill="#FF5F1F" />
        <circle cx="32" cy="32" r="3" fill="#050505" />
        <circle cx="50" cy="18" r="3.5" fill="#FF5F1F" />
        <circle cx="14" cy="44" r="2.5" fill="#FF5F1F" opacity="0.85" />
      </svg>
      {showWordmark && (
        <span
          className="font-black tracking-tight leading-none text-[#FF5F1F]"
          style={{
            fontSize: width * 0.145,
            textShadow: "0 0 18px rgba(255,95,31,0.45)",
          }}
        >
          CORE
          <br />
          NODE
        </span>
      )}
    </div>
  );
}
