"use server";

// Server Action behind the language switch: saves a signed-in user's choice on the account, so signing in on
// another device or in the mobile app opens in the same language. Signed-out visitors keep only the cookie.

import { isLocale } from "@/i18n/config";
import { updatePreferredLanguage } from "@/lib/api/backend";
import { ApiError } from "@/lib/api/client";
import { getSessionToken } from "@/lib/auth/session";

export async function saveLanguagePreference(localeValue: string): Promise<void> {
  if (!isLocale(localeValue) || !(await getSessionToken())) return;
  try {
    await updatePreferredLanguage(localeValue);
  } catch (error) {
    // The switch itself already happened through the URL. An expired session just skips the save;
    // anything else is logged, because the next sign-in would open in the old language.
    if (!(error instanceof ApiError && error.status === 401)) {
      console.error("Saving the language preference failed", error);
    }
  }
}
