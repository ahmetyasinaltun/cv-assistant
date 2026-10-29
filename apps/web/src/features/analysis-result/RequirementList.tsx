// Requirement column: must-have and nice-to-have as two hard halves; selecting a row shows its evidence.

import type { RequirementMatch } from "@/lib/api/types";
import type { Dictionary } from "@/i18n/dictionaries";

import { StatusMark } from "./StatusMark";
import { splitByImportance } from "./view-model";

export type SelectionSource = "initial" | "pointer" | "keyboard";

/** DOM id of a requirement row, the target of in-page links from fixes and questions. */
export function requirementAnchorId(requirementId: string): string {
  return `requirement-${requirementId}`;
}

interface RequirementListProps {
  requirements: RequirementMatch[];
  selectedId: string | null;
  onSelect: (requirementId: string, source: SelectionSource) => void;
  labels: Dictionary["result"];
  contentLang?: string;
}

export function RequirementList({ requirements, selectedId, onSelect, labels, contentLang }: RequirementListProps) {
  if (requirements.length === 0) {
    return (
      <section aria-labelledby="requirements-heading">
        <h2 id="requirements-heading" className="label-caps text-mute">
          {labels.requirementsTitle}
        </h2>
        <p className="mt-3 max-w-[48ch] text-[14px] text-ink-soft">{labels.requirementsEmpty}</p>
      </section>
    );
  }

  const { mustHave, niceToHave } = splitByImportance(requirements);
  const halves = [
    { key: "must_have" as const, items: mustHave },
    { key: "nice_to_have" as const, items: niceToHave },
  ].filter((half) => half.items.length > 0);

  return (
    <section aria-labelledby="requirements-heading">
      <h2 id="requirements-heading" className="sr-only">
        {labels.requirementsTitle}
      </h2>
      {halves.map((half, index) => (
        <div
          key={half.key}
          className={index > 0 ? "mt-5 border-t-2 border-rule-strong pt-4" : undefined}
        >
          <h3 className="label-caps flex items-baseline justify-between px-2.5 text-mute">
            <span>{labels.importance[half.key]}</span>
            <span className="edge-number text-[13px]">{half.items.length}</span>
          </h3>
          <ul className="mt-2 space-y-0.5">
            {half.items.map((requirement) => (
              <RequirementRow
                key={requirement.id}
                requirement={requirement}
                isSelected={requirement.id === selectedId}
                onSelect={onSelect}
                labels={labels}
                contentLang={contentLang}
              />
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}

interface RequirementRowProps {
  requirement: RequirementMatch;
  isSelected: boolean;
  onSelect: RequirementListProps["onSelect"];
  labels: Dictionary["result"];
  contentLang?: string;
}

function RequirementRow({ requirement, isSelected, onSelect, labels, contentLang }: RequirementRowProps) {
  const detailsId = `requirement-${requirement.id}-details`;

  return (
    <li id={requirementAnchorId(requirement.id)} data-requirement-id={requirement.id} className="scroll-mt-6">
      <button
        type="button"
        aria-pressed={isSelected}
        aria-controls={isSelected ? detailsId : undefined}
        // A click fired from the keyboard reports detail 0; keyboard selection skips the draw-on animation.
        onClick={(event) => onSelect(requirement.id, event.detail === 0 ? "keyboard" : "pointer")}
        className="group grid w-full grid-cols-[14px_minmax(0,1fr)] items-start gap-x-2.5 rounded-[5px] px-2.5 py-2 text-left transition-colors duration-150 hover:bg-desk-deep active:bg-rule aria-pressed:bg-paper aria-pressed:shadow-[0_0_0_1px_var(--color-rule)]"
      >
        <span className="flex h-[21px] items-center justify-center">
          <StatusMark status={requirement.status} importance={requirement.importance} />
        </span>
        <span className="text-[14px] leading-[1.5] text-ink">
          {requirement.text}
          <span className="sr-only">, {labels.status[requirement.status]}</span>
        </span>
      </button>
      {isSelected && (
        <RequirementDetails id={detailsId} requirement={requirement} labels={labels} contentLang={contentLang} />
      )}
    </li>
  );
}

/** Inline reasoning for small screens, where the CV sheet sits far below the list. */
function RequirementDetails({
  id,
  requirement,
  labels,
  contentLang,
}: {
  id: string;
  requirement: RequirementMatch;
  labels: Dictionary["result"];
  contentLang?: string;
}) {
  return (
    <div id={id} className="px-2.5 pt-1 pb-3 pl-[34px] text-[14px] lg:hidden">
      <p className={requirement.status === "missing" ? "text-marker" : "text-ink-soft"}>
        <span className="font-semibold">{labels.status[requirement.status]}.</span>{" "}
        <span lang={contentLang}>{requirement.reasoning}</span>
      </p>
      {requirement.evidence.length > 0 && (
        <>
          <h4 className="label-caps mt-3 text-mute">{labels.supportingLines}</h4>
          {/* Quotes stay in the CV's own language, which is not detected, so they inherit the page language. */}
          <ul className="mt-1.5 space-y-2">
            {requirement.evidence.map((reference) => (
              <li key={reference.evidence_id} className="border-l-2 border-rule pl-3 leading-[1.5] text-ink">
                <q>{reference.quote}</q>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
