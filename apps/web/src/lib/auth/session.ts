// Stores the API access token in an httpOnly cookie, so page scripts can never read it, and the language
// cookie when sign-in restores the account's language. Cookies can only be written from Server Actions.

import { cookies } from "next/headers";

import { LOCALE_COOKIE, LOCALE_COOKIE_MAX_AGE_SECONDS, type Locale } from "@/i18n/config";

import { SESSION_COOKIE, tokenExpiry } from "./session-rules";

export async function getSessionToken(): Promise<string | null> {
  return (await cookies()).get(SESSION_COOKIE)?.value ?? null;
}

export async function saveSession(token: string): Promise<void> {
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    // The cookie disappears when the token does, so the browser does not keep sending a dead session.
    expires: tokenExpiry(token) ?? undefined,
  });
}

export async function clearSession(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}

/** Same cookie the language switch writes in the browser; not httpOnly, because that switch sets it too. */
export async function saveLocaleChoice(locale: Locale): Promise<void> {
  (await cookies()).set(LOCALE_COOKIE, locale, {
    sameSite: "lax",
    path: "/",
    maxAge: LOCALE_COOKIE_MAX_AGE_SECONDS,
  });
}
