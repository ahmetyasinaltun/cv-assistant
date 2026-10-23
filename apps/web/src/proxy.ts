// Redirects paths without a locale prefix to the visitor's language (saved choice first, then the browser's).

import { NextResponse, type NextRequest } from "next/server";

import { LOCALE_COOKIE, locales } from "./i18n/config";
import { negotiateLocale } from "./i18n/negotiate";

const HOME_PATH = "/analyses/sample";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasLocale = locales.some(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`),
  );
  if (hasLocale) return;

  const locale = negotiateLocale(
    request.headers.get("accept-language"),
    request.cookies.get(LOCALE_COOKIE)?.value,
  );
  const url = request.nextUrl.clone();
  url.pathname = `/${locale}${pathname === "/" ? HOME_PATH : pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  // Skip Next.js internals and files with an extension (fonts, icons, images).
  matcher: ["/((?!_next/|.*\\..*).*)"],
};
