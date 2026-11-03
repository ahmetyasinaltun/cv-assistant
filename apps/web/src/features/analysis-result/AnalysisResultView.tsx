"use client";

// Analysis result screen: brand band, summary card, fixes, requirements beside the highlighted CV sheet, and
// interview questions. Owns the selected requirement and keeps the sheet registered with it; all judgements come from the API.

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { onBrandButtonClass, onBrandPrimaryButtonClass } from "@/components/button-styles";
import type { Dictionary } from "@/i18n/dictionaries";
import type { AnalysisDetail, InterviewQuestion } from "@/lib/api/types";

import { AnalysisStatusPanel } from "./AnalysisStatusPanel";
import { EvidenceSheet } from "./EvidenceSheet";
import { FixList } from "./FixList";
import { InterviewQuestions, type QuestionsState } from "./InterviewQuestions";
import { MatchSummary } from "./MatchSummary";
import { PrintableResult } from "./PrintableResult";
import { PrintButton } from "./PrintButton";
import { RequirementList, type SelectionSource } from "./RequirementList";
import { ResultHeader } from "./ResultHeader";
import { defaultSelectedRequirementId } from "./view-model";

const WIDE_LAYOUT_QUERY = "(min-width: 1024px)";
const SHEET_MARGIN = 16;

interface Selection {
  id: string | null;
  source: SelectionSource;
  /** True when chosen outside the list (a fix or a question), so the row is brought into view first. */
  jump: boolean;
}

interface AnalysisResultViewProps {
  analysis: AnalysisDetail;
  labels: Dictionary["result"];
  locale: string;
  createdAtLabel: string;
  isSample?: boolean;
  generateQuestions?: () => Promise<InterviewQuestion[]>;
  retryHref?: string;
  /** Runs the analysis again on the server (real analyses); the sample uses `retryHref` instead. */
  retryAction?: () => Promise<void>;
  newAnalysisHref?: string;
  /** The analyses list, offered as the way back from a real analysis. */
  backHref?: string;
  /** Writing a CV for this posting (real analyses only): the band's main action. */
  tailor?: { href: string; label: string };
}

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function afterScrollSettles(callback: () => void) {
  let done = false;
  const run = () => {
    if (done) return;
    done = true;
    window.removeEventListener("scrollend", run);
    callback();
  };
  window.addEventListener("scrollend", run, { once: true });
  window.setTimeout(run, 450);
}

/** Scrolls the sheet so the first highlighted line sits level with the selected row ("registration"). */
function registerSheet(sheet: HTMLElement, requirementId: string, behavior: ScrollBehavior) {
  const row = document.querySelector(`[data-requirement-id="${requirementId}"]`);
  const highlighted = sheet.querySelector("[data-highlighted='true']");
  if (!row || !highlighted) return;

  const sheetRect = sheet.getBoundingClientRect();
  const highlightedRect = highlighted.getBoundingClientRect();
  // The sheet's title and note are pinned at its top, so the usable area starts below them.
  const pinnedHeader = sheet.querySelector("header");
  const minTop = (pinnedHeader?.getBoundingClientRect().bottom ?? sheetRect.top) + SHEET_MARGIN;
  const maxTop = Math.max(minTop, sheetRect.bottom - highlightedRect.height - SHEET_MARGIN);
  const targetTop = Math.min(Math.max(row.getBoundingClientRect().top, minTop), maxTop);
  sheet.scrollBy({ top: highlightedRect.top - targetTop, behavior });
}

export function AnalysisResultView({
  analysis,
  labels,
  locale,
  createdAtLabel,
  isSample = false,
  generateQuestions,
  retryHref,
  retryAction,
  newAnalysisHref,
  backHref,
  tailor,
}: AnalysisResultViewProps) {
  const result = analysis.status === "completed" ? analysis.result : null;
  // AI-written text keeps the language the analysis was generated in, which can differ from the interface.
  const contentLang = analysis.output_language;
  const requirements = useMemo(() => result?.requirements ?? [], [result]);

  const [selection, setSelection] = useState<Selection>(() => ({
    id: result ? defaultSelectedRequirementId(result.requirements, result.suggestions) : null,
    source: "initial",
    jump: false,
  }));
  const [questions, setQuestions] = useState<QuestionsState>(() =>
    analysis.interview_questions
      ? { kind: "ready", questions: analysis.interview_questions }
      : { kind: "idle" },
  );
  const sheetRef = useRef<HTMLElement>(null);

  const selected = requirements.find((requirement) => requirement.id === selection.id) ?? null;
  const requirementsById = useMemo(
    () => new Map(requirements.map((requirement) => [requirement.id, requirement])),
    [requirements],
  );
  const evidenceById = useMemo(
    () => new Map((result?.candidate_evidence ?? []).map((item) => [item.id, item])),
    [result],
  );

  useEffect(() => {
    const sheet = sheetRef.current;
    const { id, source, jump } = selection;
    if (!sheet || !id || source === "initial") return;

    const instant = source === "keyboard" || prefersReducedMotion();
    const behavior: ScrollBehavior = instant ? "auto" : "smooth";
    const isWide = window.matchMedia(WIDE_LAYOUT_QUERY).matches;

    if (jump) {
      document
        .querySelector(`[data-requirement-id="${id}"]`)
        ?.scrollIntoView({ block: "center", behavior });
    }
    if (!isWide) return;
    if (jump && !instant) afterScrollSettles(() => registerSheet(sheet, id, "smooth"));
    else registerSheet(sheet, id, behavior);
  }, [selection]);

  const selectFromList = (id: string, source: SelectionSource) =>
    setSelection({ id, source, jump: false });
  const selectElsewhere = (id: string, source: SelectionSource) =>
    setSelection({ id, source, jump: true });

  async function startQuestions() {
    if (!generateQuestions) return;
    setQuestions({ kind: "loading" });
    try {
      setQuestions({ kind: "ready", questions: await generateQuestions() });
    } catch {
      setQuestions({ kind: "error" });
    }
  }

  const questionsAction = result ? (
    questions.kind === "idle" && generateQuestions ? (
      <button
        type="button"
        className={onBrandButtonClass}
        onClick={() => {
          void startQuestions();
          document.getElementById("interview-questions")?.scrollIntoView({ behavior: "smooth" });
        }}
      >
        {labels.questions.generate}
      </button>
    ) : (
      <a href="#interview-questions" className={onBrandButtonClass}>
        {labels.questions.jump}
      </a>
    )
  ) : null;

  // The product's main outcome is a better CV, so writing one for this posting leads; questions follow, outlined.
  const headerAction =
    result && tailor ? (
      <div className="flex flex-wrap items-center gap-2.5">
        <Link href={tailor.href} className={onBrandPrimaryButtonClass}>
          {tailor.label}
        </Link>
        {questionsAction}
      </div>
    ) : (
      questionsAction
    );

  return (
    <main id="main" className="pb-24 print:pb-0">
      <div className="print:hidden">
        <ResultHeader
          jobTitle={analysis.job_title}
          company={analysis.company}
          resumeTitle={analysis.resume_title}
          createdAt={analysis.created_at}
          createdAtLabel={createdAtLabel}
          isSample={isSample}
          labels={labels}
          backHref={backHref}
          action={headerAction}
          metaAction={result ? <PrintButton label={labels.print.button} /> : null}
        />

        <div className="mx-auto max-w-[1280px] px-4 sm:px-8">
          {!result ? (
            <AnalysisStatusPanel
              status={analysis.status === "completed" ? "failed" : analysis.status}
              errorCode={analysis.error_code}
              retryHref={retryHref}
              retryAction={retryAction}
              newAnalysisHref={newAnalysisHref}
              labels={labels}
            />
          ) : (
            <>
              <MatchSummary
                overall={result.overall}
                requirements={requirements}
                labels={labels}
                locale={locale}
                contentLang={contentLang}
              />
              <FixList
                suggestions={result.suggestions}
                requirementsById={requirementsById}
                selectedId={selection.id}
                onSelect={selectElsewhere}
                labels={labels}
                locale={locale}
                contentLang={contentLang}
              />
              <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
                <RequirementList
                  requirements={requirements}
                  evidenceById={evidenceById}
                  selectedId={selection.id}
                  onSelect={selectFromList}
                  labels={labels}
                  locale={locale}
                  contentLang={contentLang}
                />
                <div className="min-w-0">
                  <EvidenceSheet
                    sheetRef={sheetRef}
                    resumeTitle={analysis.resume_title}
                    evidence={result.candidate_evidence}
                    selected={selected}
                    instantHighlight={selection.source === "keyboard"}
                    labels={labels}
                    locale={locale}
                    contentLang={contentLang}
                  />
                </div>
              </div>
              <InterviewQuestions
                state={questions}
                onGenerate={generateQuestions ? () => void startQuestions() : undefined}
                requirementsById={requirementsById}
                selectedId={selection.id}
                onSelect={selectElsewhere}
                labels={labels.questions}
                contentLang={contentLang}
              />
              <Limitations items={result.overall.limitations} title={labels.limitationsTitle} contentLang={contentLang} />
            </>
          )}
        </div>
      </div>
      {result && (
        <PrintableResult
          analysis={analysis}
          result={result}
          questions={questions.kind === "ready" ? questions.questions : null}
          labels={labels}
          createdAtLabel={createdAtLabel}
          contentLang={contentLang}
        />
      )}
    </main>
  );
}

/** What the analysis cannot know, set quietly under the cards. */
function Limitations({ items, title, contentLang }: { items: string[]; title: string; contentLang?: string }) {
  if (items.length === 0) return null;
  return (
    <section aria-labelledby="limitations-heading" className="mt-8 px-0.5">
      <h2 id="limitations-heading" className="text-[15px] font-semibold text-ink-soft">
        {title}
      </h2>
      <ul lang={contentLang} className="mt-2 grid max-w-[80ch] list-disc gap-1 pl-5 text-[14px] text-mute marker:text-rule">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}
