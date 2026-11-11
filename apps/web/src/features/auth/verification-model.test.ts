// Tests the rules behind email verification on the web: code input, refusal messages and the shared AI refusals.

import { describe, expect, it } from "vitest";

import { submitErrorResult } from "@/features/new-analysis/new-analysis-model";
import { aiRefusalKey } from "@/lib/api/ai-refusals";
import { ApiError, NETWORK_ERROR_STATUS } from "@/lib/api/client";
import { isPrivatePath } from "@/lib/auth/session-rules";

import { authErrorKey } from "./auth-errors";
import { isCompleteCode, needsVerification, normalizeCode, verifyErrorState } from "./verification-model";

describe("verification code input", () => {
  it("keeps only the digits an email client may copy with the code", () => {
    expect(normalizeCode(" 123 456 ")).toBe("123456");
    expect(normalizeCode("Code: 987-654")).toBe("987654");
  });

  it("accepts exactly six digits", () => {
    expect(isCompleteCode("123456")).toBe(true);
    expect(isCompleteCode("12345")).toBe(false);
    expect(isCompleteCode("1234567")).toBe(false);
  });
});

describe("needsVerification", () => {
  it("locks only an account the API marks unverified", () => {
    expect(needsVerification({ email_verified: false })).toBe(true);
    expect(needsVerification({ email_verified: true })).toBe(false);
    // An API from before verification sends no flag; its accounts must not be locked out.
    expect(needsVerification({})).toBe(false);
  });
});

describe("verifyErrorState", () => {
  it("names each refusal of the code", () => {
    expect(verifyErrorState(new ApiError(422, "code_invalid", "")).error).toBe("codeInvalid");
    expect(verifyErrorState(new ApiError(422, "code_expired", "")).error).toBe("codeExpired");
    expect(verifyErrorState(new ApiError(429, "too_many_attempts", "")).error).toBe("tooManyAttempts");
    expect(verifyErrorState(new ApiError(502, "email_unavailable", "")).error).toBe("emailUnavailable");
  });

  it("tells how long to wait before a new code, from Retry-After", () => {
    const state = verifyErrorState(new ApiError(429, "rate_limited", "", 42));
    expect(state).toEqual({ error: "tooSoon", resent: false, waitSeconds: 42 });
  });

  it("treats an unreachable API and unknown errors separately", () => {
    expect(verifyErrorState(new ApiError(NETWORK_ERROR_STATUS, "network_error", "")).error).toBe("unavailable");
    expect(verifyErrorState(new Error("boom")).error).toBe("generic");
  });
});

describe("AI refusals", () => {
  it("recognizes an unverified account and the service-wide daily budget", () => {
    expect(aiRefusalKey(new ApiError(403, "email_not_verified", ""))).toBe("notVerified");
    expect(aiRefusalKey(new ApiError(429, "daily_budget_reached", ""))).toBe("dailyBudget");
    expect(aiRefusalKey(new ApiError(429, "rate_limited", ""))).toBeNull();
  });

  it("reach the new-analysis form as their own messages", () => {
    const unverified = submitErrorResult("analysis", new ApiError(403, "email_not_verified", ""), "r1");
    expect(unverified).toEqual({ formError: "notVerified", fieldErrors: {}, savedResumeId: "r1" });
    const budget = submitErrorResult("analysis", new ApiError(429, "daily_budget_reached", ""), null);
    expect(budget.formError).toBe("dailyBudget");
    // A personal limit keeps its own message.
    expect(submitErrorResult("analysis", new ApiError(429, "rate_limited", ""), null).formError).toBe(
      "rateLimited",
    );
  });
});

describe("registration limits", () => {
  it("says too many accounts on registration, too many attempts on sign-in", () => {
    const limited = new ApiError(429, "rate_limited", "");
    expect(authErrorKey(limited, "register")).toBe("tooManyAccounts");
    expect(authErrorKey(limited)).toBe("tooManyAttempts");
  });

  it("keeps the code screen behind sign-in", () => {
    expect(isPrivatePath("/verify-email")).toBe(true);
  });
});
