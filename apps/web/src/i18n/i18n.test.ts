// Unit tests for locale negotiation and the message helpers, including Turkish/English dictionary parity.

import { describe, expect, it } from "vitest";

import en from "./dictionaries/en.json";
import tr from "./dictionaries/tr.json";
import { interpolate, pluralize } from "./format";
import { negotiateLocale } from "./negotiate";

describe("negotiateLocale", () => {
  it("prefers a valid saved choice over the browser language", () => {
    expect(negotiateLocale("en-US,en;q=0.9", "tr")).toBe("tr");
  });

  it("ignores an unsupported saved value", () => {
    expect(negotiateLocale("tr-TR,tr;q=0.9", "de")).toBe("tr");
  });

  it("uses the highest-weighted supported browser language", () => {
    expect(negotiateLocale("de-DE,de;q=0.9,tr;q=0.8,en;q=0.7")).toBe("tr");
    expect(negotiateLocale("en;q=0.4,tr;q=0.6")).toBe("tr");
  });

  it("falls back to English for missing, empty or unsupported headers", () => {
    expect(negotiateLocale(null)).toBe("en");
    expect(negotiateLocale("")).toBe("en");
    expect(negotiateLocale("fr-FR,de;q=0.5")).toBe("en");
  });
});

describe("interpolate", () => {
  it("fills known placeholders and leaves unknown ones visible", () => {
    expect(interpolate("{score} / 100 for {name}", { score: 79 })).toBe("79 / 100 for {name}");
  });
});

describe("pluralize", () => {
  it("chooses English singular and plural forms", () => {
    expect(pluralize("en", 1, en.result.sheetLines)).toBe("1 line read from this CV");
    expect(pluralize("en", 9, en.result.sheetLines)).toBe("9 lines read from this CV");
  });

  it("keeps the Turkish noun singular after a number", () => {
    expect(pluralize("tr", 1, tr.result.sheetLines)).toBe("Bu CV’den okunan 1 satır");
    expect(pluralize("tr", 9, tr.result.sheetLines)).toBe("Bu CV’den okunan 9 satır");
  });
});

function keyPaths(value: unknown, prefix = ""): string[] {
  if (typeof value !== "object" || value === null) return [prefix];
  return Object.entries(value).flatMap(([key, child]) => keyPaths(child, prefix ? `${prefix}.${key}` : key));
}

describe("dictionaries", () => {
  it("define exactly the same keys in Turkish and English", () => {
    expect(keyPaths(tr).sort()).toEqual(keyPaths(en).sort());
  });
});
