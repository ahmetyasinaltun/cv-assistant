// Inline link from a fix or a question back to a requirement, carrying the requirement's status mark.
// It is an in-page link (inline, so long names wrap with the surrounding text) that also selects the requirement.

import type { RequirementMatch } from "@/lib/api/types";

import { requirementAnchorId, type SelectionSource } from "./RequirementList";
import { StatusMark } from "./StatusMark";

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
      className="group rounded-[3px] text-ink-soft no-underline transition-colors duration-150 hover:text-ink aria-[current=true]:text-ink"
    >
      <span className="mr-1.5 inline-block align-[-1px]">
        <StatusMark status={requirement.status} importance={requirement.importance} />
      </span>
      <span className="underline decoration-rule underline-offset-[3px] transition-colors duration-150 group-hover:decoration-ink group-aria-[current=true]:decoration-marker">
        {requirement.text}
      </span>
    </a>
  );
}
