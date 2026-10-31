"use client";

// The job posting sheet: an optional link that fills the fields, then title, optional company and the full text.

import { TextAreaField } from "@/components/form/TextAreaField";
import { TextField } from "@/components/form/TextField";
import type { Dictionary } from "@/i18n/dictionaries";

import { LinkFill } from "./LinkFill";
import { MAX_DOCUMENT_CHARS, linkPatch, type FieldErrors, type NewAnalysisDraft } from "./new-analysis-model";

interface PostingSheetProps {
  draft: NewAnalysisDraft;
  onChange: (patch: Partial<NewAnalysisDraft>) => void;
  errors: FieldErrors;
  locale: string;
  labels: Dictionary["newAnalysis"];
}

export function PostingSheet({ draft, onChange, errors, locale, labels }: PostingSheetProps) {
  const copy = labels.posting;
  const errorText = (field: keyof FieldErrors) => (errors[field] ? labels.errors[errors[field]] : null);

  return (
    <section aria-labelledby="posting-sheet-title" className="rounded-card border border-rule bg-paper px-5 py-6 shadow-sheet sm:px-7 sm:py-7">
      <h2 id="posting-sheet-title" className="text-[21px] leading-[1.25] font-bold tracking-[-0.015em]">
        {copy.title}
      </h2>
      <div className="mt-5 flex flex-col gap-4">
        <LinkFill locale={locale} labels={labels} onFilled={(posting) => onChange(linkPatch(posting))} />
        <div className="grid gap-4 sm:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <TextField
            id="job-title"
            name="jobTitle"
            label={copy.titleLabel}
            value={draft.jobTitle}
            onChange={(event) => onChange({ jobTitle: event.target.value })}
            maxLength={150}
            autoComplete="off"
            error={errorText("jobTitle")}
          />
          <TextField
            id="company"
            name="company"
            label={copy.companyLabel}
            labelNote={copy.optional}
            value={draft.company}
            onChange={(event) => onChange({ company: event.target.value })}
            maxLength={150}
            autoComplete="organization"
          />
        </div>
        <TextAreaField
          id="job-text"
          name="jobText"
          label={copy.textLabel}
          placeholder={copy.textPlaceholder}
          value={draft.jobText}
          onChange={(event) => onChange({ jobText: event.target.value })}
          locale={locale}
          maxChars={MAX_DOCUMENT_CHARS}
          countTemplate={labels.characterCount}
          overLimitTemplate={labels.overLimit}
          // Shorter than the CV text box: the link row sits above it and the two columns should end together.
          rows={8}
          error={errorText("jobText")}
        />
      </div>
    </section>
  );
}
