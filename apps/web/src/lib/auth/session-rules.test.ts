// Unit tests for the session rules: token expiry, private paths and the open-redirect guard on `?next=`.

import { describe, expect, it } from "vitest";

import { isPrivatePath, safeReturnPath, signInDestination, tokenExpiry } from "./session-rules";

function fakeJwt(payload: object): string {
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${encode({ alg: "HS256" })}.${encode(payload)}.signature`;
}

describe("tokenExpiry", () => {
  it("reads the exp claim as a date", () => {
    expect(tokenExpiry(fakeJwt({ sub: "u1", exp: 1_800_000_000 }))?.toISOString()).toBe(
      "2027-01-15T08:00:00.000Z",
    );
  });

  it("returns null for tokens without a usable exp", () => {
    expect(tokenExpiry(fakeJwt({ sub: "u1" }))).toBeNull();
    expect(tokenExpiry("not-a-jwt")).toBeNull();
    expect(tokenExpiry("a.%%%.c")).toBeNull();
  });
});

describe("safeReturnPath", () => {
  it("keeps paths inside the app and the current locale", () => {
    expect(safeReturnPath("/tr/analyses/abc", "tr")).toBe("/tr/analyses/abc");
    expect(safeReturnPath("/en/analyses/new?sample=1", "en")).toBe("/en/analyses/new?sample=1");
  });

  it("rejects other sites, other locales and anything that is not a string", () => {
    expect(safeReturnPath("https://evil.example/tr/", "tr")).toBeNull();
    expect(safeReturnPath("//evil.example/tr/analyses", "tr")).toBeNull();
    expect(safeReturnPath("/tr/\\evil.example", "tr")).toBeNull();
    expect(safeReturnPath("/en/analyses", "tr")).toBeNull();
    expect(safeReturnPath(["/tr/analyses"], "tr")).toBeNull();
    expect(safeReturnPath(undefined, "tr")).toBeNull();
  });
});

describe("isPrivatePath", () => {
  it("guards the analyses list, new analysis and real results but not the sample", () => {
    expect(isPrivatePath("/analyses")).toBe(true);
    expect(isPrivatePath("/analyses/new")).toBe(true);
    expect(isPrivatePath("/analyses/7f6c")).toBe(true);
    expect(isPrivatePath("/analyses/sample")).toBe(false);
    expect(isPrivatePath("/sign-in")).toBe(false);
  });
});

describe("signInDestination", () => {
  it("opens the checked return path in the account's language", () => {
    expect(signInDestination("/en/analyses/abc", "en", "tr")).toBe("/tr/analyses/abc");
    expect(signInDestination("/tr/analyses/new?sample=1", "tr", "tr")).toBe("/tr/analyses/new?sample=1");
  });

  it("falls back to the analyses list when the return path is missing or unsafe", () => {
    expect(signInDestination(null, "en", "tr")).toBe("/tr/analyses");
    expect(signInDestination("https://evil.example/en/x", "en", "en")).toBe("/en/analyses");
    // A path in another language than the form is not trusted either, as before.
    expect(signInDestination("/tr/analyses/abc", "en", "en")).toBe("/en/analyses");
  });
});
