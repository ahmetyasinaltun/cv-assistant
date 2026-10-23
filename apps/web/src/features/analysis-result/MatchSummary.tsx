// Summary band: fit level and score in context, how the score is computed, the plain-language summary and the status legend.

import type { Dictionary } from "@/i18n/dictionaries";
import { interpolate } from "@/i18n/format";
import type { MatchStatus, OverallMatch } from "@/lib/api/types";

import { StatusMark } from "./StatusMark";
import type { StatusCounts } from "./view-model";

const STATUS_ORDER: MatchStatus[] = ["matched", "partial", "missing"];

interface MatchSummaryProps {
  overall: OverallMatch;
  counts: StatusCounts;
  labels: Dictionary["result"];
  contentLang?: string;
}

export function MatchSummary({ overall, counts, labels, contentLang }: MatchSummaryProps) {
  return (
    <section
      aria-label={labels.fit[overall.fit_level]}
      className="grid gap-x-10 gap-y-4 border-y border-rule py-5 md:grid-cols-[minmax(180px,220px)_minmax(0,1fr)] xl:grid-cols-[220px_minmax(0,70ch)_auto]"
    >
      <div>
        <p className="text-[19px] leading-tight font-semibold tracking-[-0.01em]">{labels.fit[overall.fit_level]}</p>
        <p className="edge-number mt-1 text-[22px] leading-none text-ink">
          {interpolate(labels.score, { score: overall.score })}
        </p>
        <details className="group mt-2">
          <summary className="cursor-pointer list-none text-[13px] text-ink-soft underline decoration-rule underline-offset-[3px] transition-colors duration-150 hover:text-ink hover:decoration-ink [&::-webkit-details-marker]:hidden">
            {labels.howScored}
          </summary>
          <p lang={contentLang} className="mt-2 max-w-[44ch] text-[13px] leading-[1.5] text-ink-soft">
            {overall.score_explanation}
          </p>
        </details>
      </div>

      <p lang={contentLang} className="max-w-[70ch] text-[15px] leading-[1.6] text-ink">
        {overall.summary}
      </p>

      <ul className="flex flex-wrap gap-x-5 gap-y-2 text-[14px] text-ink-soft md:col-span-2 xl:col-span-1 xl:flex-col xl:gap-y-1.5">
        {STATUS_ORDER.map((status) => (
          <li key={status} className="flex items-center gap-2 whitespace-nowrap">
            <span className="flex w-3 justify-center">
              <StatusMark status={status} />
            </span>
            {interpolate(labels.statusCount[status], { count: counts[status] })}
          </li>
        ))}
      </ul>
    </section>
  );
}
