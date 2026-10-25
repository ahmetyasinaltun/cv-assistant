// Labelled single-line input with an optional hint and error, wired together for screen readers.

import type { InputHTMLAttributes } from "react";

import { FieldError } from "./FieldError";
import { hintClass, inputClass, labelClass } from "./field-styles";

interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "id" | "className"> {
  id: string;
  label: string;
  /** Shown after the label in Pencil Grey, e.g. "optional". */
  labelNote?: string;
  hint?: string;
  error?: string | null;
}

export function TextField({ id, label, labelNote, hint, error, ...inputProps }: TextFieldProps) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;

  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        {label}
        {labelNote && <span className="font-normal text-mute"> ({labelNote})</span>}
      </label>
      <input
        id={id}
        className={`${inputClass} mt-1.5`}
        aria-invalid={error ? true : undefined}
        aria-describedby={[errorId, hintId].filter(Boolean).join(" ") || undefined}
        {...inputProps}
      />
      <FieldError id={`${id}-error`} message={error} />
      {hint && (
        <p id={hintId} className={hintClass}>
          {hint}
        </p>
      )}
    </div>
  );
}
