// Summary card over the brand band: the score with its fit level and how it is computed, the plain-language summary,
// and a bar of every requirement coloured by status, so the number is read together with what makes it up.

import type { Dictionary } from "@/i18n/dictionaries";
import { interpolate, pluralize } from "@/i18n/format";
import type { FitLevel, MatchStatus, OverallMatch, RequirementMatch } from "@/lib/api/types";

import { StatusMark } from "./StatusMark";
import { countByStatus, scoreSegments } from "./view-model";

const STATUS_ORDER: MatchStatus[] = ["matched", "partial", "missing"];

const SEGMENT_TONE: Record<MatchStatus, string> = {
  matched: "bg-ok-mark",
  partial: "bg-partial-mark",
  missing: "bg-marker-mark",
};

// A fit level borrows the icon and tone of the status it is closest to.
const FIT_STATUS: Record<FitLevel, MatchStatus> = { strong: "matched", moderate: "partial", weak: "missing" };
const FIT_TONE: Record<FitLevel, string> = {
  strong: "bg-ok-tint text-ok",
  moderate: "bg-partial-tint text-partial",
  weak: "bg-marker-tint text-marker",
};

interface MatchSummaryProps {
  overall: OverallMatch;
  requirements: RequirementMatch[];
  labels: Dictionary["result"];
  locale: string;
  contentLang?: string;
}

export function MatchSummary({ overall, requirements, labels, locale, contentLang }: MatchSummaryProps) {
  const counts = countByStatus(requirements);
  const segments = scoreSegments(requirements);

  return (
    <section
      aria-label={labels.fit[overall.fit_level]}
      className="relative -mt-[76px] grid rounded-card border border-rule bg-paper shadow-sheet sm:-mt-[84px] md:grid-cols-[230px_minmax(0,1fr)] lg:grid-cols-[250px_minmax(0,1fr)_320px]"
    >
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 p-5 sm:p-7 md:block">
        <p className="flex items-baseline gap-1" aria-hidden="true">
          <span className="text-[52px] leading-[0.95] font-bold tracking-[-0.03em] text-accent sm:text-[64px]">
            {overall.score}
          </span>
          <span className="text-[20px] font-semibold text-mute">/100</span>
        </p>
        <span className="sr-only">{interpolate(labels.score, { score: overall.score })}</span>
        <p
          className={`inline-flex items-center gap-1.5 rounded-full py-1 pr-3 pl-1.5 text-[15px] font-semibold md:mt-4 ${FIT_TONE[overall.fit_level]}`}
        >
          <StatusMark status={FIT_STATUS[overall.fit_level]} size={17} />
          {labels.fit[overall.fit_level]}
        </p>
        <details className="group w-full md:mt-4">
          <summary className="inline-flex cursor-pointer list-none items-center gap-1 rounded text-[14px] font-medium text-accent-hover transition-colors duration-150 hover:text-ink [&::-webkit-details-marker]:hidden">
            {labels.howScored}
            <svg aria-hidden="true" width="14" height="14" viewBox="0 0 16 16" className="transition-transform duration-150 group-open:rotate-180">
              <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </summary>
          <p lang={contentLang} className="mt-2 max-w-[44ch] text-[14px] leading-[1.5] text-ink-soft">
            {overall.score_explanation}
          </p>
        </details>
      </div>

      <div className="border-t border-rule p-5 sm:p-7 md:border-t-0 md:border-l">
        <h2 className="text-[21px] leading-tight font-bold tracking-[-0.015em]">{labels.summaryTitle}</h2>
        <p lang={contentLang} className="mt-2.5 max-w-[62ch] text-[16px] leading-[1.6] sm:text-[17px]">
          {overall.summary}
        </p>
      </div>

      <div className="border-t border-rule p-5 sm:p-7 md:col-span-2 lg:col-span-1 lg:border-t-0 lg:border-l">
        <p className="flex flex-wrap items-baseline justify-between gap-x-3 text-[15px] font-semibold">
          {pluralize(locale, requirements.length, labels.requirementCount)}
          <span className="text-[13px] font-medium text-mute">{labels.breakdownCaption}</span>
        </p>
        {segments.length > 0 && (
          <div aria-hidden="true" className="mt-3 flex h-3.5 gap-[3px]">
            {segments.map((segment) => (
              <span
                key={segment.id}
                title={segment.text}
                style={{ flexGrow: segment.width }}
                className={`basis-0 rounded-[3px] ${SEGMENT_TONE[segment.status]}`}
              />
            ))}
          </div>
        )}
        <ul className="mt-4 grid gap-2 text-[15px] text-ink-soft">
          {STATUS_ORDER.map((status) => (
            <li key={status} className="flex items-center gap-2.5">
              <StatusMark status={status} />
              {interpolate(labels.statusCount[status], { count: counts[status] })}
            </li>
          ))}
        </ul>
        <p className="mt-3.5 text-[13px] leading-[1.45] text-mute">{labels.breakdownNote}</p>
      </div>
    </section>
  );
}
