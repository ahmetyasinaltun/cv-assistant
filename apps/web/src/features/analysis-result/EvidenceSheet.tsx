"use client";

// The CV sheet: evidence statements grouped by section, with the selected requirement's support circled and annotated.

import { useEffect, useState, type ReactNode, type RefObject } from "react";

import type { Dictionary } from "@/i18n/dictionaries";
import { interpolate, pluralize } from "@/i18n/format";
import type { CandidateEvidence, RequirementMatch } from "@/lib/api/types";

import { GreasePencilLoop } from "./GreasePencilLoop";
import { evidenceLabel, groupEvidenceBySection, splitByQuote } from "./view-model";

interface EvidenceSheetProps {
  resumeTitle: string;
  evidence: CandidateEvidence[];
  limitations: string[];
  selected: RequirementMatch | null;
  instantLoop: boolean;
  labels: Dictionary["result"];
  locale: string;
  contentLang?: string;
  /** Owned by the parent, which scrolls the sheet into registration with the selected row. */
  sheetRef: RefObject<HTMLElement | null>;
}

export function EvidenceSheet({
  resumeTitle,
  evidence,
  limitations,
  selected,
  instantLoop,
  labels,
  locale,
  contentLang,
  sheetRef,
}: EvidenceSheetProps) {
  const quotes = new Map(selected?.evidence.map((reference) => [reference.evidence_id, reference.quote]) ?? []);
  const lastSupportingId = selected?.evidence.length
    ? [...evidence].reverse().find((item) => quotes.has(item.id))?.id
    : undefined;
  const hasMoreBelow = useMoreBelowHint(sheetRef);

  return (
    <article
      ref={sheetRef}
      aria-labelledby="sheet-heading"
      className="relative bg-paper shadow-sheet lg:sticky lg:top-4 lg:max-h-[calc(100dvh-2rem)] lg:overflow-y-auto lg:overscroll-contain"
    >
      {/* On wide screens the sheet scrolls inside itself; its title stays pinned above the lines. */}
      <header className="bg-paper px-5 pt-6 sm:px-8 sm:pl-[72px] lg:sticky lg:top-0 lg:z-10">
        <div className="border-b border-rule pb-4">
          <h2 id="sheet-heading" className="text-[20px] leading-tight font-semibold tracking-[-0.01em]">
            {resumeTitle}
          </h2>
          <p className="mt-1 text-[13px] text-mute">{pluralize(locale, evidence.length, labels.sheetLines)}</p>
        </div>
      </header>
      <div className="px-5 pb-8 sm:px-8 sm:pl-[72px]">
        {selected?.status === "missing" && (
          <EditorNote tone="missing">
            {interpolate(labels.missingNote, { requirement: selected.text })} {selected.reasoning}
          </EditorNote>
        )}

        {evidence.length === 0 ? (
          <p className="mt-6 text-ink-soft">{labels.sheetEmpty}</p>
        ) : (
          <div lang={contentLang}>
            {groupEvidenceBySection(evidence).map(({ section, items }) => (
              <section key={section ?? "other"} className="mt-7">
                <h3 className="border-b border-rule pb-1.5 text-[13px] font-semibold tracking-[0.01em] text-ink">
                  {section ?? labels.otherSection}
                </h3>
                <ul className="mt-3.5 space-y-4">
                  {items.map((item) => {
                    const quote = quotes.get(item.id);
                    const isSupporting = quote !== undefined;
                    return (
                      <li key={item.id} data-evidence-id={item.id}>
                        <p
                          data-circled={isSupporting && selected ? "true" : undefined}
                          className={`relative w-fit max-w-full text-[15px] leading-[1.6] transition-colors duration-200 ${
                            selected && !isSupporting ? "text-mute" : "text-ink"
                          }`}
                        >
                          <span translate="no" className="edge-number mr-2 text-[12px] text-edge sm:absolute sm:top-[3px] sm:-left-[52px] sm:mr-0">
                            {evidenceLabel(item.id)}
                          </span>
                          {splitByQuote(item.text, quote).map((segment, index) =>
                            segment.highlighted ? (
                              <mark
                                key={index}
                                className="bg-transparent text-ink underline decoration-marker decoration-2 underline-offset-[5px]"
                              >
                                {segment.text}
                              </mark>
                            ) : (
                              <span key={index}>{segment.text}</span>
                            ),
                          )}
                          {isSupporting && selected && (
                            <GreasePencilLoop
                              key={`${selected.id}-${item.id}`}
                              seed={`${selected.id}-${item.id}`}
                              dashed={selected.status === "partial"}
                              instant={instantLoop}
                            />
                          )}
                        </p>
                        {item.id === lastSupportingId && selected && (
                          <EditorNote tone={selected.status === "partial" ? "partial" : "matched"}>
                            <span className="font-semibold">{labels.status[selected.status]}.</span>{" "}
                            {selected.reasoning}
                          </EditorNote>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        )}

        {limitations.length > 0 && (
          <footer className="mt-8 border-t border-rule pt-4">
            <h3 className="label-caps text-mute">{labels.limitationsTitle}</h3>
            <ul lang={contentLang} className="mt-2 list-disc space-y-1 pl-4 text-[13px] text-ink-soft marker:text-rule">
              {limitations.map((limitation) => (
                <li key={limitation}>{limitation}</li>
              ))}
            </ul>
          </footer>
        )}
      </div>
      {hasMoreBelow && (
        <div
          aria-hidden="true"
          className="pointer-events-none sticky bottom-0 -mt-14 h-14 bg-linear-to-t from-paper to-transparent"
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

/** The editor's handwriting-free margin note: an authored hook arrow and one line of reasoning. */
function EditorNote({ tone, children }: { tone: "matched" | "partial" | "missing"; children: ReactNode }) {
  return (
    <p
      role="status"
      className={`mt-3 flex gap-2 text-[14px] leading-[1.5] ${tone === "matched" ? "text-ink-soft" : "text-marker"}`}
    >
      <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" className="mt-[3px] shrink-0">
        <path
          d="M3 1.5v6.5a3 3 0 0 0 3 3h7.5M10.5 8l3 3-3 3"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span>{children}</span>
    </p>
  );
}
