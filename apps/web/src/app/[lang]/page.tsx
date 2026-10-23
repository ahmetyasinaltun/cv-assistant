// Localized home: until the analyses list exists, it opens the sample analysis.

import { redirect } from "next/navigation";

import { getLocale } from "@/i18n/dictionaries";

export default async function LocalizedHome() {
  redirect(`/${await getLocale()}/analyses/sample`);
}
