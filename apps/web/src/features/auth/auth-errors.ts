// Maps API failures during sign-in and registration to the message keys the auth forms can show.

import { ApiError, NETWORK_ERROR_STATUS } from "@/lib/api/client";

export type AuthErrorKey =
  | "invalidCredentials"
  | "emailTaken"
  | "passwordTooLong"
  | "tooManyAttempts"
  | "invalidInput"
  | "unavailable"
  | "generic";

export interface AuthFormState {
  error: AuthErrorKey | null;
  /** Entered values come back so a failed attempt does not empty the form (passwords never do). */
  email: string;
  fullName: string;
}

export const initialAuthFormState: AuthFormState = { error: null, email: "", fullName: "" };

export function authErrorKey(error: unknown): AuthErrorKey {
  if (!(error instanceof ApiError)) return "generic";
  if (error.code === "invalid_credentials") return "invalidCredentials";
  if (error.code === "email_taken") return "emailTaken";
  if (error.code === "password_too_long") return "passwordTooLong";
  if (error.code === "rate_limited") return "tooManyAttempts";
  if (error.status === 422) return "invalidInput";
  if (error.status === NETWORK_ERROR_STATUS || error.status >= 500) return "unavailable";
  return "generic";
}
