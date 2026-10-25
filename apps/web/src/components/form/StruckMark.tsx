// The struck square frame (the "missing" mark) reused for errors, so an error is readable without colour.

export function StruckMark({ size = 12 }: { size?: number }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 12 12" className="mt-[0.3em] shrink-0">
      <g fill="none" strokeWidth="1.5" className="stroke-marker">
        <rect x="0.75" y="0.75" width="10.5" height="10.5" rx="1" />
        <path d="M1.5 10.5 10.5 1.5" />
      </g>
    </svg>
  );
}
