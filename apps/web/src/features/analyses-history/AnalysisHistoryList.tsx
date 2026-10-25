// The analyses list: hairline-ruled rows on the desk, each one a link to its result, newest first.

import Link from "next/link";

import { StruckMark } from "@/components/form/StruckMark";
import type { Dictionary } from "@/i18n/dictionaries";
import type { AnalysisSummary } from "@/lib/api/types";

import { rowOutcome } from "./history-model";

interface AnalysisHistoryListProps {
  analyses: AnalysisSummary[];
  locale: string;
  labels: Dictionary["history"];
  fitLabels: Dictionary["result"]["fit"];
}

function Outcome({ analysis, labels, fitLabels }: { analysis: AnalysisSummary } & Omit<AnalysisHistoryListProps, "analyses" | "locale">) {
  const outcome = rowOutcome(analysis);
  if (outcome.kind === "progress") {
    return <span className="label-caps text-edge">{labels.status[outcome.status]}</span>;
  }
  if (outcome.kind === "failed") {
    return (
      <span className="flex gap-2 text-[14px] text-marker">
        <StruckMark size={10} />
        {labels.status.failed}
      </span>
    );
  }
  return (
    <span className="flex items-baseline gap-2 text-[14px] text-ink-soft">
      <span>{fitLabels[outcome.fitLevel]}</span>
      <span className="edge-number text-[15px] text-ink">
        {outcome.score}
        <span className="text-mute">/100</span>
      </span>
    </span>
  );
}

/** Grey bars in the shape of the list while it loads; static, because it is usually gone within a blink. */
export function AnalysisHistorySkeleton() {
  return (
    <div aria-busy="true" className="border-t border-rule">
      {[0, 1, 2].map((row) => (
        <div key={row} className="history-row border-b border-rule px-2.5 py-4">
          <span className="h-3 w-3/5 rounded-[3px] bg-desk-deep [grid-area:posting]" />
          <span className="h-3 w-2/5 rounded-[3px] bg-desk-deep [grid-area:resume]" />
          <span className="h-3 w-20 rounded-[3px] bg-desk-deep [grid-area:outcome]" />
          <span className="h-3 w-16 justify-self-end rounded-[3px] bg-desk-deep [grid-area:date]" />
        </div>
      ))}
    </div>
  );
}

export function AnalysisHistoryList({ analyses, locale, labels, fitLabels }: AnalysisHistoryListProps) {
  // The time tells apart two runs of the same posting and CV on one day.
  const dateFormat = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" });

  return (
    <div>
      {/* Column heads help scanning on wide screens; each row's text already reads on its own. */}
      <div aria-hidden="true" className="hidden md:block">
        <div className="history-row label-caps border-b border-rule px-2.5 pb-2 text-mute">
          <span className="[grid-area:posting]">{labels.columns.posting}</span>
          <span className="[grid-area:resume]">{labels.columns.resume}</span>
          <span className="[grid-area:outcome]">{labels.columns.result}</span>
          <span className="text-right [grid-area:date]">{labels.columns.date}</span>
        </div>
      </div>
      <ol>
        {analyses.map((analysis) => (
          <li key={analysis.id} className="border-b border-rule">
            <Link
              href={`/${locale}/analyses/${analysis.id}`}
              className="history-row rounded-[5px] px-2.5 py-3 transition-colors duration-150 hover:bg-desk-deep active:bg-rule"
            >
              <span className="min-w-0 [grid-area:posting]">
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
              <time
                dateTime={analysis.created_at}
                className="text-right text-[13px] text-mute [grid-area:date]"
              >
                {dateFormat.format(new Date(analysis.created_at))}
              </time>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}
