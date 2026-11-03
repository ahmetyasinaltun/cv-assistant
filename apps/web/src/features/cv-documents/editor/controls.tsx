"use client";

// Small controls of the CV editor: an icon button, a month-and-year date field, the list of bullet lines with their
// origin marks, and the shared label-plus-error wrapper for fields that are not plain text inputs.

import type { ReactNode } from "react";

import { FieldError } from "@/components/form/FieldError";
import { inputClass, labelClass, textActionClass } from "@/components/form/field-styles";
import type { Dictionary } from "@/i18n/dictionaries";
import { interpolate } from "@/i18n/format";
import type { CvDate, CvLine } from "@/lib/api/types";

import { editLine, isMarkedOrigin, joinDate, splitDate, userLine } from "../cv-model";

import { CloseIcon, PlusIcon } from "./icons";

export type EditorLabels = Dictionary["cvs"]["editor"];

interface IconButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  pressed?: boolean;
  expanded?: boolean;
  controls?: string;
  children: ReactNode;
}

/** A 36px tool with a 44px hit area; the label is its accessible name and its tooltip. */
export function IconButton({ label, onClick, disabled, pressed, expanded, controls, children }: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      aria-expanded={expanded}
      aria-controls={controls}
      disabled={disabled}
      onClick={onClick}
      className="relative inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-ink-soft transition-colors duration-150 after:absolute after:-inset-1 hover:bg-desk hover:text-ink active:bg-desk-deep disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-transparent"
    >
      {children}
    </button>
  );
}

// --- Dates --------------------------------------------------------------------------------------------

/** The shared field look without its full width, so month and year share one row. */
const dateControlClass = inputClass.replace("w-full ", "");

const MONTHS = Array.from({ length: 12 }, (_, index) => String(index + 1).padStart(2, "0"));

function monthNames(locale: string): string[] {
  const format = new Intl.DateTimeFormat(locale, { month: "long", timeZone: "UTC" });
  return MONTHS.map((month) => format.format(new Date(Date.UTC(2020, Number(month) - 1, 1))));
}

interface DateFieldProps {
  /** Field id of the year input, which a failed save focuses. */
  id: string;
  label: string;
  value: CvDate;
  onChange: (value: CvDate) => void;
  allowOngoing?: boolean;
  error?: string | null;
  locale: string;
  labels: EditorLabels;
}

/** A month (optional) and a four-digit year, plus "ongoing" for end dates; stored as "2025-06", "2025" or "present". */
export function DateField({ id, label, value, onChange, allowOngoing, error, locale, labels }: DateFieldProps) {
  const parts = splitDate(value);
  const errorId = error ? `${id}-error` : undefined;

  return (
    <fieldset>
      <legend className={labelClass}>{label}</legend>
      <div className="mt-1.5 flex items-center gap-2">
        <select
          aria-label={`${label}: ${labels.fields.month}`}
          value={parts.month}
          disabled={parts.ongoing}
          onChange={(event) => onChange(joinDate({ ...parts, month: event.target.value }))}
          className={`${dateControlClass} min-w-0 flex-1 pr-2 disabled:opacity-50`}
        >
          <option value="">{labels.fields.noMonth}</option>
          {monthNames(locale).map((name, index) => (
            <option key={MONTHS[index]} value={MONTHS[index]}>
              {name}
            </option>
          ))}
        </select>
        <input
          id={id}
          aria-label={`${label}: ${labels.fields.year}`}
          inputMode="numeric"
          maxLength={4}
          placeholder={labels.fields.year}
          value={parts.year}
          disabled={parts.ongoing}
          aria-invalid={error ? true : undefined}
          aria-describedby={errorId}
          onChange={(event) => onChange(joinDate({ ...parts, year: event.target.value.replace(/\D/g, "") }))}
          className={`${dateControlClass} w-[5.25rem] shrink-0 tabular-nums disabled:opacity-50`}
        />
      </div>
      {allowOngoing && (
        <label className="mt-1 flex h-10 w-fit cursor-pointer items-center gap-2 text-[15px] text-ink">
            <input
              type="checkbox"
              checked={parts.ongoing}
              onChange={(event) =>
                onChange(event.target.checked ? "present" : joinDate({ year: "", month: "", ongoing: false }))
              }
              className="size-[18px] accent-accent"
            />
            {labels.fields.ongoing}
        </label>
      )}
      <FieldError id={`${id}-error`} message={error} />
    </fieldset>
  );
}

// --- Lines --------------------------------------------------------------------------------------------

interface OriginMarkProps {
  origin: CvLine["origin"];
  labels: EditorLabels;
  /** The chip alone, where the surrounding text already says what to do. */
  compact?: boolean;
}

export function OriginMark({ origin, labels, compact = false }: OriginMarkProps) {
  if (!isMarkedOrigin(origin)) return null;
  const added = origin === "ai_added" || origin === "ai_embellished";
  return (
    <div className="mb-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1">
      <span
        className={`rounded-[6px] px-2 py-0.5 text-[12.5px] font-semibold whitespace-nowrap ${
          added ? "bg-accent-tint text-accent-hover" : "bg-desk-deep text-ink-soft"
        }`}
      >
        {labels.origins[origin]}
      </span>
      {!compact && <span className="text-[13px] text-mute">{labels.originNotes[origin]}</span>}
    </div>
  );
}

interface LineListProps {
  idPrefix: string;
  label: string;
  hint?: string;
  lines: CvLine[];
  max: number;
  onChange: (lines: CvLine[]) => void;
  labels: EditorLabels;
}

/** Bullet lines as growing text areas; each AI-marked line shows its mark above it. */
export function LineList({ idPrefix, label, hint, lines, max, onChange, labels }: LineListProps) {
  const hintId = hint ? `${idPrefix}-hint` : undefined;

  function add() {
    onChange([...lines, userLine()]);
    // The new line takes focus so typing can start at once.
    requestAnimationFrame(() => document.getElementById(`${idPrefix}-${lines.length}`)?.focus());
  }

  return (
    <fieldset>
      <legend className={labelClass}>{label}</legend>
      {hint && (
        <p id={hintId} className="mt-0.5 text-[14px] text-mute">
          {hint}
        </p>
      )}
      <ul className="mt-1.5 space-y-2">
        {lines.map((line, index) => {
          const lineLabel = interpolate(labels.fields.bulletLabel, { number: index + 1 });
          return (
            <li key={index}>
              <OriginMark origin={line.origin} labels={labels} />
              <div className="flex items-start gap-1">
                <textarea
                  id={`${idPrefix}-${index}`}
                  aria-label={lineLabel}
                  aria-describedby={hintId}
                  rows={2}
                  maxLength={600}
                  value={line.text}
                  onChange={(event) =>
                    onChange(lines.map((item, at) => (at === index ? editLine(item, event.target.value) : item)))
                  }
                  className="block min-h-[4.25rem] w-full resize-none rounded-[10px] border border-field-edge bg-paper px-3.5 py-2.5 text-[15.5px] leading-[1.5] text-ink transition-[border-color] duration-150 [field-sizing:content] hover:border-ink-soft"
                />
                <IconButton
                  label={`${labels.tools.remove}: ${lineLabel}`}
                  onClick={() => onChange(lines.filter((_, at) => at !== index))}
                >
                  <CloseIcon size={16} />
                </IconButton>
              </div>
            </li>
          );
        })}
      </ul>
      {lines.length < max && (
        <button type="button" onClick={add} className={`${textActionClass} mt-3 inline-flex items-center gap-1`}>
          <PlusIcon size={15} />
          {labels.fields.addBullet}
        </button>
      )}
    </fieldset>
  );
}
