// Picks the interface language for a request from the saved cookie or the browser's Accept-Language header.

import { defaultLocale, isLocale, type Locale } from "./config";

interface WeightedLanguage {
  language: string;
  quality: number;
}

function parseAcceptLanguage(header: string): WeightedLanguage[] {
  return header
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      const qualityParam = params.find((param) => param.trim().startsWith("q="));
      const quality = qualityParam ? Number(qualityParam.trim().slice(2)) : 1;
      return {
        language: tag.trim().toLowerCase().split("-")[0],
        quality: Number.isFinite(quality) ? quality : 0,
      };
    })
    .filter((entry) => entry.language && entry.quality > 0)
    .sort((a, b) => b.quality - a.quality);
}

/** A saved choice wins; otherwise the highest-weighted supported browser language; otherwise the default. */
export function negotiateLocale(
  acceptLanguage: string | null | undefined,
  savedLocale?: string | null,
): Locale {
  if (isLocale(savedLocale)) return savedLocale;

  const preferred = parseAcceptLanguage(acceptLanguage ?? "").find((entry) =>
    isLocale(entry.language),
  );
  return preferred && isLocale(preferred.language) ? preferred.language : defaultLocale;
}
