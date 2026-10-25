"use client";

// Sign-in and registration form: native validation first, then the Server Action's answer shown in place.

import { useActionState, useEffect } from "react";

import { primaryButtonClass } from "@/components/button-styles";
import { FormAlert } from "@/components/form/FormAlert";
import { TextField } from "@/components/form/TextField";
import type { Dictionary } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";

import { registerAccount, signIn } from "./actions";
import { initialAuthFormState } from "./auth-errors";

const MIN_PASSWORD_LENGTH = 8;

interface AuthFormProps {
  mode: "signIn" | "register";
  locale: Locale;
  /** Where to continue after signing in; validated again on the server. */
  next: string | null;
  labels: Dictionary["auth"];
}

export function AuthForm({ mode, locale, next, labels }: AuthFormProps) {
  const [state, formAction, pending] = useActionState(
    mode === "signIn" ? signIn : registerAccount,
    initialAuthFormState,
  );
  const copy = labels[mode];
  const isRegister = mode === "register";
  // A taken email is a problem with that field, so it is shown and focused there; the rest are form-level.
  const emailError = state.error === "emailTaken" ? labels.errors.emailTaken : null;
  const formError = state.error && !emailError ? labels.errors[state.error] : null;

  useEffect(() => {
    if (state.error === "emailTaken") document.getElementById("email")?.focus();
  }, [state]);

  return (
    <form action={formAction} className="mt-6 flex flex-col gap-4">
      <input type="hidden" name="locale" value={locale} />
      {next && <input type="hidden" name="next" value={next} />}

      {isRegister && (
        <TextField
          id="full-name"
          name="fullName"
          label={labels.fullName}
          autoComplete="name"
          required
          maxLength={120}
          defaultValue={state.fullName}
        />
      )}
      <TextField
        id="email"
        name="email"
        type="email"
        label={labels.email}
        autoComplete="email"
        autoCapitalize="none"
        spellCheck={false}
        required
        defaultValue={state.email}
        error={emailError}
      />
      <TextField
        id="password"
        name="password"
        type="password"
        label={labels.password}
        autoComplete={isRegister ? "new-password" : "current-password"}
        required
        minLength={isRegister ? MIN_PASSWORD_LENGTH : undefined}
        hint={isRegister ? labels.register.passwordHint : undefined}
      />

      <FormAlert message={formError} />

      <button type="submit" disabled={pending} className={`${primaryButtonClass} mt-1 w-full`}>
        {pending ? copy.submitting : copy.submit}
      </button>
    </form>
  );
}
