// Graphite top bar shared by every screen: product name, main navigation, account and the language switch.
// The parts that depend on the session stream in behind Suspense, so the bar itself stays in the static shell.

import Link from "next/link";
import { Suspense } from "react";

import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";

import { LocaleSwitch, LocaleSwitchPlaceholder } from "./LocaleSwitch";
import { AccountControls, SessionNav } from "./SessionNav";

interface AppHeaderProps {
  locale: Locale;
  labels: Dictionary["shell"];
}

export function AppHeader({ locale, labels }: AppHeaderProps) {
  return (
    <header className="bg-shell text-shell-text">
      <div className="mx-auto flex max-w-[1520px] flex-wrap items-center gap-x-8 gap-y-1 px-4 sm:px-6">
        <Link
          href={`/${locale}`}
          translate="no"
          className="flex h-13 items-center text-[15px] font-semibold tracking-[-0.01em] [font-stretch:92%]"
        >
          {labels.product}
        </Link>
        <Suspense fallback={<div className="order-last h-11 w-full sm:order-none sm:h-13 sm:w-auto" />}>
          <SessionNav locale={locale} labels={labels} />
        </Suspense>
        <div className="ml-auto flex items-center gap-3">
          <Suspense fallback={null}>
            <AccountControls locale={locale} labels={labels} />
          </Suspense>
          {/* The switch keeps the current path, which dynamic routes only know at request time. */}
          <Suspense fallback={<LocaleSwitchPlaceholder locale={locale} />}>
            <LocaleSwitch locale={locale} label={labels.language} />
          </Suspense>
        </div>
      </div>
    </header>
  );
}
