// Email verification screen: says where the code went, takes it, and offers a new code, a way to look around
// first, and a way out when the address was mistyped. A verified account goes straight on.

import Link from "next/link";
import { redirect } from "next/navigation";

import { BandPage } from "@/components/BandPage";
import { inlineLinkClass } from "@/components/form/field-styles";
import { getDictionary, getLocale } from "@/i18n/dictionaries";
import { requireUser } from "@/lib/auth/current-user";
import { safeReturnPath } from "@/lib/auth/session-rules";

import { signOut } from "./actions";
import { VerifyEmailForm } from "./VerifyEmailForm";
import { needsVerification } from "./verification-model";

interface VerifyEmailPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function VerifyEmailPage({ searchParams }: VerifyEmailPageProps) {
  const [locale, dictionary, query] = await Promise.all([getLocale(), getDictionary(), searchParams]);
  const next = safeReturnPath(query.next, locale);
  const here = `/${locale}/verify-email${next ? `?next=${encodeURIComponent(next)}` : ""}`;
  const user = await requireUser(locale, here);
  const destination = next ?? `/${locale}/analyses`;
  if (!needsVerification(user)) redirect(destination);

  const copy = dictionary.auth.verify;
  const [beforeEmail, afterEmail] = copy.sentTo.split("{email}");

  return (
    <BandPage width="narrow" title={copy.title} meta={copy.meta}>
      <div className="rounded-card border border-rule bg-paper px-5 py-6 shadow-sheet sm:px-8 sm:py-7">
        <p className="text-ink-soft">
          {beforeEmail}
          <strong translate="no" className="font-semibold break-words text-ink">
            {user.email}
          </strong>
          {afterEmail}
        </p>
        <VerifyEmailForm locale={locale} next={next} labels={copy} />
        <div className="mt-6 space-y-2 border-t border-rule pt-4 text-[15px] text-ink-soft">
          <p>
            <Link href={destination} className={inlineLinkClass}>
              {copy.later}
            </Link>
            <span className="mt-0.5 block text-[14px] text-mute">{copy.laterNote}</span>
          </p>
          <form action={signOut}>
            <input type="hidden" name="locale" value={locale} />
            {copy.wrongAddress}{" "}
            <button type="submit" className={`${inlineLinkClass} cursor-pointer`}>
              {copy.signOut}
            </button>
          </form>
        </div>
      </div>
    </BandPage>
  );
}
