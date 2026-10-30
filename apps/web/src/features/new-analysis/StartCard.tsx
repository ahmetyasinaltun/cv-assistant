// Start card of the new-analysis form: names the CV and the posting that will be compared and carries the start
// action, so the button belongs to a summary instead of floating under two columns of different height.

import { primaryButtonClass } from "@/components/button-styles";
import { FormAlert } from "@/components/form/FormAlert";
import type { Dictionary } from "@/i18n/dictionaries";

import type { ComparisonSummary } from "./new-analysis-model";

interface StartCardProps {
  summary: ComparisonSummary;
  formError: string | null;
  isStarting: boolean;
  /** Spans both form columns on wide screens: the summary sits beside the action instead of above it. */
  wide: boolean;
  labels: Dictionary["newAnalysis"];
}

function SummaryRow({ label, value, placeholder }: { label: string; value: string | null; placeholder: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-t border-rule py-3">
      <dt className="shrink-0 text-[14px] text-mute">{label}</dt>
      <dd className={`min-w-0 text-right text-[15px] break-words ${value ? "font-semibold text-ink" : "text-mute"}`}>
        {value ?? placeholder}
      </dd>
    </div>
  );
}

export function StartCard({ summary, formError, isStarting, wide, labels }: StartCardProps) {
  const copy = labels.startCard;

  return (
    <section
      aria-labelledby="start-card-title"
      className={`rounded-card border border-rule bg-paper px-5 py-6 shadow-sheet sm:px-7 sm:py-7 ${wide ? "lg:flex lg:items-end lg:gap-12" : ""}`}
    >
      <div className="min-w-0 lg:flex-1">
        <h2 id="start-card-title" className="text-[21px] leading-[1.25] font-bold tracking-[-0.015em]">
          {copy.title}
        </h2>
        <dl className={`mt-4 ${wide ? "lg:grid lg:grid-cols-2 lg:gap-x-8" : ""}`}>
          <SummaryRow label={labels.resume.title} value={summary.resume} placeholder={copy.resumeUnnamed} />
          <SummaryRow label={labels.posting.title} value={summary.posting} placeholder={copy.postingMissing} />
        </dl>
      </div>
      <div className={`mt-6 ${wide ? "lg:mt-0 lg:w-[340px] lg:shrink-0" : ""}`}>
        {/* Spaced from the button only while a message shows; the empty alert stays mounted for screen readers. */}
        <div className="has-[p]:mb-4">
          <FormAlert message={formError} />
        </div>
        <button type="submit" disabled={isStarting} className={`${primaryButtonClass} w-full`}>
          {isStarting ? labels.submitting : labels.submit}
        </button>
        <p className="mt-3 text-[14px] leading-[1.5] text-mute">{labels.submitNote}</p>
      </div>
    </section>
  );
}
