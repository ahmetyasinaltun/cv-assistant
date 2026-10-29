"use client";

// One saved CV in the picker: a radio row with its source and size, and an inline delete confirmation
// that states how many analyses go with it (the database deletes them together).

import { useEffect, useRef, useState, useTransition } from "react";

import { dangerButtonClass } from "@/components/button-styles";
import { FormAlert } from "@/components/form/FormAlert";
import { textActionClass } from "@/components/form/field-styles";
import type { Dictionary } from "@/i18n/dictionaries";
import { interpolate, pluralize } from "@/i18n/format";

import { deleteSavedResume } from "./actions";
import type { ResumeOption } from "./new-analysis-model";

interface SavedResumeRowProps {
  resume: ResumeOption;
  checked: boolean;
  onSelect: () => void;
  analysisCount: number;
  locale: string;
  labels: Dictionary["newAnalysis"]["resume"];
}

export function SavedResumeRow({ resume, checked, onSelect, analysisCount, locale, labels }: SavedResumeRowProps) {
  const [isConfirming, setIsConfirming] = useState(false);
  const [failed, setFailed] = useState(false);
  const [isDeleting, startDeleting] = useTransition();
  const confirmRef = useRef<HTMLButtonElement>(null);
  const deleteRef = useRef<HTMLButtonElement>(null);
  const returnFocus = useRef(false);
  const radioId = `resume-${resume.id}`;

  useEffect(() => {
    if (isConfirming) confirmRef.current?.focus();
    else if (returnFocus.current) deleteRef.current?.focus();
  }, [isConfirming]);

  const meta = [
    resume.source_type === "pdf" ? labels.pdf : labels.text,
    pluralize(locale, resume.character_count, labels.characters),
    resume.createdAtLabel,
  ].join(" · ");

  function confirmDelete() {
    setFailed(false);
    startDeleting(async () => {
      const { ok } = await deleteSavedResume(locale, resume.id);
      if (!ok) setFailed(true);
    });
  }

  if (isConfirming) {
    return (
      <div className="flex flex-col gap-3 rounded-[10px] bg-marker-tint px-3.5 py-3.5">
        <div>
          <p className="text-[15px] font-semibold text-ink">{interpolate(labels.deleteConfirm, { title: resume.title })}</p>
          <p className="mt-0.5 text-[14px] text-ink-soft">
            {analysisCount > 0 ? pluralize(locale, analysisCount, labels.deleteConsequence) : labels.deleteNoAnalyses}
          </p>
        </div>
        <FormAlert message={failed ? labels.deleteFailed : null} />
        <div className="flex items-center gap-4">
          <button ref={confirmRef} type="button" onClick={confirmDelete} disabled={isDeleting} className={dangerButtonClass}>
            {isDeleting ? labels.deleting : labels.deleteButton}
          </button>
          <button
            type="button"
            disabled={isDeleting}
            onClick={() => {
              returnFocus.current = true;
              setIsConfirming(false);
            }}
            className={textActionClass}
          >
            {labels.cancel}
          </button>
        </div>
      </div>
    );
  }

  return (
    // The label owns the padding, so the whole row (minus the delete action) selects the CV.
    <div className="flex items-start rounded-[10px] transition-colors duration-150 hover:bg-desk has-checked:bg-accent-tint">
      <label htmlFor={radioId} className="flex min-w-0 flex-1 cursor-pointer gap-3 py-3 pl-3">
        <input
          id={radioId}
          type="radio"
          name="resumeChoice"
          value={resume.id}
          checked={checked}
          onChange={onSelect}
          className="mt-[4px] size-4 shrink-0 accent-accent"
        />
        <span className="min-w-0">
          <span className="block truncate font-semibold text-ink">{resume.title}</span>
          <span className="block text-[14px] text-mute">{meta}</span>
        </span>
      </label>
      <button
        ref={deleteRef}
        type="button"
        onClick={() => setIsConfirming(true)}
        aria-label={`${labels.delete}: ${resume.title}`}
        className={`${textActionClass} mt-3.5 mr-3 shrink-0`}
      >
        {labels.delete}
      </button>
    </div>
  );
}
