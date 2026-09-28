type CoreNodeLogoProps = {
  size?: number;
  width?: number;
  className?: string;
  showWordmark?: boolean;
};

export function CoreNodeLogo({
  size,
  width,
  className = "",
  showWordmark = false,
}: CoreNodeLogoProps) {
  const mark = size ?? (width ? Math.round(width * 0.28) : 36);

  return (
    <div
      className={`flex items-center gap-[0.55em] ${className}`}
      style={width ? { width } : undefined}
    >
      <svg width={mark} height={mark} viewBox="0 0 64 64" aria-hidden className="shrink-0">
        <circle cx="32" cy="32" r="22" fill="none" stroke="#e3941a" strokeWidth="2.2" />
        <circle cx="32" cy="32" r="8" fill="none" stroke="#e3941a" strokeWidth="2" />
        <circle cx="32" cy="10" r="3.4" fill="#e3941a" />
        <circle cx="51" cy="43" r="3.4" fill="#e3941a" />
        <circle cx="13" cy="43" r="3.4" fill="#e3941a" />
      </svg>
      {showWordmark && (
        <span
          className="font-black tracking-tight leading-none text-[#e3941a]"
          style={{ fontSize: (width ?? mark * 4) * 0.145 }}
        >
          CORE
          <br />
          NODE
        </span>
      )}
    </div>
  );
}

export default CoreNodeLogo;
