"use client";

// Phone menu of the top bar: one button opens the navigation, account and language under the bar.
// From 640px the same children sit in the bar itself (the panel becomes `display: contents`) and the button is hidden.

import { useId, useState, type ReactNode } from "react";

interface BarMenuProps {
  label: string;
  children: ReactNode;
}

export function BarMenu({ label, children }: BarMenuProps) {
  const panelId = useId();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={() => setIsOpen(!isOpen)}
        className="order-2 ml-auto grid size-11 place-items-center rounded-lg text-ink transition-colors duration-150 hover:bg-desk sm:hidden"
      >
        <span className="sr-only">{label}</span>
        <svg aria-hidden="true" width="22" height="22" viewBox="0 0 20 20">
          {isOpen ? (
            <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          ) : (
            <path d="M3 6h14M3 10h14M3 14h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          )}
        </svg>
      </button>
      {/* Following a link or submitting sign-out leaves the menu, so it closes. Reading the path instead would
          need a Suspense boundary, because the bar is part of the prerendered static shell. */}
      <div
        id={panelId}
        onClick={(event) => (event.target as Element).closest("a") && setIsOpen(false)}
        onSubmit={() => setIsOpen(false)}
        onKeyDown={(event) => event.key === "Escape" && setIsOpen(false)}
        className={`${isOpen ? "flex" : "hidden"} order-3 w-full flex-col items-start gap-2 border-t border-rule py-3 sm:contents`}
      >
        {children}
      </div>
    </>
  );
}
