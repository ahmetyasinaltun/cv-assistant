// Requirements card: must-have and nice-to-have groups; selecting a row highlights its evidence on the CV sheet,
// and on small screens, where the sheet sits far below, also opens the reasoning and the CV lines under the row.

import type { Dictionary } from "@/i18n/dictionaries";
import { pluralize } from "@/i18n/format";
import type { CandidateEvidence, RequirementMatch } from "@/lib/api/types";

import { StatusChip, StatusMark } from "./StatusMark";
import { splitByImportance, splitForHighlight } from "./view-model";

export type SelectionSource = "initial" | "pointer" | "keyboard";

/** DOM id of a requirement row, the target of in-page links from fixes and questions. */
export function requirementAnchorId(requirementId: string): string {
  return `requirement-${requirementId}`;
}

interface RequirementListProps {
  requirements: RequirementMatch[];
  evidenceById: Map<string, CandidateEvidence>;
  selectedId: string | null;
  onSelect: (requirementId: string, source: SelectionSource) => void;
  labels: Dictionary["result"];
  locale: string;
  contentLang?: string;
}

export function RequirementList({
  requirements,
  evidenceById,
  selectedId,
  onSelect,
  labels,
  locale,
  contentLang,
}: RequirementListProps) {
  const { mustHave, niceToHave } = splitByImportance(requirements);
  const halves = [
    { key: "must_have" as const, items: mustHave },
    { key: "nice_to_have" as const, items: niceToHave },
  ].filter((half) => half.items.length > 0);

  return (
    <section aria-labelledby="requirements-heading" className="rounded-card border border-rule bg-paper shadow-sheet">
      <div className="flex items-baseline justify-between gap-4 px-5 pt-5 sm:px-6 sm:pt-6">
        <h2 id="requirements-heading" className="text-[21px] leading-tight font-bold tracking-[-0.015em]">
          {labels.requirementsTitle}
        </h2>
        {requirements.length > 0 && (
          <span className="text-[14px] text-mute">{pluralize(locale, requirements.length, labels.requirementCount)}</span>
        )}
      </div>
      {requirements.length === 0 ? (
        <p className="px-5 pt-3 pb-6 text-ink-soft sm:px-6">{labels.requirementsEmpty}</p>
      ) : (
        <div className="px-2 pb-3 sm:px-3">
          {halves.map((half) => (
            <div key={half.key}>
              <h3 className="flex justify-between px-3 pt-4 pb-1.5 text-[14px] font-semibold text-ink-soft">
                <span>{labels.importance[half.key]}</span>
                <span className="font-medium text-mute">{half.items.length}</span>
              </h3>
              <ul className="space-y-0.5">
                {half.items.map((requirement) => (
                  <RequirementRow
                    key={requirement.id}
                    requirement={requirement}
                    evidenceById={evidenceById}
                    isSelected={requirement.id === selectedId}
                    onSelect={onSelect}
                    labels={labels}
                    contentLang={contentLang}
                  />
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

interface RequirementRowProps {
  requirement: RequirementMatch;
  evidenceById: Map<string, CandidateEvidence>;
  isSelected: boolean;
  onSelect: RequirementListProps["onSelect"];
  labels: Dictionary["result"];
  contentLang?: string;
}

function RequirementRow({ requirement, evidenceById, isSelected, onSelect, labels, contentLang }: RequirementRowProps) {
  const detailsId = `requirement-${requirement.id}-details`;

  return (
    <li
      id={requirementAnchorId(requirement.id)}
      data-requirement-id={requirement.id}
      data-selected={isSelected || undefined}
      className="scroll-mt-6 rounded-[10px] data-selected:bg-accent-tint data-selected:shadow-[inset_0_0_0_1px_rgb(15_118_109/0.35)]"
    >
      <button
        type="button"
        aria-pressed={isSelected}
        aria-controls={isSelected ? detailsId : undefined}
        // A click fired from the keyboard reports detail 0; keyboard selection skips the highlighter sweep.
        onClick={(event) => onSelect(requirement.id, event.detail === 0 ? "keyboard" : "pointer")}
        className="group grid w-full grid-cols-[18px_minmax(0,1fr)_auto_16px] items-start gap-x-3 rounded-[10px] px-3 py-2.5 text-left transition-colors duration-150 hover:bg-desk active:bg-desk-deep aria-pressed:hover:bg-transparent lg:grid-cols-[18px_minmax(0,1fr)_auto]"
      >
        <span className="flex h-[22px] items-center">
          <StatusMark status={requirement.status} />
        </span>
        <span className="text-[15.5px] leading-[1.42] text-ink">{requirement.text}</span>
        <span className="pt-px">
          <StatusChip status={requirement.status}>{labels.status[requirement.status]}</StatusChip>
        </span>
        <svg
          aria-hidden="true"
          width="16"
          height="16"
          viewBox="0 0 16 16"
          className="mt-[3px] text-mute transition-transform duration-150 group-aria-pressed:rotate-180 lg:hidden"
        >
          <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {isSelected && (
        <RequirementDetails
          id={detailsId}
          requirement={requirement}
          evidenceById={evidenceById}
          labels={labels}
          contentLang={contentLang}
        />
      )}
    </li>
  );
}

/** Reasoning and supporting CV lines for small screens, where the CV sheet sits far below the list. */
function RequirementDetails({
  id,
  requirement,
  evidenceById,
  labels,
  contentLang,
}: {
  id: string;
  requirement: RequirementMatch;
  evidenceById: Map<string, CandidateEvidence>;
  labels: Dictionary["result"];
  contentLang?: string;
}) {
  return (
    <div id={id} className="px-3 pb-4 text-[15px] sm:pl-[42px] lg:hidden">
      <p lang={contentLang} className="text-ink-soft">
        {requirement.reasoning}
      </p>
      {requirement.evidence.length > 0 && (
        <>
          <h4 className="mt-3.5 text-[13.5px] font-semibold text-ink-soft">{labels.supportingLines}</h4>
          {/* CV lines stay in the CV's own language, which is not detected, so they inherit the page language. */}
          <ul className="mt-2 space-y-2">
            {requirement.evidence.map((reference) => {
              const line = evidenceById.get(reference.evidence_id);
              return (
                <li key={reference.evidence_id} className="rounded-lg border border-rule bg-paper px-3 py-2.5 leading-[1.5] text-ink">
                  {splitForHighlight(line?.text ?? reference.quote, reference.quote).map((segment, index) =>
                    segment.highlighted ? (
                      <mark key={index} className="highlight" data-tone={requirement.status} data-instant="true">
                        {segment.text}
                      </mark>
                    ) : (
                      <span key={index}>{segment.text}</span>
                    ),
                  )}
                  {line?.section && <span className="mt-0.5 block text-[12.5px] text-mute">{line.section}</span>}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
