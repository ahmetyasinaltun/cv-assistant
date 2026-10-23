// Declares the supported interface languages and the cookie that remembers the visitor's choice.

export const locales = ["en", "tr"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

export const LOCALE_COOKIE = "NEXT_LOCALE";

export function isLocale(value: string | undefined | null): value is Locale {
  return locales.includes(value as Locale);
}
