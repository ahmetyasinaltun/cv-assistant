"use client";

// The CV sheet: pick a saved CV, or add a new one by pasting text or uploading a PDF or Word file.

import type { Dictionary } from "@/i18n/dictionaries";

import {
  NEW_RESUME,
  type FieldErrors,
  type NewAnalysisDraft,
  type ResumeOption,
} from "./new-analysis-model";
import { NewResumeFields } from "./NewResumeFields";
import { SavedResumeRow } from "./SavedResumeRow";

interface ResumeSheetProps {
  resumes: ResumeOption[];
  analysisCounts: Map<string, number>;
  draft: NewAnalysisDraft;
  onChange: (patch: Partial<NewAnalysisDraft>) => void;
  onFileChange: (file: File | null) => void;
  errors: FieldErrors;
  locale: string;
  labels: Dictionary["newAnalysis"];
}

export function ResumeSheet({ resumes, analysisCounts, draft, onChange, onFileChange, errors, locale, labels }: ResumeSheetProps) {
  const copy = labels.resume;
  const isNew = draft.resumeChoice === NEW_RESUME;

  const newResumeFields = (
    <NewResumeFields
      draft={draft}
      onChange={onChange}
      onFileChange={onFileChange}
      errors={errors}
      locale={locale}
      labels={labels}
    />
  );

  return (
    <section aria-labelledby="resume-sheet-title" className="rounded-card border border-rule bg-paper px-5 py-6 shadow-sheet sm:px-7 sm:py-7">
      <h2 id="resume-sheet-title" className="text-[21px] leading-[1.25] font-bold tracking-[-0.015em]">
        {resumes.length > 0 ? copy.title : copy.addFirst}
      </h2>

      {resumes.length === 0 ? (
        <div className="mt-5">
          <input type="hidden" name="resumeChoice" value={NEW_RESUME} />
          {newResumeFields}
        </div>
      ) : (
        <fieldset className="mt-1">
          <legend className="text-[15px] text-ink-soft">{copy.legend}</legend>
          <ul className="mt-4 space-y-1">
            {resumes.map((resume) => (
              <li key={resume.id}>
                <SavedResumeRow
                  resume={resume}
                  checked={draft.resumeChoice === resume.id}
                  onSelect={() => onChange({ resumeChoice: resume.id })}
                  analysisCount={analysisCounts.get(resume.id) ?? 0}
                  locale={locale}
                  labels={copy}
                />
              </li>
            ))}
            <li>
              <label className="flex cursor-pointer items-center gap-3 rounded-[10px] px-3 py-3 transition-colors duration-150 hover:bg-desk has-checked:bg-accent-tint">
                <input
                  type="radio"
                  name="resumeChoice"
                  value={NEW_RESUME}
                  checked={isNew}
                  onChange={() => onChange({ resumeChoice: NEW_RESUME })}
                  className="size-4 shrink-0 accent-accent"
                />
                <span className="font-semibold text-ink">{copy.addNew}</span>
              </label>
              {isNew && <div className="px-3 pt-3 pb-2 sm:pl-[40px]">{newResumeFields}</div>}
            </li>
          </ul>
        </fieldset>
      )}
    </section>
  );
}
