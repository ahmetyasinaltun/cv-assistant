// Session-aware parts of the top bar: which sections are offered, and sign-in or the account with sign-out.

import Link from "next/link";

import { signOut } from "@/features/auth/actions";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { getCurrentUser } from "@/lib/auth/current-user";
import type { User } from "@/lib/api/types";

import { MainNav } from "./MainNav";

interface SessionPartProps {
  locale: Locale;
  labels: Dictionary["shell"];
}

const barActionClass =
  "flex h-9 items-center rounded px-2.5 text-[14px] whitespace-nowrap text-shell-mute transition-colors duration-150 hover:text-shell-text";

/** The bar must render even when the API is down; pages report that failure themselves. */
async function userOrNull(): Promise<User | null> {
  try {
    return await getCurrentUser();
  } catch {
    return null;
  }
}

export async function SessionNav({ locale, labels }: SessionPartProps) {
  const user = await userOrNull();
  const items = user
    ? [{ href: "/analyses", excludes: ["/analyses/sample"], label: labels.nav.analyses }]
    : [{ href: "/analyses/sample", label: labels.nav.sample }];

  return <MainNav locale={locale} label={labels.navLabel} items={items} />;
}

export async function AccountControls({ locale, labels }: SessionPartProps) {
  const user = await userOrNull();

  if (!user) {
    return (
      <Link href={`/${locale}/sign-in`} className={barActionClass}>
        {labels.signIn}
      </Link>
    );
  }

  return (
    <div role="group" aria-label={labels.accountLabel} className="flex items-center gap-1">
      <span translate="no" className="hidden max-w-[18ch] truncate text-[14px] text-shell-mute md:inline">
        {user.full_name}
      </span>
      <form action={signOut}>
        <input type="hidden" name="locale" value={locale} />
        <button type="submit" className={barActionClass}>
          {labels.signOut}
        </button>
      </form>
    </div>
  );
}
