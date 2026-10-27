// Declares the supported interface languages and the cookie that remembers the visitor's choice.

export const locales = ["en", "tr"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

export const LOCALE_COOKIE = "NEXT_LOCALE";
export const LOCALE_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

export function isLocale(value: string | undefined | null): value is Locale {
  return locales.includes(value as Locale);
}

/** The same page in another language: swaps the first path segment and keeps the rest, query included. */
export function pathForLocale(path: string, target: Locale): string {
  const [, , ...rest] = path.split("/");
  return `/${[target, ...rest].join("/")}`;
}
