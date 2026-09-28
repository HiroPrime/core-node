export function CoreNodeLogo({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <circle cx="32" cy="32" r="22" fill="none" stroke="#e3941a" strokeWidth="2.2" />
      <circle cx="32" cy="32" r="8" fill="none" stroke="#e3941a" strokeWidth="2" />
      <circle cx="32" cy="10" r="3.4" fill="#e3941a" />
      <circle cx="51" cy="43" r="3.4" fill="#e3941a" />
      <circle cx="13" cy="43" r="3.4" fill="#e3941a" />
    </svg>
  );
}

export default CoreNodeLogo;
