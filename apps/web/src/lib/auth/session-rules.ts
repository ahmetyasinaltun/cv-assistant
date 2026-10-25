// Pure rules for the session: when a token expires, which paths need an account, which return paths are safe.

import type { Locale } from "@/i18n/config";

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

/** The analyses list, the new-analysis screen and real results need an account; the public sample does not. */
export function isPrivatePath(pathAfterLocale: string): boolean {
  return (
    pathAfterLocale === "/analyses" ||
    (pathAfterLocale.startsWith("/analyses/") && pathAfterLocale !== "/analyses/sample")
  );
}
