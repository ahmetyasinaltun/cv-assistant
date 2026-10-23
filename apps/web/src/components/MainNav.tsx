"use client";

// Main navigation links in the top bar; marks the section that contains the current page.

import Link from "next/link";
import { usePathname } from "next/navigation";

import type { Locale } from "@/i18n/config";

interface NavItem {
  href: string;
  /** Path prefix that counts as "inside" this item; defaults to href. */
  section?: string;
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
    <nav aria-label={label} className="order-last -mx-1 w-full overflow-x-auto sm:order-none sm:w-auto">
      <ul className="flex gap-1 pb-2 sm:pb-0">
        {items.map((item) => {
          const href = `/${locale}${item.href}`;
          const section = `/${locale}${item.section ?? item.href}`;
          const isCurrent = pathname === section || pathname.startsWith(`${section}/`);
          return (
            <li key={item.href}>
              <Link
                href={href}
                aria-current={isCurrent ? "page" : undefined}
                className="relative flex h-9 items-center rounded px-2.5 text-[14px] whitespace-nowrap text-shell-mute transition-colors duration-150 hover:text-shell-text aria-[current=page]:text-shell-text aria-[current=page]:after:absolute aria-[current=page]:after:inset-x-2.5 aria-[current=page]:after:-bottom-px aria-[current=page]:after:h-0.5 aria-[current=page]:after:bg-marker sm:h-13"
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
