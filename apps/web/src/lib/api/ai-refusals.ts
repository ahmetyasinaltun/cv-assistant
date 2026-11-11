// The two refusals every AI action can meet besides its own failures: an unverified email address and the
// service-wide daily AI budget. Each screen shows them with its own words, from the keys returned here.

import { ApiError } from "./client";

export type AiRefusalKey = "notVerified" | "dailyBudget";

export function aiRefusalKey(error: unknown): AiRefusalKey | null {
  if (!(error instanceof ApiError)) return null;
  if (error.status === 403 && error.code === "email_not_verified") return "notVerified";
  if (error.status === 429 && error.code === "daily_budget_reached") return "dailyBudget";
  return null;
}
