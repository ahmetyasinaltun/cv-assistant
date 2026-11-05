"use client";

// Fields that add a CV: its name, then pasted text or a PDF or Word file. The new-analysis and New CV screens share them.

import { SegmentedChoice } from "@/components/form/SegmentedChoice";
import { TextAreaField } from "@/components/form/TextAreaField";
import { TextField } from "@/components/form/TextField";
import type { Dictionary } from "@/i18n/dictionaries";

import { FileDrop } from "./FileDrop";
import { MAX_DOCUMENT_CHARS, type FieldErrors, type NewResumeDraft } from "./new-analysis-model";

/** The fields below in screen order, so a failed submit can focus the first invalid one. */
export const RESUME_FIELD_IDS: [keyof FieldErrors, string][] = [
  ["resumeTitle", "resume-title"],
  ["resumeText", "resume-text"],
  ["resumeFile", "resume-file"],
];

export function focusFirstInvalid(fieldIds: [keyof FieldErrors, string][], errors: FieldErrors) {
  const first = fieldIds.find(([field]) => errors[field]);
  if (first) document.getElementById(first[1])?.focus();
}

interface NewResumeFieldsProps {
  draft: NewResumeDraft;
  onChange: (patch: Partial<NewResumeDraft>) => void;
  onFileChange: (file: File | null) => void;
  errors: FieldErrors;
  locale: string;
  labels: Dictionary["newAnalysis"];
}

export function NewResumeFields({ draft, onChange, onFileChange, errors, locale, labels }: NewResumeFieldsProps) {
  const copy = labels.resume;
  const errorText = (field: keyof FieldErrors) => (errors[field] ? labels.errors[errors[field]] : null);

  return (
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
}
