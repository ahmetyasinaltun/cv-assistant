"use client";

// Reminder under the top bar while the signed-in account's email address is not verified. It links to the code
// screen and brings the user back to the page they were on; on the code screen itself it is not needed.

import Link from "next/link";
import { usePathname } from "next/navigation";

interface VerifyNoticeBarProps {
  locale: string;
  text: string;
  link: string;
}

export function VerifyNoticeBar({ locale, text, link }: VerifyNoticeBarProps) {
  const pathname = usePathname();
  const codePage = `/${locale}/verify-email`;
  if (pathname === codePage) return null;

  return (
    <div className="border-t border-rule bg-accent-tint print:hidden">
      <p className="mx-auto flex max-w-[1280px] flex-wrap items-baseline gap-x-3 gap-y-1 px-4 py-2.5 text-[14px] text-accent-hover sm:px-8">
        <span>{text}</span>
        <Link
          href={`${codePage}?next=${encodeURIComponent(pathname)}`}
          className="font-semibold underline decoration-accent/35 underline-offset-[3px] transition-colors duration-150 hover:decoration-accent"
        >
          {link}
        </Link>
      </p>
    </div>
  );
}
