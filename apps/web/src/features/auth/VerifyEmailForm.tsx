"use client";

// Code entry of the email verification screen: confirm the six digits, or ask for a new code. Each form keeps
// its own answer, so a "new code sent" note never hides a wrong-code message or the other way round.

import { useActionState, useEffect } from "react";

import { primaryButtonClass, secondaryButtonClass } from "@/components/button-styles";
import { TextField } from "@/components/form/TextField";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { interpolate } from "@/i18n/format";

import { confirmEmailCode, resendVerificationCode } from "./actions";
import { initialVerifyFormState, type VerifyFormState } from "./verification-model";

type VerifyLabels = Dictionary["auth"]["verify"];

interface VerifyEmailFormProps {
  locale: Locale;
  /** Where to continue once the address is verified; checked again on the server. */
  next: string | null;
  labels: VerifyLabels;
}

function errorMessage(state: VerifyFormState, labels: VerifyLabels): string | null {
  if (!state.error) return null;
  if (state.error === "tooSoon") {
    return interpolate(labels.errors.tooSoon, { seconds: state.waitSeconds ?? 60 });
  }
  return labels.errors[state.error];
}

export function VerifyEmailForm({ locale, next, labels }: VerifyEmailFormProps) {
  const [confirmState, confirmAction, confirming] = useActionState(confirmEmailCode, initialVerifyFormState);
  const [resendState, resendAction, resending] = useActionState(resendVerificationCode, initialVerifyFormState);
  const codeError = errorMessage(confirmState, labels);
  const resendNote = resendState.resent ? labels.resent : errorMessage(resendState, labels);

  useEffect(() => {
    if (confirmState.error) document.getElementById("code")?.focus();
  }, [confirmState]);

  return (
    <>
      <form action={confirmAction} className="mt-5 flex flex-col gap-4">
        <input type="hidden" name="locale" value={locale} />
        {next && <input type="hidden" name="next" value={next} />}
        <TextField
          id="code"
          name="code"
          label={labels.codeLabel}
          inputMode="numeric"
          autoComplete="one-time-code"
          spellCheck={false}
          required
          maxLength={12}
          error={codeError}
        />
        <button type="submit" disabled={confirming} className={primaryButtonClass}>
          {confirming ? labels.submitting : labels.submit}
        </button>
      </form>
      <form action={resendAction} className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
        <button type="submit" disabled={resending} className={secondaryButtonClass}>
          {resending ? labels.resending : labels.resend}
        </button>
        <p aria-live="polite" className="min-w-0 flex-1 basis-56 text-[14px] text-mute">
          {resendNote}
        </p>
      </form>
    </>
  );
}
