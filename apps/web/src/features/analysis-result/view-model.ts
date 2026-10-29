// Pure helpers that shape an analysis result for display: grouping, counting, default selection and quote highlighting.
// They only rearrange server data for presentation; scoring and matching decisions stay on the server.

import type {
  CandidateEvidence,
  MatchStatus,
  Priority,
  RequirementMatch,
  Suggestion,
} from "@/lib/api/types";

export type StatusCounts = Record<MatchStatus, number>;

export interface EvidenceSection {
  /** Section name as extracted by the pipeline; null when the pipeline could not tell. */
  section: string | null;
  items: CandidateEvidence[];
}

export interface TextSegment {
  text: string;
  highlighted: boolean;
}

const PRIORITY_RANK: Record<Priority, number> = { high: 0, medium: 1, low: 2 };

export function countByStatus(requirements: RequirementMatch[]): StatusCounts {
  const counts: StatusCounts = { matched: 0, partial: 0, missing: 0 };
  for (const requirement of requirements) counts[requirement.status] += 1;
  return counts;
}

export function splitByImportance(requirements: RequirementMatch[]) {
  return {
    mustHave: requirements.filter((requirement) => requirement.importance === "must_have"),
    niceToHave: requirements.filter((requirement) => requirement.importance === "nice_to_have"),
  };
}

/** Groups evidence by CV section, keeping the order in which sections first appear in the CV. */
export function groupEvidenceBySection(evidence: CandidateEvidence[]): EvidenceSection[] {
  const groups = new Map<string | null, CandidateEvidence[]>();
  for (const item of evidence) {
    const key = item.section?.trim() || null;
    const group = groups.get(key);
    if (group) group.push(item);
    else groups.set(key, [item]);
  }
  return Array.from(groups, ([section, items]) => ({ section, items }));
}

export function sortSuggestionsByPriority(suggestions: Suggestion[]): Suggestion[] {
  return [...suggestions].sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]);
}

/**
 * Chooses the requirement to show first: the gap behind the most important fix, then the first
 * unmet must-have, then any unmet requirement, then the first requirement.
 */
export function defaultSelectedRequirementId(
  requirements: RequirementMatch[],
  suggestions: Suggestion[],
): string | null {
  const byId = new Map(requirements.map((requirement) => [requirement.id, requirement]));
  const isGap = (requirement: RequirementMatch | undefined) =>
    requirement !== undefined && requirement.status !== "matched";

  for (const suggestion of sortSuggestionsByPriority(suggestions)) {
    const gapId = suggestion.related_requirement_ids.find((id) => isGap(byId.get(id)));
    if (gapId) return gapId;
  }

  const firstUnmetMustHave = requirements.find(
    (requirement) => requirement.importance === "must_have" && isGap(requirement),
  );
  const firstUnmet = requirements.find(isGap);
  return (firstUnmetMustHave ?? firstUnmet ?? requirements[0])?.id ?? null;
}

/** Splits `text` around the first case-insensitive occurrence of `quote` so the quoted words can be marked. */
export function splitByQuote(text: string, quote: string | undefined): TextSegment[] {
  const needle = quote?.trim();
  if (!needle) return [{ text, highlighted: false }];

  const start = text.toLowerCase().indexOf(needle.toLowerCase());
  if (start === -1) return [{ text, highlighted: false }];

  const end = start + needle.length;
  return [
    { text: text.slice(0, start), highlighted: false },
    { text: text.slice(start, end), highlighted: true },
    { text: text.slice(end), highlighted: false },
  ].filter((segment) => segment.text.length > 0);
}
