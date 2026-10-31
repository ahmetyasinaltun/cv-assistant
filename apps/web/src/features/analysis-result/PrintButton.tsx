"use client";

// Quiet text action on the result band that opens the browser's print dialog, where "Save as PDF" is one of the
// printers; what prints is the plain document in PrintableResult, not the screen layout.

export function PrintButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="relative inline-flex items-center gap-1.5 rounded-[3px] font-semibold text-on-brand underline decoration-white/45 underline-offset-[3px] transition-[text-decoration-color] duration-150 after:absolute after:-inset-x-2 after:-inset-y-3 hover:decoration-white"
    >
      <svg
        aria-hidden="true"
        width="17"
        height="17"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="shrink-0"
      >
        <path d="M7 9V3h10v6" />
        <rect x="3" y="9" width="18" height="8" rx="2" />
        <path d="M7 14h10v7H7z" />
      </svg>
      {label}
    </button>
  );
}
