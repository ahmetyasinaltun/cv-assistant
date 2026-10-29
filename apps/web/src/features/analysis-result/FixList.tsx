// "What to fix" section: prioritized suggestions as cards, each naming what kind of change it is and linking the
// requirements it addresses.

import type { Dictionary } from "@/i18n/dictionaries";
import { pluralize } from "@/i18n/format";
import type { Priority, RequirementMatch, Suggestion, SuggestionTarget } from "@/lib/api/types";

import { RequirementLink } from "./RequirementLink";
import type { SelectionSource } from "./RequirementList";
import { sortSuggestionsByPriority } from "./view-model";

const PRIORITY_TONE: Record<Priority, string> = {
  high: "bg-accent text-white",
  medium: "bg-accent-tint text-accent-hover",
  low: "bg-desk-deep text-ink-soft",
};

// One small line icon per kind of change, drawn on a 16px grid.
const TARGET_ICON: Record<SuggestionTarget, string> = {
  cv_section: "M4 1.8h5.2L12.5 5v9.2H4z M9 1.8V5.3h3.5",
  project: "M5.5 4.5L2 8l3.5 3.5M10.5 4.5L14 8l-3.5 3.5",
  interview_topic: "M2.5 3h11v7.5H7L4 13v-2.5H2.5z",
  skill: "M8 2l5.5 3L8 8 2.5 5zM2.5 8L8 11l5.5-3M2.5 11L8 14l5.5-3",
};

interface FixListProps {
  suggestions: Suggestion[];
  requirementsById: Map<string, RequirementMatch>;
  selectedId: string | null;
  onSelect: (requirementId: string, source: SelectionSource) => void;
  labels: Dictionary["result"];
  locale: string;
  contentLang?: string;
}

export function FixList({ suggestions, requirementsById, selectedId, onSelect, labels, locale, contentLang }: FixListProps) {
  const sorted = sortSuggestionsByPriority(suggestions);

  return (
    <section aria-labelledby="fixes-heading" className="mt-8">
      <div className="flex items-baseline justify-between gap-4 px-0.5">
        <h2 id="fixes-heading" className="text-[22px] leading-tight font-bold tracking-[-0.015em]">
          {labels.fixesTitle}
        </h2>
        {sorted.length > 0 && (
          <span className="text-[14px] text-mute">{pluralize(locale, sorted.length, labels.fixesCount)}</span>
        )}
      </div>
      {sorted.length === 0 ? (
        <p className="mt-3 rounded-card border border-rule bg-paper p-5 text-ink-soft shadow-sheet sm:p-6">
          {labels.fixesEmpty}
        </p>
      ) : (
        <ol className="mt-3 grid gap-4 md:grid-cols-2">
          {sorted.map((suggestion) => {
            const related = suggestion.related_requirement_ids
              .map((id) => requirementsById.get(id))
              .filter((requirement) => requirement !== undefined);
            return (
              <li
                key={suggestion.title}
                className="flex flex-col items-start rounded-card border border-rule bg-paper p-5 shadow-sheet sm:p-6"
              >
                <span
                  className={`rounded-md px-2 py-0.5 text-[12.5px] leading-[1.5] font-bold ${PRIORITY_TONE[suggestion.priority]}`}
                >
                  {labels.priority[suggestion.priority]}
                </span>
                <h3 lang={contentLang} className="mt-3 text-[17.5px] leading-[1.4] font-semibold tracking-[-0.005em]">
                  {suggestion.title}
                </h3>
                <p lang={contentLang} className="mt-1.5 text-[15.5px] leading-[1.55] text-ink-soft">
                  {suggestion.detail}
                </p>
                {/* Pinned to the card's bottom, so cards side by side share one baseline for this row. */}
                <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-2 pt-3.5 text-[14px]">
                  <span className="inline-flex items-center gap-1.5 font-medium text-mute">
                    <svg aria-hidden="true" width="15" height="15" viewBox="0 0 16 16" className="shrink-0">
                      <path
                        d={TARGET_ICON[suggestion.target]}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    {labels.target[suggestion.target]}
                  </span>
                  {related.length > 0 && <span className="sr-only">{labels.relatedRequirements}:</span>}
                  {related.map((requirement) => (
                    <RequirementLink
                      key={requirement.id}
                      requirement={requirement}
                      isSelected={requirement.id === selectedId}
                      onSelect={onSelect}
                    />
                  ))}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
