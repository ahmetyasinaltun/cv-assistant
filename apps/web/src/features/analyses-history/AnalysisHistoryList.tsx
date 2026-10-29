// The analyses list: one card of rows, each a link to its result, newest first, with the outcome at a glance.

import Link from "next/link";

import { StatusMark } from "@/components/StatusMark";
import type { Dictionary } from "@/i18n/dictionaries";
import type { AnalysisSummary, FitLevel, MatchStatus } from "@/lib/api/types";

import { rowOutcome } from "./history-model";

// A fit level borrows the icon of the status it is closest to, as on the result page.
const FIT_STATUS: Record<FitLevel, MatchStatus> = { strong: "matched", moderate: "partial", weak: "missing" };

const cardClass = "overflow-hidden rounded-card border border-rule bg-paper shadow-sheet";

interface AnalysisHistoryListProps {
  analyses: AnalysisSummary[];
  locale: string;
  labels: Dictionary["history"];
  fitLabels: Dictionary["result"]["fit"];
}

function Outcome({ analysis, labels, fitLabels }: { analysis: AnalysisSummary } & Omit<AnalysisHistoryListProps, "analyses" | "locale">) {
  const outcome = rowOutcome(analysis);
  if (outcome.kind === "progress") {
    return (
      <span className="flex items-center gap-2 text-[14px] font-semibold text-accent-hover">
        <span aria-hidden="true" className="size-2 rounded-full bg-accent motion-safe:animate-pulse" />
        {labels.status[outcome.status]}
      </span>
    );
  }
  if (outcome.kind === "failed") {
    return (
      <span className="flex items-center gap-2 text-[14px] font-medium text-marker">
        <StatusMark status="missing" size={16} />
        {labels.status.failed}
      </span>
    );
  }
  return (
    <span className="flex items-center gap-2.5 text-[14px] text-ink-soft">
      <StatusMark status={FIT_STATUS[outcome.fitLevel]} size={16} />
      <span>{fitLabels[outcome.fitLevel]}</span>
      <span className="text-[16px] font-bold text-accent tabular-nums">
        {outcome.score}
        <span className="text-[13px] font-semibold text-mute">/100</span>
      </span>
    </span>
  );
}

/** Grey bars in the shape of the list while it loads; static, because it is usually gone within a blink. */
export function AnalysisHistorySkeleton() {
  return (
    <div aria-busy="true" className={cardClass}>
      {[0, 1, 2].map((row) => (
        <div key={row} className="history-row border-b border-rule px-5 py-5 last:border-b-0 sm:px-6">
          <span className="h-3.5 w-3/5 rounded bg-desk-deep [grid-area:posting]" />
          <span className="h-3 w-2/5 rounded bg-desk-deep [grid-area:resume]" />
          <span className="h-3 w-24 rounded bg-desk-deep [grid-area:outcome]" />
          <span className="h-3 w-20 justify-self-end rounded bg-desk-deep [grid-area:date]" />
        </div>
      ))}
    </div>
  );
}

export function AnalysisHistoryList({ analyses, locale, labels, fitLabels }: AnalysisHistoryListProps) {
  // The time tells apart two runs of the same posting and CV on one day.
  const dateFormat = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" });

  return (
    <div className={cardClass}>
      {/* Column heads help scanning on wide screens; each row's text already reads on its own. */}
      <div aria-hidden="true" className="hidden border-b border-rule bg-desk/60 md:block">
        <div className="history-row px-6 py-3 text-[13px] font-semibold text-mute">
          <span className="[grid-area:posting]">{labels.columns.posting}</span>
          <span className="[grid-area:resume]">{labels.columns.resume}</span>
          <span className="[grid-area:outcome]">{labels.columns.result}</span>
          <span className="text-right [grid-area:date]">{labels.columns.date}</span>
        </div>
      </div>
      <ol>
        {analyses.map((analysis) => (
          <li key={analysis.id} className="border-b border-rule last:border-b-0">
            <Link
              href={`/${locale}/analyses/${analysis.id}`}
              className="history-row px-5 py-4 transition-colors duration-150 hover:bg-desk active:bg-desk-deep sm:px-6"
            >
              <span className="min-w-0 text-[16px] [grid-area:posting]">
                <span className="font-semibold text-ink">{analysis.job_title}</span>
                {analysis.company && <span className="text-mute"> · {analysis.company}</span>}
              </span>
              <span className="min-w-0 truncate text-[14px] text-ink-soft [grid-area:resume]">
                <span className="sr-only">{labels.columns.resume}: </span>
                {analysis.resume_title}
              </span>
              <span className="justify-self-end [grid-area:outcome] md:justify-self-start">
                <Outcome analysis={analysis} labels={labels} fitLabels={fitLabels} />
              </span>
              <time dateTime={analysis.created_at} className="text-right text-[14px] text-mute [grid-area:date]">
                {dateFormat.format(new Date(analysis.created_at))}
              </time>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}
