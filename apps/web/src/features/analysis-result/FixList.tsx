// "What to fix" column: prioritized suggestions, each linked to the requirements it addresses.

import type { Dictionary } from "@/i18n/dictionaries";
import type { Priority, RequirementMatch, Suggestion } from "@/lib/api/types";

import { RequirementLink } from "./RequirementLink";
import type { SelectionSource } from "./RequirementList";
import { sortSuggestionsByPriority } from "./view-model";

const PRIORITY_TONE: Record<Priority, string> = {
  high: "text-marker",
  medium: "text-partial",
  low: "text-mute",
};

interface FixListProps {
  suggestions: Suggestion[];
  requirementsById: Map<string, RequirementMatch>;
  selectedId: string | null;
  onSelect: (requirementId: string, source: SelectionSource) => void;
  labels: Dictionary["result"];
  contentLang?: string;
}

export function FixList({ suggestions, requirementsById, selectedId, onSelect, labels, contentLang }: FixListProps) {
  const sorted = sortSuggestionsByPriority(suggestions);

  return (
    <section aria-labelledby="fixes-heading">
      <h2 id="fixes-heading" className="label-caps flex items-baseline justify-between text-mute">
        <span>{labels.fixesTitle}</span>
        <span className="edge-number text-[13px]">{sorted.length}</span>
      </h2>
      {sorted.length === 0 ? (
        <p className="mt-3 text-[14px] text-ink-soft">{labels.fixesEmpty}</p>
      ) : (
        <ol className="mt-1 grid gap-x-8 lg:grid-cols-2 xl:grid-cols-1">
          {sorted.map((suggestion) => {
            const related = suggestion.related_requirement_ids
              .map((id) => requirementsById.get(id))
              .filter((requirement) => requirement !== undefined);
            return (
              <li key={suggestion.title} className="border-b border-rule py-4 last:border-b-0 lg:last:border-b xl:last:border-b-0">
                <h3 className="text-[15px] leading-[1.4] font-semibold text-ink">
                  <span
                    className={`label-caps mr-2 inline-block translate-y-[-1px] rounded-[3px] border border-current px-1.5 py-px align-middle text-[11px] leading-[1.4] ${PRIORITY_TONE[suggestion.priority]}`}
                  >
                    {labels.priority[suggestion.priority]}
                  </span>
                  <span lang={contentLang}>{suggestion.title}</span>
                </h3>
                <p lang={contentLang} className="mt-1 text-[14px] leading-[1.55] text-ink-soft">
                  {suggestion.detail}
                </p>
                <p className="mt-2 text-[13px] leading-[1.6]">
                  <span className="mr-3 text-mute">{labels.target[suggestion.target]}</span>
                  {related.length > 0 && <span className="sr-only">{labels.relatedRequirements}:</span>}
                  {related.map((requirement) => (
                    <span key={requirement.id} className="mr-3">
                      <RequirementLink
                        requirement={requirement}
                        isSelected={requirement.id === selectedId}
                        onSelect={onSelect}
                      />
                    </span>
                  ))}
                </p>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
