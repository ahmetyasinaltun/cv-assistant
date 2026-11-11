// Pure rules of the email verification screen: which message an API refusal gets, and when a code looks complete.

import { ApiError, NETWORK_ERROR_STATUS } from "@/lib/api/client";

export type VerifyErrorKey =
  | "codeFormat"
  | "codeInvalid"
  | "codeExpired"
  | "tooManyAttempts"
  | "tooSoon"
  | "emailUnavailable"
  | "unavailable"
  | "generic";

export interface VerifyFormState {
  error: VerifyErrorKey | null;
  /** Set after a new code went out, so the screen can say so. */
  resent: boolean;
  /** For "tooSoon": seconds until a new code can be asked for. */
  waitSeconds: number | null;
}

export const initialVerifyFormState: VerifyFormState = { error: null, resent: false, waitSeconds: null };

/** Digits only, whatever the email client copied around them ("123 456", "Code: 123456"). */
export function normalizeCode(value: string): string {
  return value.replace(/\D/g, "");
}

export function isCompleteCode(value: string): boolean {
  return /^\d{6}$/.test(value);
}

export function verifyErrorState(error: unknown): VerifyFormState {
  const state: VerifyFormState = { ...initialVerifyFormState, error: "generic" };
  if (!(error instanceof ApiError)) return state;
  if (error.code === "code_invalid") return { ...state, error: "codeInvalid" };
  if (error.code === "code_expired") return { ...state, error: "codeExpired" };
  if (error.code === "too_many_attempts") return { ...state, error: "tooManyAttempts" };
  if (error.code === "email_unavailable") return { ...state, error: "emailUnavailable" };
  if (error.status === 429) return { ...state, error: "tooSoon", waitSeconds: error.retryAfterSeconds ?? 60 };
  if (error.status === 422) return { ...state, error: "codeFormat" };
  if (error.status === NETWORK_ERROR_STATUS || error.status >= 500) return { ...state, error: "unavailable" };
  return state;
}
