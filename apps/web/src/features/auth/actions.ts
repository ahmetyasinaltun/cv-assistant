"use server";

// Server Actions for signing in, registering, verifying the email address and signing out; they are the only code
// that writes the session cookie.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { defaultLocale, isLocale, type Locale } from "@/i18n/config";
import { confirmEmail, login, register, sendVerificationCode } from "@/lib/api/backend";
import type { TokenResponse } from "@/lib/api/types";
import { clearSession, saveLocaleChoice, saveSession } from "@/lib/auth/session";
import { safeReturnPath, signInDestination } from "@/lib/auth/session-rules";

import { authErrorKey, type AuthFormState } from "./auth-errors";
import {
  initialVerifyFormState,
  isCompleteCode,
  normalizeCode,
  verifyErrorState,
  type VerifyFormState,
} from "./verification-model";

function readLocale(formData: FormData): Locale {
  const value = formData.get("locale");
  return typeof value === "string" && isLocale(value) ? value : defaultLocale;
}

function readText(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

export async function signIn(_previous: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const locale = readLocale(formData);
  const email = readText(formData, "email");
  const password = formData.get("password");

  let session: TokenResponse;
  try {
    session = await login(email, typeof password === "string" ? password : "");
  } catch (error) {
    return { error: authErrorKey(error), email, fullName: "" };
  }
  await saveSession(session.access_token);
  // The account remembers the last language the user chose, so signing in restores it on any device.
  const preferred = session.user.preferred_language;
  const accountLocale = isLocale(preferred) ? preferred : locale;
  await saveLocaleChoice(accountLocale);
  redirect(signInDestination(formData.get("next"), locale, accountLocale));
}

export async function registerAccount(
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const locale = readLocale(formData);
  const fullName = readText(formData, "fullName");
  const email = readText(formData, "email");
  const password = formData.get("password");

  let token: string;
  try {
    // The account starts in the language the visitor registered in.
    token = (await register(fullName, email, typeof password === "string" ? password : "", locale))
      .access_token;
  } catch (error) {
    return { error: authErrorKey(error, "register"), email, fullName };
  }
  await saveSession(token);
  // The first code is already on its way; the verification screen continues to `next` afterwards.
  const destination = signInDestination(formData.get("next"), locale, locale);
  redirect(`/${locale}/verify-email?next=${encodeURIComponent(destination)}`);
}

export async function confirmEmailCode(
  _previous: VerifyFormState,
  formData: FormData,
): Promise<VerifyFormState> {
  const locale = readLocale(formData);
  const code = normalizeCode(readText(formData, "code"));
  if (!isCompleteCode(code)) return { ...initialVerifyFormState, error: "codeFormat" };
  try {
    await confirmEmail(code);
  } catch (error) {
    return verifyErrorState(error);
  }
  // The reminder lives in the shared layout, which a redirect alone would keep as it was.
  revalidatePath(`/${locale}`, "layout");
  redirect(safeReturnPath(formData.get("next"), locale) ?? `/${locale}/analyses`);
}

export async function resendVerificationCode(): Promise<VerifyFormState> {
  try {
    await sendVerificationCode();
  } catch (error) {
    return verifyErrorState(error);
  }
  return { ...initialVerifyFormState, resent: true };
}

export async function signOut(formData: FormData): Promise<void> {
  await clearSession();
  redirect(`/${readLocale(formData)}/sign-in`);
}
