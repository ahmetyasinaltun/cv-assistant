"use client";

// Analysis result screen: summary, requirements, the circled CV sheet, fixes and interview questions.
// Owns the selected requirement and keeps the sheet registered with it; all judgements come from the API.

import { useEffect, useMemo, useRef, useState } from "react";

import { primaryButtonClass } from "@/components/button-styles";
import type { Dictionary } from "@/i18n/dictionaries";
import type { AnalysisDetail, InterviewQuestion } from "@/lib/api/types";

import { AnalysisStatusPanel } from "./AnalysisStatusPanel";
import { EvidenceSheet } from "./EvidenceSheet";
import { FixList } from "./FixList";
import { InterviewQuestions, type QuestionsState } from "./InterviewQuestions";
import { MatchSummary } from "./MatchSummary";
import { RequirementList, type SelectionSource } from "./RequirementList";
import { ResultHeader } from "./ResultHeader";
import { countByStatus, defaultSelectedRequirementId } from "./view-model";

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

/** Scrolls the sheet so the first circled line sits level with the selected row ("registration"). */
function registerSheet(sheet: HTMLElement, requirementId: string, behavior: ScrollBehavior) {
  const row = document.querySelector(`[data-requirement-id="${requirementId}"]`);
  const circled = sheet.querySelector("[data-circled='true']") ?? sheet.querySelector("[role='status']");
  if (!row || !circled) return;

  const sheetRect = sheet.getBoundingClientRect();
  const circledRect = circled.getBoundingClientRect();
  // The sheet's title is pinned at its top, so the usable area starts below it.
  const pinnedHeader = sheet.querySelector("header");
  const minTop = (pinnedHeader?.getBoundingClientRect().bottom ?? sheetRect.top) + SHEET_MARGIN;
  const maxTop = Math.max(minTop, sheetRect.bottom - circledRect.height - SHEET_MARGIN);
  const targetTop = Math.min(Math.max(row.getBoundingClientRect().top, minTop), maxTop);
  sheet.scrollBy({ top: circledRect.top - targetTop, behavior });
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

  const headerAction = result ? (
    questions.kind === "idle" && generateQuestions ? (
      <button
        type="button"
        className={primaryButtonClass}
        onClick={() => {
          void startQuestions();
          document.getElementById("interview-questions")?.scrollIntoView({ behavior: "smooth" });
        }}
      >
        {labels.questions.generate}
      </button>
    ) : (
      <a href="#interview-questions" className={primaryButtonClass}>
        {labels.questions.jump}
      </a>
    )
  ) : null;

  return (
    <main id="main" className="mx-auto max-w-[1520px] px-4 pb-24 sm:px-6">
      <ResultHeader
        jobTitle={analysis.job_title}
        company={analysis.company}
        resumeTitle={analysis.resume_title}
        createdAt={analysis.created_at}
        createdAtLabel={createdAtLabel}
        isSample={isSample}
        labels={labels}
        action={headerAction}
      />

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
            counts={countByStatus(result.requirements)}
            labels={labels}
            contentLang={contentLang}
          />
          <div className="result-grid mt-7">
            <div className="[grid-area:requirements]">
              <RequirementList
                requirements={requirements}
                selectedId={selection.id}
                onSelect={selectFromList}
                labels={labels}
                contentLang={contentLang}
              />
            </div>
            <div className="min-w-0 [grid-area:sheet]">
              <EvidenceSheet
                sheetRef={sheetRef}
                resumeTitle={analysis.resume_title}
                evidence={result.candidate_evidence}
                limitations={result.overall.limitations}
                selected={selected}
                instantLoop={selection.source === "keyboard"}
                labels={labels}
                locale={locale}
                contentLang={contentLang}
              />
            </div>
            <div className="[grid-area:fixes]">
              <FixList
                suggestions={result.suggestions}
                requirementsById={requirementsById}
                selectedId={selection.id}
                onSelect={selectElsewhere}
                labels={labels}
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
        </>
      )}
    </main>
  );
}
