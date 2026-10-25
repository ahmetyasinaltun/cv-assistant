"use client";

// Two-option language switch: keeps the current page, swaps the locale segment and remembers the choice in a cookie.

import Link from "next/link";
import { usePathname } from "next/navigation";

import { LOCALE_COOKIE, locales, type Locale } from "@/i18n/config";

const ONE_YEAR_IN_SECONDS = 60 * 60 * 24 * 365;

function pathForLocale(pathname: string, target: Locale): string {
  const [, , ...rest] = pathname.split("/");
  return `/${[target, ...rest].join("/")}`;
}

function rememberLocale(locale: Locale) {
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=${ONE_YEAR_IN_SECONDS}; samesite=lax`;
}

interface LocaleSwitchProps {
  locale: Locale;
  label: string;
}

export function LocaleSwitch({ locale, label }: LocaleSwitchProps) {
  const pathname = usePathname();

  return (
    <div role="group" aria-label={label} className="flex items-center rounded-md bg-shell-raised p-0.5">
      {locales.map((option) => {
        const isActive = option === locale;
        return (
          <Link
            key={option}
            href={pathForLocale(pathname, option)}
            hrefLang={option}
            lang={option}
            aria-current={isActive ? "true" : undefined}
            onClick={() => rememberLocale(option)}
            className="flex h-8 min-w-10 items-center justify-center rounded-[5px] px-2 text-[12px] font-semibold tracking-[0.06em] text-shell-mute uppercase transition-colors duration-150 [font-stretch:85%] hover:text-shell-text aria-[current=true]:bg-paper aria-[current=true]:text-ink"
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
    <div aria-hidden="true" className="flex items-center rounded-md bg-shell-raised p-0.5">
      {locales.map((option) => (
        <span
          key={option}
          data-active={option === locale}
          className="flex h-8 min-w-10 items-center justify-center rounded-[5px] px-2 text-[12px] font-semibold tracking-[0.06em] text-shell-mute uppercase [font-stretch:85%] data-[active=true]:bg-paper data-[active=true]:text-ink"
        >
          {option}
        </span>
      ))}
    </div>
  );
}
