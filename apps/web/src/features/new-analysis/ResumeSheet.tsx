"use client";

// The CV sheet: pick a saved CV, or add a new one by pasting text or uploading a PDF.

import { SegmentedChoice } from "@/components/form/SegmentedChoice";
import { TextAreaField } from "@/components/form/TextAreaField";
import { TextField } from "@/components/form/TextField";
import type { Dictionary } from "@/i18n/dictionaries";

import { FileDrop } from "./FileDrop";
import {
  MAX_DOCUMENT_CHARS,
  NEW_RESUME,
  type FieldErrors,
  type NewAnalysisDraft,
  type ResumeOption,
} from "./new-analysis-model";
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
  const errorText = (field: keyof FieldErrors) => (errors[field] ? labels.errors[errors[field]] : null);
  const isNew = draft.resumeChoice === NEW_RESUME;

  const newResumeFields = (
    <div className="reveal-in flex flex-col gap-4">
      <TextField
        id="resume-title"
        name="resumeTitle"
        label={copy.nameLabel}
        hint={copy.nameHint}
        value={draft.resumeTitle}
        onChange={(event) => onChange({ resumeTitle: event.target.value })}
        maxLength={150}
        autoComplete="off"
        error={errorText("resumeTitle")}
      />
      <SegmentedChoice
        name="resumeSource"
        legend={copy.sourceLegend}
        value={draft.resumeSource}
        onChange={(resumeSource) => onChange({ resumeSource })}
        options={[
          { value: "paste", label: copy.paste },
          { value: "upload", label: copy.upload },
        ]}
      />
      {draft.resumeSource === "paste" ? (
        <TextAreaField
          id="resume-text"
          name="resumeText"
          label={copy.textLabel}
          placeholder={copy.textPlaceholder}
          value={draft.resumeText}
          onChange={(event) => onChange({ resumeText: event.target.value })}
          locale={locale}
          maxChars={MAX_DOCUMENT_CHARS}
          countTemplate={labels.characterCount}
          overLimitTemplate={labels.overLimit}
          spellCheck={false}
          error={errorText("resumeText")}
        />
      ) : (
        <FileDrop
          id="resume-file"
          name="resumeFile"
          file={draft.resumeFile}
          onFileChange={onFileChange}
          labels={copy}
          locale={locale}
          error={errorText("resumeFile")}
        />
      )}
    </div>
  );

  return (
    <section aria-labelledby="resume-sheet-title" className="bg-paper px-5 py-6 shadow-sheet sm:px-8 sm:py-7">
      <h2 id="resume-sheet-title" className="text-[20px] leading-[1.25] font-semibold tracking-[-0.01em]">
        {resumes.length > 0 ? copy.title : copy.addFirst}
      </h2>

      {resumes.length === 0 ? (
        <div className="mt-5">
          <input type="hidden" name="resumeChoice" value={NEW_RESUME} />
          {newResumeFields}
        </div>
      ) : (
        <fieldset className="mt-1">
          <legend className="text-[14px] text-ink-soft">{copy.legend}</legend>
          <ul className="mt-4 border-t border-rule">
            {resumes.map((resume) => (
              <li key={resume.id} className="border-b border-rule">
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
              <label className="flex cursor-pointer items-center gap-3 rounded-[5px] px-2.5 py-3 transition-colors duration-150 hover:bg-desk/60">
                <input
                  type="radio"
                  name="resumeChoice"
                  value={NEW_RESUME}
                  checked={isNew}
                  onChange={() => onChange({ resumeChoice: NEW_RESUME })}
                  className="size-4 shrink-0 accent-ink"
                />
                <span className="font-medium text-ink">{copy.addNew}</span>
              </label>
              {isNew && <div className="px-2.5 pt-1 pb-2 sm:pl-[38px]">{newResumeFields}</div>}
            </li>
          </ul>
        </fieldset>
      )}
    </section>
  );
}
