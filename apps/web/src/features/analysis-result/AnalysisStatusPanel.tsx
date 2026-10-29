"use client";

// Shown instead of results while an analysis is queued or running, or after it failed.

import Link from "next/link";
import { useFormStatus } from "react-dom";

import { StatusMark } from "@/components/StatusMark";
import { primaryButtonClass } from "@/components/button-styles";
import type { Dictionary } from "@/i18n/dictionaries";
import type { AnalysisStatus } from "@/lib/api/types";

// The panel takes the summary card's place, overlapping the brand band.
const panelClass =
  "relative -mt-[76px] max-w-[760px] rounded-card border border-rule bg-paper px-6 py-7 shadow-sheet sm:-mt-[84px] sm:px-8";

/** Failures that the same CV and posting would hit again: the way forward is new input, not a rerun. */
const NEEDS_NEW_INPUT = new Set(["no_requirements_extracted", "no_evidence_extracted"]);

interface AnalysisStatusPanelProps {
  status: Exclude<AnalysisStatus, "completed">;
  errorCode?: string | null;
  retryHref?: string;
  retryAction?: () => Promise<void>;
  newAnalysisHref?: string;
  labels: Dictionary["result"];
}

function failureBody(labels: Dictionary["result"], errorCode: string | null | undefined): string {
  const reasons: Record<string, string> = labels.failed.reasons;
  return (errorCode && reasons[errorCode]) || labels.failed.body;
}

function RetrySubmit({ labels }: { labels: Dictionary["result"] }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={`${primaryButtonClass} mt-5`}>
      {pending ? labels.failed.starting : labels.failed.retry}
    </button>
  );
}

// The server's raw error message is deliberately not shown: it is an internal detail and is not localized.
export function AnalysisStatusPanel({
  status,
  errorCode,
  retryHref,
  retryAction,
  newAnalysisHref,
  labels,
}: AnalysisStatusPanelProps) {
  if (status === "failed") {
    const needsNewInput = Boolean(errorCode && NEEDS_NEW_INPUT.has(errorCode) && newAnalysisHref);
    return (
      <section role="alert" className={panelClass}>
        <h2 className="flex items-center gap-2.5 text-[21px] font-bold tracking-[-0.015em] text-ink">
          <StatusMark status="missing" size={20} />
          {labels.failed.title}
        </h2>
        <p className="mt-2 max-w-[60ch] text-ink-soft">{failureBody(labels, errorCode)}</p>
        {needsNewInput && newAnalysisHref ? (
          <Link href={newAnalysisHref} className={`${primaryButtonClass} mt-5`}>
            {labels.failed.newAnalysis}
          </Link>
        ) : retryAction ? (
          <form action={retryAction}>
            <RetrySubmit labels={labels} />
          </form>
        ) : (
          retryHref && (
            <Link href={retryHref} className={`${primaryButtonClass} mt-5`}>
              {labels.failed.retry}
            </Link>
          )
        )}
      </section>
    );
  }

  return (
    <section role="status" aria-busy="true" className={panelClass}>
      <h2 className="text-[21px] font-bold tracking-[-0.015em]">{labels.progress.title}</h2>
      <p className="mt-2 max-w-[60ch] text-ink-soft">{labels.progress.body}</p>
      <div className="mt-6 flex items-center gap-4">
        <div aria-hidden="true" className="relative h-1 flex-1 overflow-hidden rounded-full bg-desk-deep">
          <div className="progress-sweep absolute inset-y-0 w-1/3 rounded-full bg-accent" />
        </div>
        <p className="text-[14px] font-semibold text-accent-hover">{labels.progress[status]}</p>
      </div>
    </section>
  );
}
