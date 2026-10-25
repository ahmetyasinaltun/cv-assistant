// Title row of an analysis: job title, what it was compared with, when, and the primary action.

import type { ReactNode } from "react";

import { SampleNotice } from "@/components/SampleNotice";
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
        {isSample && <SampleNotice className="mt-3">{labels.sampleNotice}</SampleNotice>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
