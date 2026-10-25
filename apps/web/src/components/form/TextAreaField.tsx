// Labelled multi-line field for whole documents, with a character count against the analysis limit.

import type { TextareaHTMLAttributes } from "react";

import { interpolate } from "@/i18n/format";

import { FieldError } from "./FieldError";
import { labelClass, textareaClass } from "./field-styles";

interface TextAreaFieldProps
  extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "id" | "className" | "value"> {
  id: string;
  label: string;
  value: string;
  locale: string;
  maxChars: number;
  countTemplate: string;
  /** Shown instead of a hard stop when the text is longer than the API analyzes. */
  overLimitTemplate: string;
  error?: string | null;
}

export function TextAreaField({
  id,
  label,
  value,
  locale,
  maxChars,
  countTemplate,
  overLimitTemplate,
  error,
  ...textareaProps
}: TextAreaFieldProps) {
  const numbers = new Intl.NumberFormat(locale);
  const isOverLimit = value.length > maxChars;
  const errorId = error ? `${id}-error` : undefined;
  const countId = `${id}-count`;

  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      <textarea
        id={id}
        value={value}
        className={`${textareaClass} mt-1.5`}
        aria-invalid={error ? true : undefined}
        aria-describedby={[errorId, countId].filter(Boolean).join(" ")}
        {...textareaProps}
      />
      <FieldError id={`${id}-error`} message={error} />
      <p id={countId} className="mt-1.5 flex flex-wrap justify-between gap-x-4 text-[13px] text-mute">
        <span className={isOverLimit ? "text-partial" : undefined}>
          {isOverLimit && interpolate(overLimitTemplate, { max: numbers.format(maxChars) })}
        </span>
        <span className={`edge-number ${isOverLimit ? "text-partial" : ""}`}>
          {interpolate(countTemplate, {
            count: numbers.format(value.length),
            max: numbers.format(maxChars),
          })}
        </span>
      </p>
    </div>
  );
}
