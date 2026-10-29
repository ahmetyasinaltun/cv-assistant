// Localized 404 screen for links to sections that do not exist (yet).

import Link from "next/link";

import { primaryButtonClass } from "@/components/button-styles";
import { getDictionary, getLocale } from "@/i18n/dictionaries";

export default async function NotFound() {
  const locale = await getLocale();
  const { notFound } = await getDictionary();

  return (
    <main id="main" className="mx-auto max-w-[1280px] px-4 pt-10 pb-24 sm:px-8 sm:pt-16">
      <section className="max-w-[760px] rounded-card border border-rule bg-paper px-6 py-8 shadow-sheet sm:px-8">
        <h1 className="text-[28px] leading-tight font-bold tracking-[-0.02em]">{notFound.title}</h1>
        <p className="mt-2 max-w-[60ch] text-ink-soft">{notFound.body}</p>
        <Link href={`/${locale}/analyses/sample`} className={`${primaryButtonClass} mt-6`}>
          {notFound.back}
        </Link>
      </section>
    </main>
  );
}
