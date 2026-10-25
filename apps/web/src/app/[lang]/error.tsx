"use client";

// Localized fallback when a screen fails to load (usually the API is unreachable); retry re-fetches the screen.

import { useEffect } from "react";

import { primaryButtonClass } from "@/components/button-styles";
import { useErrorCopy } from "@/components/ErrorCopy";

export default function LocalizedError({ error, retry }: { error: unknown; retry: () => void }) {
  const copy = useErrorCopy();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main id="main" className="mx-auto max-w-[1520px] px-4 pt-7 pb-24 sm:px-6">
      <section role="alert" className="max-w-[720px] bg-paper px-6 py-7 shadow-sheet sm:px-8">
        <h1 className="text-[20px] font-semibold tracking-[-0.01em]">{copy.title}</h1>
        <p className="mt-2 max-w-[60ch] text-ink-soft">{copy.body}</p>
        <button type="button" onClick={() => retry()} className={`${primaryButtonClass} mt-5`}>
          {copy.retry}
        </button>
      </section>
    </main>
  );
}
