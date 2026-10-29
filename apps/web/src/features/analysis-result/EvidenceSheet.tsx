"use client";

// The CV sheet: every evidence line grouped by section, with the selected requirement's note pinned on top and its
// supporting words highlighted in the status colour.

import { useEffect, useState, type RefObject } from "react";

import { StatusMark } from "@/components/StatusMark";
import type { Dictionary } from "@/i18n/dictionaries";
import { pluralize } from "@/i18n/format";
import type { CandidateEvidence, MatchStatus, RequirementMatch } from "@/lib/api/types";

import { groupEvidenceBySection, splitForHighlight } from "./view-model";

const NOTE_TONE: Record<MatchStatus, string> = {
  matched: "bg-ok-tint",
  partial: "bg-partial-tint",
  missing: "bg-marker-tint",
};

interface EvidenceSheetProps {
  resumeTitle: string;
  evidence: CandidateEvidence[];
  selected: RequirementMatch | null;
  /** Keyboard selection shows the highlight at once instead of sweeping it in. */
  instantHighlight: boolean;
  labels: Dictionary["result"];
  locale: string;
  contentLang?: string;
  /** Owned by the parent, which scrolls the sheet into registration with the selected row. */
  sheetRef: RefObject<HTMLElement | null>;
}

export function EvidenceSheet({
  resumeTitle,
  evidence,
  selected,
  instantHighlight,
  labels,
  locale,
  contentLang,
  sheetRef,
}: EvidenceSheetProps) {
  const quotes = new Map(selected?.evidence.map((reference) => [reference.evidence_id, reference.quote]) ?? []);
  const hasMoreBelow = useMoreBelowHint(sheetRef);

  return (
    <article
      ref={sheetRef}
      aria-labelledby="sheet-heading"
      className="relative rounded-card border border-rule bg-paper shadow-sheet lg:sticky lg:top-4 lg:max-h-[calc(100dvh-2rem)] lg:overflow-y-auto lg:overscroll-contain"
    >
      {/* On wide screens the sheet scrolls inside itself; its title and the selection note stay pinned on top. */}
      <header className="rounded-t-card bg-paper px-5 pt-5 sm:px-8 sm:pt-6 lg:sticky lg:top-0 lg:z-10">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-rule pb-3.5">
          <h2 id="sheet-heading" className="text-[19px] leading-tight font-bold tracking-[-0.01em]">
            {resumeTitle}
          </h2>
          <p className="text-[14px] text-mute">{pluralize(locale, evidence.length, labels.sheetLines)}</p>
        </div>
        {selected && (
          <div role="status" className={`mt-4 flex gap-2.5 rounded-[10px] px-3.5 py-3 text-[15px] leading-[1.5] ${NOTE_TONE[selected.status]}`}>
            <span className="mt-0.5">
              <StatusMark status={selected.status} />
            </span>
            <p className="text-ink">
              <span className="font-semibold">
                {selected.text} · {labels.status[selected.status]}.
              </span>{" "}
              <span lang={contentLang}>{selected.reasoning}</span>
            </p>
          </div>
        )}
      </header>

      <div className="px-5 pb-7 sm:px-8">
        {evidence.length === 0 ? (
          <p className="mt-6 text-ink-soft">{labels.sheetEmpty}</p>
        ) : (
          // CV lines stay in the CV's own language, which is not detected, so they inherit the page language.
          groupEvidenceBySection(evidence).map(({ section, items }) => (
            <section key={section ?? "other"} className="mt-6">
              <h3 className="text-[14px] font-semibold text-ink-soft">{section ?? labels.otherSection}</h3>
              <ul className="mt-1.5">
                {items.map((item) => {
                  const quote = quotes.get(item.id);
                  const isSupporting = quote !== undefined;
                  return (
                    <li key={item.id} data-evidence-id={item.id}>
                      <p
                        data-highlighted={isSupporting || undefined}
                        className={`py-[7px] text-[15.5px] leading-[1.55] transition-colors duration-200 ${
                          selected && !isSupporting ? "text-mute" : "text-ink"
                        }`}
                      >
                        {isSupporting && selected
                          ? splitForHighlight(item.text, quote).map((segment, index) =>
                              segment.highlighted ? (
                                <mark
                                  // A new selection remounts the mark, so the sweep plays again.
                                  key={`${selected.id}-${index}`}
                                  className="highlight"
                                  data-tone={selected.status}
                                  data-instant={instantHighlight || undefined}
                                >
                                  {segment.text}
                                </mark>
                              ) : (
                                <span key={index}>{segment.text}</span>
                              ),
                            )
                          : item.text}
                      </p>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))
        )}
      </div>
      {hasMoreBelow && (
        <div
          aria-hidden="true"
          className="pointer-events-none sticky bottom-0 -mt-14 h-14 rounded-b-card bg-linear-to-t from-paper to-transparent"
        />
      )}
    </article>
  );
}

/** Tracks whether the sheet has content below its visible area, so a fade can say "this scrolls". */
function useMoreBelowHint(sheetRef: RefObject<HTMLElement | null>) {
  const [hasMoreBelow, setHasMoreBelow] = useState(false);

  useEffect(() => {
    const element = sheetRef.current;
    if (!element) return;
    const update = () =>
      setHasMoreBelow(element.scrollHeight - element.scrollTop - element.clientHeight > 4);
    update();
    element.addEventListener("scroll", update, { passive: true });
    const observer = new ResizeObserver(update);
    for (const child of Array.from(element.children)) observer.observe(child);
    observer.observe(element);
    return () => {
      element.removeEventListener("scroll", update);
      observer.disconnect();
    };
  }, [sheetRef]);

  return hasMoreBelow;
}
