"use server";

// Server Actions of the new-analysis screen: save the CV if it is new, save the posting, start the analysis
// and open it; fill the posting from a link; and delete a saved CV. Every step goes through the API with the
// session token.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { defaultLocale, isLocale, type Locale } from "@/i18n/config";
import {
  createAnalysis,
  createJobDescription,
  createResumeFromText,
  deleteResume,
  importJobDescription,
  uploadResume,
} from "@/lib/api/backend";
import { ApiError } from "@/lib/api/client";
import type { JobDescriptionDraft } from "@/lib/api/types";

import {
  NEW_RESUME,
  linkErrorKey,
  submitErrorResult,
  type LinkErrorKey,
  type StartAnalysisResult,
  type SubmitStep,
} from "./new-analysis-model";

function text(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function toLocale(value: string): Locale {
  return isLocale(value) ? value : defaultLocale;
}

/** An expired session is not a form error: send the visitor to sign in and back here. */
function redirectIfSignedOut(error: unknown, locale: Locale) {
  if (error instanceof ApiError && error.status === 401) {
    redirect(`/${locale}/sign-in?next=${encodeURIComponent(`/${locale}/analyses/new`)}`);
  }
}

export async function startAnalysis(localeValue: string, formData: FormData): Promise<StartAnalysisResult> {
  const locale = toLocale(localeValue);
  const choice = text(formData, "resumeChoice");
  let step: SubmitStep = "analysis";
  let resumeId: string | null = choice && choice !== NEW_RESUME ? choice : null;
  let savedResumeId: string | null = null;
  let analysisId: string;

  try {
    if (!resumeId) {
      const title = text(formData, "resumeTitle");
      const file = formData.get("resumeFile");
      if (text(formData, "resumeSource") === "upload" && file instanceof File) {
        step = "resumeUpload";
        resumeId = (await uploadResume(title, file)).id;
      } else {
        step = "resumeText";
        resumeId = (await createResumeFromText(title, text(formData, "resumeText"))).id;
      }
      savedResumeId = resumeId;
    }
    step = "jobDescription";
    const company = text(formData, "company") || null;
    const job = await createJobDescription(text(formData, "jobTitle"), company, text(formData, "jobText"));
    step = "analysis";
    // AI-written text follows the interface language the analysis was started in.
    analysisId = (await createAnalysis(resumeId, job.id, locale)).id;
  } catch (error) {
    redirectIfSignedOut(error, locale);
    if (!(error instanceof ApiError)) console.error("Starting an analysis failed", error);
    // A CV saved before the failure must show up in the list, already selected.
    if (savedResumeId) revalidatePath(`/${locale}/analyses/new`);
    return submitErrorResult(step, error, savedResumeId);
  }
  redirect(`/${locale}/analyses/${analysisId}`);
}

export type LinkFillResult = { ok: true; posting: JobDescriptionDraft } | { ok: false; error: LinkErrorKey };

/** Reads the posting behind a link for the form to show; nothing is saved until the analysis starts. */
export async function fillFromLink(localeValue: string, link: string): Promise<LinkFillResult> {
  const locale = toLocale(localeValue);
  try {
    return { ok: true, posting: await importJobDescription(link) };
  } catch (error) {
    redirectIfSignedOut(error, locale);
    if (!(error instanceof ApiError)) console.error("Filling a posting from a link failed", error);
    return { ok: false, error: linkErrorKey(error) };
  }
}

export async function deleteSavedResume(localeValue: string, resumeId: string): Promise<{ ok: boolean }> {
  const locale = toLocale(localeValue);
  try {
    await deleteResume(resumeId);
  } catch (error) {
    redirectIfSignedOut(error, locale);
    return { ok: false };
  }
  revalidatePath(`/${locale}/analyses/new`);
  return { ok: true };
}
