"use client";

// Two-option language switch: keeps the current page, swaps the locale segment and remembers the choice in a
// cookie; for a signed-in user it is also saved on the account, so other devices and the mobile app follow it.

import Link from "next/link";
import { usePathname } from "next/navigation";

import { saveLanguagePreference } from "@/features/account/actions";
import {
  LOCALE_COOKIE,
  LOCALE_COOKIE_MAX_AGE_SECONDS,
  locales,
  pathForLocale,
  type Locale,
} from "@/i18n/config";

function rememberLocale(locale: Locale) {
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=${LOCALE_COOKIE_MAX_AGE_SECONDS}; samesite=lax`;
  // Not awaited: the navigation takes priority over a pending Server Action, whose request still completes.
  void saveLanguagePreference(locale);
}

interface LocaleSwitchProps {
  locale: Locale;
  label: string;
}

export function LocaleSwitch({ locale, label }: LocaleSwitchProps) {
  const pathname = usePathname();

  return (
    <div role="group" aria-label={label} className="flex items-center rounded-lg border border-rule p-0.5">
      {locales.map((option) => {
        const isActive = option === locale;
        return (
          <Link
            key={option}
            href={pathForLocale(pathname, option)}
            hrefLang={option}
            lang={option}
            aria-current={isActive ? "true" : undefined}
            onClick={isActive ? undefined : () => rememberLocale(option)}
            className="flex h-8 min-w-10 items-center justify-center rounded-md px-2 text-[12.5px] font-semibold tracking-[0.06em] text-mute uppercase transition-colors duration-150 [font-stretch:85%] hover:text-ink aria-[current=true]:bg-accent-tint aria-[current=true]:text-accent-hover"
          >
            {option}
          </Link>
        );
      })}
    </div>
  );
}

/** Same well while the current path is not known yet (dynamic routes stream it in); not interactive. */
export function LocaleSwitchPlaceholder({ locale }: { locale: Locale }) {
  return (
    <div aria-hidden="true" className="flex items-center rounded-lg border border-rule p-0.5">
      {locales.map((option) => (
        <span
          key={option}
          data-active={option === locale}
          className="flex h-8 min-w-10 items-center justify-center rounded-md px-2 text-[12.5px] font-semibold tracking-[0.06em] text-mute uppercase [font-stretch:85%] data-[active=true]:bg-accent-tint data-[active=true]:text-accent-hover"
        >
          {option}
        </span>
      ))}
    </div>
  );
}
