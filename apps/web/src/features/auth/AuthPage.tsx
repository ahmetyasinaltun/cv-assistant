// Shared layout of the sign-in and registration pages: the brand band says what the product does and offers the
// sample, and the form sits in one card over the band's edge.

import Link from "next/link";

import { BandPage } from "@/components/BandPage";
import { onBrandButtonClass } from "@/components/button-styles";
import { inlineLinkClass } from "@/components/form/field-styles";
import { getDictionary, getLocale } from "@/i18n/dictionaries";
import { safeReturnPath } from "@/lib/auth/session-rules";

import { AuthForm } from "./AuthForm";

interface AuthPageProps {
  mode: "signIn" | "register";
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function AuthPage({ mode, searchParams }: AuthPageProps) {
  const [locale, dictionary, query] = await Promise.all([getLocale(), getDictionary(), searchParams]);
  const labels = dictionary.auth;
  const next = safeReturnPath(query.next, locale);
  const otherPath = mode === "signIn" ? "register" : "sign-in";
  const otherHref = `/${locale}/${otherPath}${next ? `?next=${encodeURIComponent(next)}` : ""}`;

  return (
    <BandPage
      width="narrow"
      title={labels[mode].title}
      meta={dictionary.meta.description}
      notice={
        <p className="flex flex-wrap items-center gap-x-3 gap-y-2 text-[15px] text-on-brand-soft">
          {labels.samplePrompt}
          <Link href={`/${locale}/analyses/sample`} className={onBrandButtonClass}>
            {labels.sampleLink}
          </Link>
        </p>
      }
    >
      <div className="rounded-card border border-rule bg-paper px-5 py-6 shadow-sheet sm:px-8 sm:py-7">
        <AuthForm mode={mode} locale={locale} next={next} labels={labels} />
        <p className="mt-6 border-t border-rule pt-4 text-[15px] text-ink-soft">
          {labels[mode].switchPrompt}{" "}
          <Link href={otherHref} className={inlineLinkClass}>
            {labels[mode].switchLink}
          </Link>
        </p>
      </div>
    </BandPage>
  );
}
