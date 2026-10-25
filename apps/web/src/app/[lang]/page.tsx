// Localized home fallback: the proxy already sends visitors to their analyses or the sample, so this rarely renders.

import { redirect } from "next/navigation";

import { getLocale } from "@/i18n/dictionaries";

export default async function LocalizedHome() {
  redirect(`/${await getLocale()}/analyses/sample`);
}
