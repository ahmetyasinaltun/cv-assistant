// Graphite top bar shared by every screen: product name, main navigation and the language switch.

import Link from "next/link";

import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";

import { LocaleSwitch } from "./LocaleSwitch";
import { MainNav } from "./MainNav";

interface AppHeaderProps {
  locale: Locale;
  labels: Dictionary["shell"];
}

export function AppHeader({ locale, labels }: AppHeaderProps) {
  return (
    <header className="bg-shell text-shell-text">
      <div className="mx-auto flex max-w-[1520px] flex-wrap items-center gap-x-8 gap-y-1 px-4 sm:px-6">
        <Link
          href={`/${locale}/analyses/sample`}
          translate="no"
          className="flex h-13 items-center text-[15px] font-semibold tracking-[-0.01em] [font-stretch:92%]"
        >
          {labels.product}
        </Link>
        <MainNav
          locale={locale}
          label={labels.navLabel}
          // CVs and job postings join the navigation when their screens exist.
          items={[{ href: "/analyses/sample", section: "/analyses", label: labels.nav.analyses }]}
        />
        <LocaleSwitch locale={locale} label={labels.language} />
      </div>
    </header>
  );
}
