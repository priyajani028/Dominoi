/** Dominoi mark: two dominoes leaning into an A-frame, the red ball rolling underneath. Matches public/favicon.svg. */
export default function Logo({ size = 30, className = '' }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <rect width="64" height="64" rx="15" fill="#26221f" />
      <g transform="rotate(19.5 16 52)">
        <rect x="12" y="16" width="8" height="36" rx="2" fill="#fbf9f5" />
        <rect x="13.2" y="33.4" width="5.6" height="1.3" rx=".6" fill="#c9c1b5" />
      </g>
      <g transform="rotate(-19.5 48 52)">
        <rect x="44" y="16" width="8" height="36" rx="2" fill="#fbf9f5" />
        <rect x="45.2" y="33.4" width="5.6" height="1.3" rx=".6" fill="#c9c1b5" />
      </g>
      <circle cx="32" cy="46" r="6.5" fill="#e3123a" />
      <circle cx="29.8" cy="43.8" r="1.9" fill="#ff8ea2" opacity=".8" />
    </svg>
  );
}
