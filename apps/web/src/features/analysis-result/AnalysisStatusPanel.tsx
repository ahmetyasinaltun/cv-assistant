// Shown instead of results while an analysis is queued or running, or after it failed.

import Link from "next/link";

import { primaryButtonClass } from "@/components/button-styles";
import type { Dictionary } from "@/i18n/dictionaries";
import type { AnalysisStatus } from "@/lib/api/types";

interface AnalysisStatusPanelProps {
  status: Exclude<AnalysisStatus, "completed">;
  retryHref?: string;
  labels: Dictionary["result"];
}

// The server's raw error message is deliberately not shown: it is an internal detail and is not localized.
export function AnalysisStatusPanel({ status, retryHref, labels }: AnalysisStatusPanelProps) {
  if (status === "failed") {
    return (
      <section role="alert" className="max-w-[720px] bg-paper px-6 py-7 shadow-sheet sm:px-8">
        <h2 className="flex items-center gap-2.5 text-[20px] font-semibold tracking-[-0.01em] text-ink">
          <svg aria-hidden="true" width="14" height="14" viewBox="0 0 12 12" className="shrink-0">
            <g fill="none" strokeWidth="1.5" className="stroke-marker">
              <rect x="0.75" y="0.75" width="10.5" height="10.5" rx="1" />
              <path d="M1.5 10.5 10.5 1.5" />
            </g>
          </svg>
          {labels.failed.title}
        </h2>
        <p className="mt-2 max-w-[60ch] text-ink-soft">{labels.failed.body}</p>
        {retryHref && (
          <Link href={retryHref} className={`${primaryButtonClass} mt-5`}>
            {labels.failed.retry}
          </Link>
        )}
      </section>
    );
  }

  return (
    <section role="status" aria-busy="true" className="max-w-[720px] bg-paper px-6 py-7 shadow-sheet sm:px-8">
      <h2 className="text-[20px] font-semibold tracking-[-0.01em]">{labels.progress.title}</h2>
      <p className="mt-2 max-w-[60ch] text-ink-soft">{labels.progress.body}</p>
      <div className="mt-6 flex items-center gap-4">
        <div aria-hidden="true" className="relative h-[3px] flex-1 overflow-hidden rounded-full bg-desk-deep">
          <div className="progress-sweep absolute inset-y-0 w-1/3 rounded-full bg-marker" />
        </div>
        <p className="label-caps text-edge">{labels.progress[status]}</p>
      </div>
    </section>
  );
}
