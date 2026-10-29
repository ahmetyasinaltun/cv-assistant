"use client";

// New-analysis form: the CV sheet and the posting sheet side by side, one start action below.
// Fields are controlled so a failed attempt never empties a pasted CV; the server action does the work.

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition, type FormEvent } from "react";

import { primaryButtonClass } from "@/components/button-styles";
import { FormAlert } from "@/components/form/FormAlert";
import type { Dictionary } from "@/i18n/dictionaries";

import { startAnalysis } from "./actions";
import {
  NEW_RESUME,
  validateDraft,
  type FieldErrors,
  type NewAnalysisDraft,
  type ResumeOption,
  type StartAnalysisResult,
} from "./new-analysis-model";
import { PostingSheet } from "./PostingSheet";
import { ResumeSheet } from "./ResumeSheet";

/** Order in which the first invalid field receives focus after a failed submit. */
const FIELD_IDS: [keyof FieldErrors, string][] = [
  ["resumeTitle", "resume-title"],
  ["resumeText", "resume-text"],
  ["resumeFile", "resume-file"],
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

const TYPED_FIELDS = ["resumeTitle", "resumeText", "jobTitle", "company", "jobText"] as const;

function hasUnsavedInput(draft: NewAnalysisDraft, initial: NewAnalysisDraft): boolean {
  return draft.resumeFile !== null || TYPED_FIELDS.some((field) => draft[field] !== initial[field]);
}

function focusFirstInvalid(errors: FieldErrors) {
  const first = FIELD_IDS.find(([field]) => errors[field]);
  if (first) document.getElementById(first[1])?.focus();
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
    update({ resumeFile: file ? { name: file.name, size: file.size, type: file.type } : null });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    const found = validateDraft(effectiveDraft);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      focusFirstInvalid(found);
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
      focusFirstInvalid(result.fieldErrors);
    });
  }

  return (
    <form noValidate onSubmit={handleSubmit} aria-busy={isStarting}>
      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
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
        <PostingSheet draft={effectiveDraft} onChange={update} errors={errors} locale={locale} labels={labels} />
      </div>

      <div className="mt-7 flex flex-col gap-4">
        <FormAlert message={formError ? labels.errors[formError] : null} />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
          <button type="submit" disabled={isStarting} className={primaryButtonClass}>
            {isStarting ? labels.submitting : labels.submit}
          </button>
          <p className="max-w-[60ch] text-[14px] text-mute">{labels.submitNote}</p>
        </div>
      </div>
    </form>
  );
}
