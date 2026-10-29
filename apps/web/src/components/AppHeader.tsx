// White top bar shared by every screen: product mark and name, main navigation, account and the language switch.
// The parts that depend on the session stream in behind Suspense, so the bar itself stays in the static shell.

import Link from "next/link";
import { Suspense } from "react";

import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";

import { BarMenu } from "./BarMenu";
import { LocaleSwitch, LocaleSwitchPlaceholder } from "./LocaleSwitch";
import { AccountControls, SessionNav } from "./SessionNav";

interface AppHeaderProps {
  locale: Locale;
  labels: Dictionary["shell"];
}

/** The app icon (two CV lines circled), drawn in the brand colours. */
function BrandMark() {
  return (
    <svg aria-hidden="true" width="28" height="28" viewBox="0 0 32 32" className="shrink-0">
      <rect width="32" height="32" rx="7" className="fill-brand" />
      <path d="M8 13h16M8 19h11" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
      <path
        d="M5.5 17C5 9.5 9 7.5 16 7.5s11 2 11 8.5-4.5 9-11 9-10.5-2-10.5-8.5c0-3 1.5-5 5-6"
        fill="none"
        strokeWidth="2"
        strokeLinecap="round"
        className="stroke-on-brand-soft"
      />
    </svg>
  );
}

export function AppHeader({ locale, labels }: AppHeaderProps) {
  return (
    <header className="border-b border-rule bg-paper">
      {/* Phones: brand and a menu button in one row; the menu opens the rest under the bar. */}
      <div className="mx-auto flex max-w-[1280px] flex-wrap items-center gap-x-3 px-4 sm:flex-nowrap sm:px-8">
        <Link
          href={`/${locale}`}
          translate="no"
          className="order-1 flex h-14 shrink-0 items-center gap-2.5 text-[17px] font-bold tracking-[-0.01em] text-ink sm:h-16"
        >
          <BrandMark />
          {labels.product}
        </Link>
        <BarMenu label={labels.menu}>
          <Suspense fallback={<div className="h-10 sm:order-2 sm:ml-4 sm:h-16" />}>
            <SessionNav locale={locale} labels={labels} />
          </Suspense>
          <div className="-mx-3 flex items-center sm:order-3 sm:mx-0 sm:ml-auto">
            <Suspense fallback={null}>
              <AccountControls locale={locale} labels={labels} />
            </Suspense>
          </div>
          <div className="sm:order-4">
            {/* The switch keeps the current path, which dynamic routes only know at request time. */}
            <Suspense fallback={<LocaleSwitchPlaceholder locale={locale} />}>
              <LocaleSwitch locale={locale} label={labels.language} />
            </Suspense>
          </div>
        </BarMenu>
      </div>
    </header>
  );
}
