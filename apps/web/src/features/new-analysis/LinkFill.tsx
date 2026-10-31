"use client";

// Top of the posting sheet: reads a posting from a pasted link and fills the fields below, or says why it could
// not and points to pasting the text, which sits right under it.

import { useState, useTransition, type KeyboardEvent } from "react";

import { secondaryButtonClass } from "@/components/button-styles";
import { FieldError } from "@/components/form/FieldError";
import { hintClass, inputClass, labelClass } from "@/components/form/field-styles";
import { StatusMark } from "@/components/StatusMark";
import type { Dictionary } from "@/i18n/dictionaries";
import { interpolate } from "@/i18n/format";
import type { JobDescriptionDraft } from "@/lib/api/types";

import { fillFromLink } from "./actions";
import { siteName, type LinkErrorKey } from "./new-analysis-model";

interface LinkFillProps {
  locale: string;
  labels: Dictionary["newAnalysis"];
  onFilled: (posting: JobDescriptionDraft) => void;
}

type Outcome =
  | { kind: "filled"; site: string; hasTitle: boolean }
  | { kind: "failed"; error: LinkErrorKey | "missing"; site: string }
  | null;

export function LinkFill({ locale, labels, onFilled }: LinkFillProps) {
  const copy = labels.link;
  const [link, setLink] = useState("");
  const [outcome, setOutcome] = useState<Outcome>(null);
  const [isFilling, startFill] = useTransition();
  const error = outcome?.kind === "failed" ? interpolate(copy.errors[outcome.error], { site: outcome.site }) : null;

  function fill() {
    // Enter in the field still reaches here while the button is disabled.
    if (isFilling) return;
    if (!link.trim()) {
      setOutcome({ kind: "failed", error: "missing", site: "" });
      return;
    }
    const site = siteName(link) ?? link.trim();
    startFill(async () => {
      const result = await fillFromLink(locale, link);
      if (!result.ok) {
        setOutcome({ kind: "failed", error: result.error, site });
        return;
      }
      onFilled(result.posting);
      const source = siteName(result.posting.source_url) ?? site;
      setOutcome({ kind: "filled", site: source, hasTitle: Boolean(result.posting.title) });
      // A post has no job title: send the user straight to the field they still have to fill.
      if (!result.posting.title) document.getElementById("job-title")?.focus();
    });
  }

  // Enter in the link field fills the posting; it must not submit the whole form and start an analysis.
  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    fill();
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <label htmlFor="job-link" className={labelClass}>
          {copy.label}
          <span className="font-normal text-mute"> ({labels.posting.optional})</span>
        </label>
        <div className="mt-1.5 flex gap-2">
          <input
            id="job-link"
            type="url"
            inputMode="url"
            autoComplete="off"
            spellCheck={false}
            value={link}
            onChange={(event) => {
              setLink(event.target.value);
              if (outcome?.kind === "failed") setOutcome(null);
            }}
            onKeyDown={handleKeyDown}
            placeholder={copy.placeholder}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "job-link-error" : "job-link-hint"}
            className={`${inputClass} min-w-0`}
          />
          <button type="button" onClick={fill} disabled={isFilling} className={secondaryButtonClass}>
            {isFilling ? copy.filling : copy.fill}
          </button>
        </div>
        {/* A failed fill arrives after a server round trip, so it is announced like the success note below. */}
        <div aria-live="polite">
          <FieldError id="job-link-error" message={error} />
        </div>
        {!error && (
          <p id="job-link-hint" className={hintClass}>
            {copy.hint}
          </p>
        )}
      </div>

      <div className="flex items-center gap-3 text-[13px] text-mute">
        <span aria-hidden="true" className="h-px flex-1 bg-rule" />
        {copy.divider}
        <span aria-hidden="true" className="h-px flex-1 bg-rule" />
      </div>

      {/* Mounted while empty, so the result of a fill is announced to screen readers. */}
      <div role="status" className="empty:hidden">
        {outcome?.kind === "filled" && (
          <p className="flex gap-2 rounded-[10px] bg-accent-tint px-3 py-2.5 text-[14px] leading-[1.5] font-medium text-accent-hover">
            <span className="mt-[2px]">
              <StatusMark status="matched" size={16} />
            </span>
            <span>{interpolate(outcome.hasTitle ? copy.filled : copy.filledNoTitle, { site: outcome.site })}</span>
          </p>
        )}
      </div>
    </div>
  );
}
