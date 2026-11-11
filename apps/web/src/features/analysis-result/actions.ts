"use server";

// Server Actions behind the result screen's buttons: generate interview questions and run an analysis again.
// The API checks the session token on each call, so a foreign analysis id fails there.

import { redirect } from "next/navigation";

import { defaultLocale, isLocale } from "@/i18n/config";
import { aiRefusalKey, type AiRefusalKey } from "@/lib/api/ai-refusals";
import { createAnalysis, generateInterviewQuestions, getAnalysis } from "@/lib/api/backend";
import { ApiError } from "@/lib/api/client";
import type { InterviewQuestion } from "@/lib/api/types";

export type QuestionsResult =
  | { ok: true; questions: InterviewQuestion[] }
  | { ok: false; error: AiRefusalKey | "generic" };

/** Returns a result instead of throwing: a thrown error reaches the browser without its reason. */
export async function generateQuestionsForAnalysis(analysisId: string): Promise<QuestionsResult> {
  try {
    return { ok: true, questions: await generateInterviewQuestions(analysisId) };
  } catch (error) {
    if (!(error instanceof ApiError)) console.error("Generating interview questions failed", error);
    return { ok: false, error: aiRefusalKey(error) ?? "generic" };
  }
}

/** Starts a fresh analysis with the same CV and posting in the current interface language, then opens it. */
export async function rerunAnalysis(localeValue: string, analysisId: string): Promise<void> {
  const locale = isLocale(localeValue) ? localeValue : defaultLocale;
  const previous = await getAnalysis(analysisId);
  const created = await createAnalysis(previous.resume_id, previous.job_description_id, locale);
  redirect(`/${locale}/analyses/${created.id}`);
}
