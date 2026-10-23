// Localized 404 screen for links to sections that do not exist (yet).

import Link from "next/link";

import { primaryButtonClass } from "@/components/button-styles";
import { getDictionary, getLocale } from "@/i18n/dictionaries";

export default async function NotFound() {
  const locale = await getLocale();
  const { notFound } = await getDictionary();

  return (
    <main id="main" className="mx-auto max-w-[1520px] px-4 py-20 sm:px-6">
      <h1 className="text-[28px] font-semibold tracking-[-0.02em]">{notFound.title}</h1>
      <p className="mt-2 max-w-[60ch] text-mute">{notFound.body}</p>
      <Link
        href={`/${locale}/analyses/sample`}
        className={`${primaryButtonClass} mt-6`}
      >
        {notFound.back}
      </Link>
    </main>
  );
}
