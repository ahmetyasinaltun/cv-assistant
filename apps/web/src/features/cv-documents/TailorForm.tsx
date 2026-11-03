"use client";

// Choosing how freely the AI may write a CV for one posting (flexible or strict), then writing it. Success opens the
// new CV in the editor; only failures come back here.

import { useState, useTransition, type FormEvent } from "react";

import { primaryButtonClass } from "@/components/button-styles";
import { FormAlert } from "@/components/form/FormAlert";
import type { Dictionary } from "@/i18n/dictionaries";
import type { TailoringMode } from "@/lib/api/types";

import { tailorCv, type TailorErrorKey } from "./actions";

interface TailorFormProps {
  analysisId: string;
  locale: string;
  labels: Dictionary["cvs"]["tailor"]["page"];
}

const MODES: TailoringMode[] = ["flexible", "strict"];

export function TailorForm({ analysisId, locale, labels }: TailorFormProps) {
  const [mode, setMode] = useState<TailoringMode>("flexible");
  const [error, setError] = useState<TailorErrorKey | null>(null);
  const [isWriting, startWriting] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    startWriting(async () => {
      const result = await tailorCv(locale, analysisId, mode);
      if (result) setError(result.error);
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-[760px] rounded-card border border-rule bg-paper px-5 py-6 shadow-sheet sm:px-7 sm:py-7"
    >
      <fieldset disabled={isWriting}>
        <legend className="text-[21px] leading-[1.25] font-bold tracking-[-0.015em]">{labels.modeLegend}</legend>
        <div className="mt-4 space-y-2">
          {MODES.map((option) => {
            const copy = labels[option];
            return (
              <label
                key={option}
                className="flex cursor-pointer items-start gap-3 rounded-[10px] border border-rule px-4 py-3.5 transition-colors duration-150 hover:bg-desk has-checked:border-accent/35 has-checked:bg-accent-tint has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-accent"
              >
                <input
                  type="radio"
                  name="mode"
                  value={option}
                  checked={mode === option}
                  onChange={() => setMode(option)}
                  className="mt-1 size-[18px] shrink-0 accent-accent"
                />
                <span className="min-w-0">
                  <span className="flex flex-wrap items-center gap-2 font-semibold text-ink">
                    {copy.label}
                    {"note" in copy && (
                      <span className="rounded-[6px] bg-paper px-2 py-0.5 text-[12.5px] font-semibold text-accent-hover ring-1 ring-accent/30">
                        {copy.note}
                      </span>
                    )}
                  </span>
                  <span className="mt-1 block max-w-[64ch] text-[15px] leading-[1.5] text-ink-soft">{copy.body}</span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <ul className="mt-5 space-y-1 text-[14px] text-mute">
        <li>{labels.scoreNote}</li>
        <li>{labels.startsFrom}</li>
      </ul>

      <div className="has-[p]:mt-5">
        <FormAlert message={error ? labels.errors[error] : null} />
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2">
        <button type="submit" disabled={isWriting} className={primaryButtonClass}>
          {isWriting ? labels.pending : labels.action}
        </button>
        <span aria-live="polite" className="text-[14px] text-mute">
          {isWriting ? labels.pendingNote : ""}
        </span>
      </div>
    </form>
  );
}
