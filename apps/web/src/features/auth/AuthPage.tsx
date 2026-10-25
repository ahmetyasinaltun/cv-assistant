// Shared layout of the sign-in and registration pages: one paper slip on the desk, with a way to the sample.

import Link from "next/link";

import { inlineLinkClass, textActionClass } from "@/components/form/field-styles";
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
    <main id="main" className="mx-auto max-w-[1520px] px-4 pt-10 pb-24 sm:px-6 sm:pt-16">
      <div className="mx-auto w-full max-w-[400px]">
        <section aria-labelledby="auth-title" className="bg-paper px-6 py-7 shadow-sheet sm:px-8">
          <h1 id="auth-title" className="text-[22px] leading-[1.25] font-semibold tracking-[-0.02em]">
            {labels[mode].title}
          </h1>
          <AuthForm mode={mode} locale={locale} next={next} labels={labels} />
          <p className="mt-6 border-t border-rule pt-4 text-[14px] text-ink-soft">
            {labels[mode].switchPrompt}{" "}
            <Link href={otherHref} className={inlineLinkClass}>
              {labels[mode].switchLink}
            </Link>
          </p>
        </section>
        <p className="mt-5 text-[13px] text-mute">
          {labels.samplePrompt}{" "}
          <Link href={`/${locale}/analyses/sample`} className={textActionClass}>
            {labels.sampleLink}
          </Link>
        </p>
      </div>
    </main>
  );
}
