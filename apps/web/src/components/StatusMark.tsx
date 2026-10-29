// Draws a requirement's match status as an icon whose form carries the state (check, half disc, cross) and a chip
// that names it; colour only reinforces the form, so the status still reads in greyscale.

import type { ReactNode } from "react";

import type { MatchStatus } from "@/lib/api/types";

interface StatusMarkProps {
  status: MatchStatus;
  size?: number;
}

export function StatusMark({ status, size = 18 }: StatusMarkProps) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 18 18" className="shrink-0">
      {status === "matched" && (
        <>
          <circle cx="9" cy="9" r="9" className="fill-ok-mark" />
          <path
            d="M5.2 9.3l2.5 2.4 5.2-5.3"
            fill="none"
            stroke="#fff"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      )}
      {status === "partial" && (
        <>
          <circle cx="9" cy="9" r="8" strokeWidth="2" className="fill-paper stroke-partial-mark" />
          <path d="M9 3.2a5.8 5.8 0 0 0 0 11.6z" className="fill-partial-mark" />
        </>
      )}
      {status === "missing" && (
        <>
          <circle cx="9" cy="9" r="9" className="fill-marker-mark" />
          <path d="M6.2 6.2l5.6 5.6M11.8 6.2l-5.6 5.6" stroke="#fff" strokeWidth="1.9" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}

const CHIP_TONE: Record<MatchStatus, string> = {
  matched: "bg-ok-tint text-ok",
  partial: "bg-partial-tint text-partial",
  missing: "bg-marker-tint text-marker",
};

export function StatusChip({ status, children }: { status: MatchStatus; children: ReactNode }) {
  return (
    <span
      className={`shrink-0 rounded-md px-2 py-0.5 text-[12.5px] leading-[1.5] font-semibold whitespace-nowrap ${CHIP_TONE[status]}`}
    >
      {children}
    </span>
  );
}
