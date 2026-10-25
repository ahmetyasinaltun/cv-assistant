// Data access layer for the signed-in user: one place that reads the session and asks the API who it belongs to.

import { redirect } from "next/navigation";
import { cache } from "react";

import type { Locale } from "@/i18n/config";
import { getMe } from "@/lib/api/backend";
import { ApiError } from "@/lib/api/client";
import type { User } from "@/lib/api/types";

import { getSessionToken } from "./session";

/** The user behind the session cookie, or null when there is none or the API rejects it. Cached per request. */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  if (!(await getSessionToken())) return null;
  try {
    return await getMe();
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return null;
    throw error;
  }
});

/** Sends visitors without a valid session to sign-in, remembering where they wanted to go. */
export async function requireUser(locale: Locale, returnPath: string): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect(`/${locale}/sign-in?next=${encodeURIComponent(returnPath)}`);
  return user;
}
