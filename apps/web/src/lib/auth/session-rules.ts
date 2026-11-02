// Pure rules for the session: when a token expires, which paths need an account, which return paths are safe.

import { pathForLocale, type Locale } from "@/i18n/config";

/** httpOnly cookie that holds the API access token. Defined here so the proxy can check it too. */
export const SESSION_COOKIE = "career_session";

/** Reads the `exp` claim of a JWT without verifying it; the API verifies the signature on every call. */
export function tokenExpiry(token: string): Date | null {
  const payload = token.split(".")[1];
  if (!payload) return null;
  try {
    const json = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { exp?: unknown };
    return typeof json.exp === "number" ? new Date(json.exp * 1000) : null;
  } catch {
    return null;
  }
}

/**
 * Accepts only a path inside this app and this locale, so `?next=` cannot send a signed-in user
 * to another site ("//evil.example" and "https://..." are rejected) or out of their language.
 */
export function safeReturnPath(value: unknown, locale: Locale): string | null {
  if (typeof value !== "string") return null;
  if (!value.startsWith(`/${locale}/`) || value.startsWith("//") || value.includes("\\")) return null;
  return value;
}

/**
 * Where sign-in or registration lands: the checked `?next=` path (or the analyses list), opened in the
 * account's language. The check uses the form's language, because that is the language `next` was made in.
 */
export function signInDestination(next: unknown, formLocale: Locale, accountLocale: Locale): string {
  const path = safeReturnPath(next, formLocale) ?? `/${formLocale}/analyses`;
  return pathForLocale(path, accountLocale);
}

/** Analyses (except the public sample) and the CVs a user writes need an account. */
export function isPrivatePath(pathAfterLocale: string): boolean {
  return (
    pathAfterLocale === "/analyses" ||
    (pathAfterLocale.startsWith("/analyses/") && pathAfterLocale !== "/analyses/sample") ||
    pathAfterLocale === "/cvs" ||
    pathAfterLocale.startsWith("/cvs/")
  );
}
