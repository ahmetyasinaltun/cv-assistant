// Teal brand band at the top of an analysis: the way back, the job title, what it was compared with, when,
// a quiet secondary action beside the date (printing) and one main action. The summary card below overlaps its
// lower edge.

import Link from "next/link";
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
  /** The analyses list; the public sample has no list to return to. */
  backHref?: string;
  action?: ReactNode;
  /** Secondary, set as a text action beside the date so the band keeps one main action. */
  metaAction?: ReactNode;
}

export function ResultHeader({
  jobTitle,
  company,
  resumeTitle,
  createdAtLabel,
  createdAt,
  isSample,
  labels,
  backHref,
  action,
  metaAction,
}: ResultHeaderProps) {
  return (
    <div className="bg-brand text-on-brand">
      <div className="mx-auto max-w-[1280px] px-4 pt-6 pb-[100px] sm:px-8 sm:pt-8 sm:pb-[116px]">
        {backHref && (
          <nav aria-label={labels.breadcrumbLabel}>
            <ol className="flex min-w-0 items-center gap-1.5 text-[14px] text-on-brand-soft">
              <li className="shrink-0">
                <Link
                  href={backHref}
                  className="underline decoration-white/30 underline-offset-[3px] transition-colors duration-150 hover:text-on-brand hover:decoration-white/70"
                >
                  {labels.backToAnalyses}
                </Link>
              </li>
              <li aria-hidden="true" className="shrink-0">
                <svg width="14" height="14" viewBox="0 0 16 16">
                  <path d="M6 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </li>
              <li aria-current="page" className="min-w-0 truncate">
                {jobTitle}
              </li>
            </ol>
          </nav>
        )}
        <div className="mt-3 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <h1 className="text-[30px] leading-[1.12] font-bold tracking-[-0.025em] sm:text-[40px]">
              {jobTitle}
              {company && <span className="font-normal text-on-brand-soft"> · {company}</span>}
            </h1>
            <p className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[15px] text-on-brand-soft">
              <span>{interpolate(labels.comparedWith, { resume: resumeTitle })}</span>
              <span aria-hidden="true" className="hidden sm:inline">
                ·
              </span>
              <time dateTime={createdAt}>{createdAtLabel}</time>
              {metaAction && <span className="sm:ml-3">{metaAction}</span>}
            </p>
            {isSample && (
              <SampleNotice tone="onBrand" className="mt-4">
                {labels.sampleNotice}
              </SampleNotice>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      </div>
    </div>
  );
}
