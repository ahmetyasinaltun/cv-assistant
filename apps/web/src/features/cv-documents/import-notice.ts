// The one-time note after importing a saved CV (sections not carried over, facts not found in the CV), carried in the
// editor's address across the redirect. The address is user-editable, so reading it trusts nothing.

import type { UnsupportedFact } from "@/lib/api/types";

export interface ImportNotice {
  omitted: string[];
  unsupported: UnsupportedFact[];
}

const MAX_ITEMS = 10;
const MAX_TEXT = 80;
const FACT_KINDS: UnsupportedFact["kind"][] = ["role", "organization", "degree", "school", "date"];

export function encodeImportNotice(omitted: string[], unsupported: UnsupportedFact[]): string {
  const payload = {
    o: omitted.slice(0, MAX_ITEMS).map((text) => text.slice(0, MAX_TEXT)),
    u: unsupported.slice(0, MAX_ITEMS).map((fact) => [fact.kind, fact.value.slice(0, MAX_TEXT)]),
  };
  return encodeURIComponent(JSON.stringify(payload));
}

/** Reads the note from a search parameter value (already URL-decoded by the router); null when there is none. */
export function decodeImportNotice(value: string | string[] | undefined): ImportNotice | null {
  if (typeof value !== "string") return null;
  try {
    const payload = JSON.parse(value) as { o?: unknown; u?: unknown };
    const omitted = Array.isArray(payload.o)
      ? payload.o.filter((item): item is string => typeof item === "string").slice(0, MAX_ITEMS)
      : [];
    const unsupported = Array.isArray(payload.u)
      ? payload.u
          .filter(
            (item): item is [UnsupportedFact["kind"], string] =>
              Array.isArray(item) && FACT_KINDS.includes(item[0]) && typeof item[1] === "string",
          )
          .slice(0, MAX_ITEMS)
          .map(([kind, text]) => ({ kind, value: text.slice(0, MAX_TEXT) }))
      : [];
    return { omitted: omitted.map((text) => text.slice(0, MAX_TEXT)), unsupported };
  } catch {
    return null;
  }
}
