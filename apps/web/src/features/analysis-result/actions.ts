"use server";

// Server Actions behind the result screen's buttons: generate interview questions and run an analysis again.
// The API checks the session token on each call, so a foreign analysis id fails there.

import { redirect } from "next/navigation";

import { defaultLocale, isLocale } from "@/i18n/config";
import { createAnalysis, generateInterviewQuestions, getAnalysis } from "@/lib/api/backend";
import type { InterviewQuestion } from "@/lib/api/types";

export async function generateQuestionsForAnalysis(analysisId: string): Promise<InterviewQuestion[]> {
  return generateInterviewQuestions(analysisId);
}

/** Starts a fresh analysis with the same CV and posting, then opens it. */
export async function rerunAnalysis(locale: string, analysisId: string): Promise<void> {
  const previous = await getAnalysis(analysisId);
  const created = await createAnalysis(previous.resume_id, previous.job_description_id);
  redirect(`/${isLocale(locale) ? locale : defaultLocale}/analyses/${created.id}`);
}
