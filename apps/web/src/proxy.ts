// Runs before every page request: adds the locale to unprefixed paths, picks the home screen and keeps
// signed-out visitors out of the private screens. Cookie presence is only an optimistic check; every
// private page still asks the API whether the session is valid.

import { NextResponse, type NextRequest } from "next/server";

import { LOCALE_COOKIE, locales, type Locale } from "./i18n/config";
import { negotiateLocale } from "./i18n/negotiate";
import { SESSION_COOKIE, isPrivatePath } from "./lib/auth/session-rules";

const SAMPLE_PATH = "/analyses/sample";
const HISTORY_PATH = "/analyses";

function redirectTo(request: NextRequest, pathname: string, search = "") {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = search;
  return NextResponse.redirect(url);
}

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const hasSession = request.cookies.has(SESSION_COOKIE);
  const home = hasSession ? HISTORY_PATH : SAMPLE_PATH;
  const locale = locales.find(
    (candidate) => pathname === `/${candidate}` || pathname.startsWith(`/${candidate}/`),
  );

  if (!locale) {
    const negotiated: Locale = negotiateLocale(
      request.headers.get("accept-language"),
      request.cookies.get(LOCALE_COOKIE)?.value,
    );
    return redirectTo(request, `/${negotiated}${pathname === "/" ? home : pathname}`, search);
  }

  const path = pathname.slice(locale.length + 1);
  if (path === "" || path === "/") return redirectTo(request, `/${locale}${home}`);
  if (isPrivatePath(path) && !hasSession) {
    return redirectTo(request, `/${locale}/sign-in`, `?next=${encodeURIComponent(pathname + search)}`);
  }
}

export const config = {
  // Skip Next.js internals and files with an extension (fonts, icons, images).
  matcher: ["/((?!_next/|.*\\..*).*)"],
};
