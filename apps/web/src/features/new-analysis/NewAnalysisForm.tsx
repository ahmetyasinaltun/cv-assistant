"use client";

// New-analysis form: the CV sheet and the posting sheet side by side, closed by a start card placed without gaps.
// Fields are controlled so a failed attempt never empties a pasted CV; the server action does the work.

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition, type FormEvent } from "react";

import type { Dictionary } from "@/i18n/dictionaries";

import { startAnalysis } from "./actions";
import {
  NEW_RESUME,
  comparisonSummary,
  filePatch,
  validateDraft,
  type FieldErrors,
  type NewAnalysisDraft,
  type ResumeOption,
  type StartAnalysisResult,
} from "./new-analysis-model";
import { RESUME_FIELD_IDS, focusFirstInvalid } from "./NewResumeFields";
import { PostingSheet } from "./PostingSheet";
import { ResumeSheet } from "./ResumeSheet";
import { StartCard } from "./StartCard";

/** Order in which the first invalid field receives focus after a failed submit. */
const FIELD_IDS: [keyof FieldErrors, string][] = [
  ...RESUME_FIELD_IDS,
  ["jobTitle", "job-title"],
  ["jobText", "job-text"],
];

interface NewAnalysisFormProps {
  resumes: ResumeOption[];
  analysisCounts: Map<string, number>;
  initialDraft: NewAnalysisDraft;
  locale: string;
  labels: Dictionary["newAnalysis"];
}

/**
 * Wide-screen grid cells. The start card closes the form where it leaves no gap of page ground: under the CV when a
 * saved CV is picked (the short column), under the posting when a new CV is typed below the saved ones (the CV
 * column is then the long one), and across both when there is no saved CV and the two sheets are about as tall.
 */
const PLACEMENTS = {
  savedCv: {
    resume: "lg:col-start-1 lg:row-start-1",
    posting: "lg:col-start-2 lg:row-span-2 lg:row-start-1",
    start: "lg:col-start-1 lg:row-start-2",
    wideStart: false,
  },
  newCvBelowSaved: {
    resume: "lg:col-start-1 lg:row-span-2 lg:row-start-1",
    posting: "lg:col-start-2 lg:row-start-1",
    start: "lg:col-start-2 lg:row-start-2",
    wideStart: false,
  },
  firstCv: {
    resume: "lg:col-start-1 lg:row-start-1",
    posting: "lg:col-start-2 lg:row-start-1",
    start: "lg:col-span-2 lg:row-start-2",
    wideStart: true,
  },
};

const TYPED_FIELDS = ["resumeTitle", "resumeText", "jobTitle", "company", "jobText"] as const;

function hasUnsavedInput(draft: NewAnalysisDraft, initial: NewAnalysisDraft): boolean {
  return draft.resumeFile !== null || TYPED_FIELDS.some((field) => draft[field] !== initial[field]);
}

export function NewAnalysisForm({ resumes, analysisCounts, initialDraft, locale, labels }: NewAnalysisFormProps) {
  const router = useRouter();
  const [draft, setDraft] = useState(initialDraft);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<StartAnalysisResult["formError"]>(null);
  const [isStarting, startTransition] = useTransition();
  const isDirty = hasUnsavedInput(draft, initialDraft);

  // A pasted CV or posting is easy to lose by closing or reloading the tab; ask first.
  useEffect(() => {
    if (!isDirty || isStarting) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [isDirty, isStarting]);

  // A deleted or never-saved CV id falls back to the newest saved CV, or to adding a new one.
  const choiceExists =
    draft.resumeChoice === NEW_RESUME || resumes.some((resume) => resume.id === draft.resumeChoice);
  const effectiveDraft: NewAnalysisDraft = choiceExists
    ? draft
    : { ...draft, resumeChoice: resumes[0]?.id ?? NEW_RESUME };

  const placement =
    effectiveDraft.resumeChoice !== NEW_RESUME
      ? PLACEMENTS.savedCv
      : resumes.length > 0
        ? PLACEMENTS.newCvBelowSaved
        : PLACEMENTS.firstCv;

  function update(patch: Partial<NewAnalysisDraft>) {
    setDraft((current) => ({ ...current, ...patch }));
    // An edited field is no longer the one in error.
    setErrors((current) => {
      const next = { ...current };
      for (const key of Object.keys(patch)) delete next[key as keyof FieldErrors];
      return next;
    });
  }

  function updateFile(file: File | null) {
    update(filePatch(file, draft.resumeTitle));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    const found = validateDraft(effectiveDraft);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      focusFirstInvalid(FIELD_IDS, found);
      return;
    }
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await startAnalysis(locale, formData);
      // Success redirects to the new analysis, so only a failure has a result to show.
      if (!result) return;
      setErrors(result.fieldErrors);
      setFormError(result.formError);
      if (result.savedResumeId) {
        setDraft((current) => ({ ...current, resumeChoice: result.savedResumeId ?? current.resumeChoice }));
        router.refresh();
      }
      focusFirstInvalid(FIELD_IDS, result.fieldErrors);
    });
  }

  return (
    <form noValidate onSubmit={handleSubmit} aria-busy={isStarting}>
      {/* Source order (CV, posting, start) is the reading, tab and phone order; wide screens only place the cells. */}
      <div className="grid gap-6 lg:grid-cols-2 lg:grid-rows-[auto_1fr] lg:items-start">
        <div className={placement.resume}>
          <ResumeSheet
            resumes={resumes}
            analysisCounts={analysisCounts}
            draft={effectiveDraft}
            onChange={update}
            onFileChange={updateFile}
            errors={errors}
            locale={locale}
            labels={labels}
          />
        </div>
        <div className={placement.posting}>
          <PostingSheet draft={effectiveDraft} onChange={update} errors={errors} locale={locale} labels={labels} />
        </div>
        <div className={`lg:sticky lg:top-4 ${placement.start}`}>
          <StartCard
            summary={comparisonSummary(effectiveDraft, resumes)}
            formError={formError ? labels.errors[formError] : null}
            isStarting={isStarting}
            wide={placement.wideStart}
            labels={labels}
          />
        </div>
      </div>
    </form>
  );
}
