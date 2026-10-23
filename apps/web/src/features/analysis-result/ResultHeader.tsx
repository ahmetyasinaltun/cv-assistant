// Title row of an analysis: job title, what it was compared with, when, and the primary action.

import type { ReactNode } from "react";

import type { Dictionary } from "@/i18n/dictionaries";
import { interpolate } from "@/i18n/format";

interface ResultHeaderProps {
  jobTitle: string;
  company: string | null;
  resumeTitle: string;
  createdAtLabel: string;
  createdAt: string;
  isSample: boolean;
  labels: Dictionary["result"];
  action?: ReactNode;
}

export function ResultHeader({
  jobTitle,
  company,
  resumeTitle,
  createdAtLabel,
  createdAt,
  isSample,
  labels,
  action,
}: ResultHeaderProps) {
  return (
    <div className="flex flex-col gap-4 py-6 sm:py-7 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        <h1 className="text-[26px] leading-[1.15] font-semibold tracking-[-0.025em] sm:text-[30px]">
          {jobTitle}
          {company && <span className="font-normal text-mute"> · {company}</span>}
        </h1>
        <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[14px] text-mute">
          <span>{interpolate(labels.comparedWith, { resume: resumeTitle })}</span>
          <span aria-hidden="true" className="hidden sm:inline">·</span>
          <time dateTime={createdAt}>{createdAtLabel}</time>
        </p>
        {isSample && (
          <p className="mt-3 inline-flex items-center gap-2 rounded-[4px] bg-desk-deep px-2 py-1 text-[13px] text-ink-soft">
            <svg aria-hidden="true" width="14" height="14" viewBox="0 0 14 14" className="shrink-0 text-edge">
              <rect x="1" y="2.5" width="12" height="9" rx="1" fill="none" stroke="currentColor" strokeWidth="1.3" />
              <path d="M1 5h12M1 9h12" stroke="currentColor" strokeWidth="1.3" strokeDasharray="1.5 1.5" />
            </svg>
            {labels.sampleNotice}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
