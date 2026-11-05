"use client";

// Main navigation links in the top bar; marks the section that contains the current page.

import Link from "next/link";
import { usePathname } from "next/navigation";

import type { Locale } from "@/i18n/config";

interface NavItem {
  href: string;
  /** Path prefix that counts as "inside" this item; defaults to href. */
  section?: string;
  /** Paths under the section that belong elsewhere (the public sample is not "your" analyses). */
  excludes?: string[];
  label: string;
}

interface MainNavProps {
  locale: Locale;
  label: string;
  items: NavItem[];
}

export function MainNav({ locale, label, items }: MainNavProps) {
  const pathname = usePathname();

  return (
    <nav aria-label={label} className="-mx-2.5 sm:order-2 sm:ml-2 md:ml-4">
      <ul className="flex gap-1">
        {items.map((item) => {
          const href = `/${locale}${item.href}`;
          const section = `/${locale}${item.section ?? item.href}`;
          const isExcluded = item.excludes?.some((path) => pathname === `/${locale}${path}`) ?? false;
          const isCurrent =
            !isExcluded && (pathname === section || pathname.startsWith(`${section}/`));
          return (
            <li key={item.href}>
              <Link
                href={href}
                aria-current={isCurrent ? "page" : undefined}
                className="relative flex h-10 items-center rounded px-2.5 text-[15px] font-medium whitespace-nowrap text-ink-soft transition-colors duration-150 hover:text-ink aria-[current=page]:text-ink aria-[current=page]:after:absolute aria-[current=page]:after:inset-x-2.5 aria-[current=page]:after:-bottom-px aria-[current=page]:after:h-0.5 aria-[current=page]:after:bg-accent sm:h-16"
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
