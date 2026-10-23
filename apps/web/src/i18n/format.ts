// Small, dependency-free helpers for filling message templates and choosing plural forms with Intl.PluralRules.

export type PluralForms = Partial<Record<Intl.LDMLPluralRule, string>> & { other: string };

/** Replaces `{name}` placeholders with the given values; unknown placeholders are left visible on purpose. */
export function interpolate(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
}

/** Picks the plural form for `count` in `locale` and fills in `{count}`. */
export function pluralize(locale: string, count: number, forms: PluralForms): string {
  const rule = new Intl.PluralRules(locale).select(count);
  const template = forms[rule] ?? forms.other;
  return interpolate(template, { count });
}
