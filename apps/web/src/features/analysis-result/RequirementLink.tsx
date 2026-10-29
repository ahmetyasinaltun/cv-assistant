// Link from a fix or a question back to a requirement, as a small pill carrying the requirement's status icon.
// It is an in-page link that also selects the requirement, so its CV words are highlighted on the sheet.

import { StatusMark } from "@/components/StatusMark";
import type { RequirementMatch } from "@/lib/api/types";

import { requirementAnchorId, type SelectionSource } from "./RequirementList";

interface RequirementLinkProps {
  requirement: RequirementMatch;
  isSelected: boolean;
  onSelect: (requirementId: string, source: SelectionSource) => void;
}

export function RequirementLink({ requirement, isSelected, onSelect }: RequirementLinkProps) {
  return (
    <a
      href={`#${requirementAnchorId(requirement.id)}`}
      aria-current={isSelected ? "true" : undefined}
      onClick={(event) => {
        // Selection scrolls the row into view itself; the default hash jump would fight it.
        event.preventDefault();
        onSelect(requirement.id, event.detail === 0 ? "keyboard" : "pointer");
      }}
      className="inline-flex max-w-full items-start gap-1.5 rounded-lg border border-rule bg-desk py-1 pr-2.5 pl-1.5 text-[14px] leading-[1.4] font-medium text-ink no-underline transition-colors duration-150 hover:border-accent/40 hover:bg-accent-tint aria-[current=true]:border-accent/60 aria-[current=true]:bg-accent-tint"
    >
      <span className="mt-px">
        <StatusMark status={requirement.status} size={16} />
      </span>
      <span>{requirement.text}</span>
    </a>
  );
}
