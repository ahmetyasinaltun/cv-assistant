// Stores the API access token in an httpOnly cookie, so page scripts can never read it.
// Cookies can only be written from Server Actions, which is where sign-in and sign-out happen.

import { cookies } from "next/headers";

import { SESSION_COOKIE, tokenExpiry } from "./session-rules";

export async function getSessionToken(): Promise<string | null> {
  return (await cookies()).get(SESSION_COOKIE)?.value ?? null;
}

export async function saveSession(token: string): Promise<void> {
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    // The cookie disappears when the token does, so the browser does not keep sending a dead session.
    expires: tokenExpiry(token) ?? undefined,
  });
}

export async function clearSession(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}
