// Draws a requirement's match status as a mark whose form carries the state and whose size carries the importance.

import type { Importance, MatchStatus } from "@/lib/api/types";

interface StatusMarkProps {
  status: MatchStatus;
  importance?: Importance;
}

export function StatusMark({ status, importance = "must_have" }: StatusMarkProps) {
  const size = importance === "must_have" ? 12 : 9;

  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 12 12"
      className="shrink-0 overflow-visible"
    >
      {status === "matched" && <circle cx="6" cy="6" r="6" className="fill-ink" />}
      {status === "partial" && (
        <circle
          cx="6"
          cy="6"
          r="5"
          fill="none"
          strokeWidth="2"
          strokeDasharray="3.1 2.15"
          className="stroke-partial"
        />
      )}
      {status === "missing" && (
        <g fill="none" strokeWidth="1.5" className="stroke-marker">
          <rect x="0.75" y="0.75" width="10.5" height="10.5" rx="1" />
          <path d="M1.5 10.5 10.5 1.5" />
        </g>
      )}
    </svg>
  );
}
