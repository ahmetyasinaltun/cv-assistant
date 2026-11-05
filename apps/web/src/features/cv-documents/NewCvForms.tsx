"use client";

// New CV: import a saved or newly added CV (the main path, one filled action) or open a blank CV in a chosen language
// (outlined). Each card runs its own Server Action; success redirects into the editor, so only failures come back here.

import { useState, useTransition, type FormEvent } from "react";

import { primaryButtonClass, secondaryButtonClass } from "@/components/button-styles";
import { FormAlert } from "@/components/form/FormAlert";
import { SegmentedChoice } from "@/components/form/SegmentedChoice";
import { TextField } from "@/components/form/TextField";
import {
  NEW_RESUME,
  filePatch,
  validateNewResume,
  type FieldErrors,
  type NewResumeDraft,
} from "@/features/new-analysis/new-analysis-model";
import { NewResumeFields, RESUME_FIELD_IDS, focusFirstInvalid } from "@/features/new-analysis/NewResumeFields";
import type { Dictionary } from "@/i18n/dictionaries";
import type { Language } from "@/lib/api/types";

import { createBlankCv, importCv, importNewCv, type CreateErrorKey } from "./actions";

export interface SavedResumeOption {
  id: string;
  title: string;
  /** "PDF · 3,412 characters · 12 Oct 2026", formatted on the server. */
  meta: string;
}

interface NewCvFormsProps {
  resumes: SavedResumeOption[];
  locale: string;
  defaultTitle: string;
  defaultLanguage: Language;
  labels: Dictionary["cvs"];
  resumeLabels: Dictionary["newAnalysis"];
}

export function NewCvForms({ resumes, locale, defaultTitle, defaultLanguage, labels, resumeLabels }: NewCvFormsProps) {
  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
      <ImportCard resumes={resumes} locale={locale} labels={labels} resumeLabels={resumeLabels} />
      <BlankCard locale={locale} defaultTitle={defaultTitle} defaultLanguage={defaultLanguage} labels={labels} />
    </div>
  );
}

const cardClass = "rounded-card border border-rule bg-paper px-5 py-6 shadow-sheet sm:px-7 sm:py-7";
const headingClass = "text-[21px] leading-[1.25] font-bold tracking-[-0.015em]";

/** Most people arrive with a file, so upload is the first thing they see. */
const EMPTY_NEW_RESUME: NewResumeDraft = { resumeSource: "upload", resumeTitle: "", resumeText: "", resumeFile: null };

function ImportCard({
  resumes,
  locale,
  labels,
  resumeLabels,
}: Pick<NewCvFormsProps, "resumes" | "locale" | "labels" | "resumeLabels">) {
  const copy = labels.new.fromSaved;
  const [choice, setChoice] = useState(resumes[0]?.id ?? NEW_RESUME);
  const [newResume, setNewResume] = useState(EMPTY_NEW_RESUME);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<CreateErrorKey | null>(null);
  const [isImporting, startImport] = useTransition();

  function updateNewResume(patch: Partial<NewResumeDraft>) {
    setNewResume((current) => ({ ...current, ...patch }));
    // An edited field is no longer the one in error.
    setFieldErrors((current) => {
      const next = { ...current };
      for (const key of Object.keys(patch)) delete next[key as keyof FieldErrors];
      return next;
    });
  }

  function importSavedCv() {
    startImport(async () => {
      const result = await importCv(locale, choice);
      // Success redirects to the editor, so a result here is always a failure.
      if (result) setError(result.error);
    });
  }

  function importAddedCv(form: HTMLFormElement) {
    const found = validateNewResume(newResume);
    setFieldErrors(found);
    if (Object.keys(found).length > 0) {
      focusFirstInvalid(RESUME_FIELD_IDS, found);
      return;
    }
    const formData = new FormData(form);
    startImport(async () => {
      const result = await importNewCv(locale, formData);
      setError(result.formError);
      setFieldErrors(result.fieldErrors);
      if (result.savedResumeId) setChoice(result.savedResumeId);
      focusFirstInvalid(RESUME_FIELD_IDS, result.fieldErrors);
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (choice === NEW_RESUME) importAddedCv(event.currentTarget);
    else importSavedCv();
  }

  const newResumeFields = (
    <NewResumeFields
      draft={newResume}
      onChange={updateNewResume}
      onFileChange={(file) => updateNewResume(filePatch(file, newResume.resumeTitle))}
      errors={fieldErrors}
      locale={locale}
      labels={resumeLabels}
    />
  );

  return (
    <section aria-labelledby="import-title" className={cardClass}>
      <h2 id="import-title" className={headingClass}>
        {copy.title}
      </h2>
      <p className="mt-1.5 max-w-[56ch] text-ink-soft">{copy.body}</p>

      <form onSubmit={handleSubmit} noValidate aria-busy={isImporting} className="mt-5">
        {resumes.length === 0 ? (
          <fieldset disabled={isImporting}>{newResumeFields}</fieldset>
        ) : (
          <fieldset disabled={isImporting}>
            <legend className="sr-only">{copy.legend}</legend>
            <div className="space-y-1">
              {resumes.map((resume) => (
                <label
                  key={resume.id}
                  className="flex cursor-pointer items-start gap-3 rounded-[10px] px-3 py-3 transition-colors duration-150 hover:bg-desk has-checked:bg-accent-tint has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-accent"
                >
                  <input
                    type="radio"
                    name="resume"
                    value={resume.id}
                    checked={choice === resume.id}
                    onChange={() => setChoice(resume.id)}
                    className="mt-1 size-[18px] shrink-0 accent-accent"
                  />
                  <span className="min-w-0">
                    <span className="block font-semibold break-words text-ink">{resume.title}</span>
                    <span className="block text-[14px] text-mute">{resume.meta}</span>
                  </span>
                </label>
              ))}
              <label className="flex cursor-pointer items-center gap-3 rounded-[10px] px-3 py-3 transition-colors duration-150 hover:bg-desk has-checked:bg-accent-tint has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-accent">
                <input
                  type="radio"
                  name="resume"
                  value={NEW_RESUME}
                  checked={choice === NEW_RESUME}
                  onChange={() => setChoice(NEW_RESUME)}
                  className="size-[18px] shrink-0 accent-accent"
                />
                <span className="font-semibold text-ink">{resumeLabels.resume.addNew}</span>
              </label>
              {choice === NEW_RESUME && <div className="px-3 pt-3 pb-2 sm:pl-[42px]">{newResumeFields}</div>}
            </div>
          </fieldset>
        )}
        <div className="has-[p]:mt-5">
          <FormAlert message={error ? labels.new.errors[error] : null} />
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2">
          <button type="submit" disabled={isImporting} className={primaryButtonClass}>
            {isImporting ? copy.pending : copy.action}
          </button>
          <span aria-live="polite" className="text-[14px] text-mute">
            {isImporting ? copy.pendingNote : copy.templateNote}
          </span>
        </div>
      </form>
    </section>
  );
}

function BlankCard({
  locale,
  defaultTitle,
  defaultLanguage,
  labels,
}: Pick<NewCvFormsProps, "locale" | "defaultTitle" | "defaultLanguage" | "labels">) {
  const copy = labels.new.blank;
  const [title, setTitle] = useState(defaultTitle);
  const [language, setLanguage] = useState<Language>(defaultLanguage);
  const [titleError, setTitleError] = useState<string | null>(null);
  const [error, setError] = useState<CreateErrorKey | null>(null);
  const [isCreating, startCreate] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim()) {
      setTitleError(copy.nameRequired);
      document.getElementById("blank-title")?.focus();
      return;
    }
    setError(null);
    startCreate(async () => {
      const result = await createBlankCv(locale, title, language);
      if (result) setError(result.error);
    });
  }

  return (
    <section aria-labelledby="blank-title-heading" className={cardClass}>
      <h2 id="blank-title-heading" className={headingClass}>
        {copy.title}
      </h2>
      <p className="mt-1.5 max-w-[48ch] text-ink-soft">{copy.body}</p>
      <form onSubmit={handleSubmit} noValidate className="mt-5 space-y-5">
        <TextField
          id="blank-title"
          label={copy.nameLabel}
          hint={copy.nameHint}
          value={title}
          maxLength={150}
          error={titleError}
          onChange={(event) => {
            setTitle(event.target.value);
            setTitleError(null);
          }}
        />
        <div>
          <SegmentedChoice
            name="blank-language"
            legend={copy.languageLegend}
            value={language}
            options={[
              { value: "tr", label: labels.languageNames.tr },
              { value: "en", label: labels.languageNames.en },
            ]}
            onChange={setLanguage}
          />
          <p className="mt-1.5 text-[14px] text-mute">{copy.languageHint}</p>
        </div>
        <FormAlert message={error ? labels.new.errors[error === "network" ? "network" : "generic"] : null} />
        <button type="submit" disabled={isCreating} className={secondaryButtonClass}>
          {isCreating ? copy.pending : copy.action}
        </button>
      </form>
    </section>
  );
}
