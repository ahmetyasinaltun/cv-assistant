"use server";

// Server Actions of the CV screens: import a saved CV, start a blank CV, save the editor's changes and delete a CV.
// Every step goes through the API with the session token; failures come back as stable keys the screens translate.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { defaultLocale, isLocale, type Locale } from "@/i18n/config";
import {
  answerCvQuestions,
  createBlankCvDocument,
  createTailoredCv,
  createCvDocumentFromResume,
  deleteCvDocument,
  updateCvDocument,
  type CvDocumentChanges,
} from "@/lib/api/backend";
import { ApiError, NETWORK_ERROR_STATUS } from "@/lib/api/client";
import type { CvDocument, Language, TailoringMode } from "@/lib/api/types";

import { encodeImportNotice } from "./import-notice";

export type CreateErrorKey = "rateLimited" | "aiUnavailable" | "resumeMissing" | "network" | "generic";
export type SaveErrorKey = "invalid" | "rateLimited" | "network" | "generic";

function toLocale(value: string): Locale {
  return isLocale(value) ? value : defaultLocale;
}

/** An expired session is not a form error: send the visitor to sign in and back to where they were. */
function redirectIfSignedOut(error: unknown, locale: Locale, returnPath: string) {
  if (error instanceof ApiError && error.status === 401) {
    redirect(`/${locale}/sign-in?next=${encodeURIComponent(`/${locale}${returnPath}`)}`);
  }
}

function createErrorKey(error: unknown): CreateErrorKey {
  if (!(error instanceof ApiError)) return "generic";
  if (error.status === NETWORK_ERROR_STATUS) return "network";
  if (error.status === 429) return "rateLimited";
  if (error.status === 404) return "resumeMissing";
  if (error.status === 502 || error.status === 503 || error.code.startsWith("ai_")) return "aiUnavailable";
  return "generic";
}

export async function importCv(localeValue: string, resumeId: string): Promise<{ error: CreateErrorKey }> {
  const locale = toLocale(localeValue);
  let target: string;
  try {
    const document = await createCvDocumentFromResume(resumeId);
    // What the user should look at once travels in the address, so the editor can show it after the redirect.
    const notice = encodeImportNotice(document.omitted_sections, document.unsupported_facts);
    target = `/${locale}/cvs/${document.id}?imported=${notice}`;
  } catch (error) {
    redirectIfSignedOut(error, locale, "/cvs/new");
    if (!(error instanceof ApiError)) console.error("Importing a CV failed", error);
    return { error: createErrorKey(error) };
  }
  revalidatePath(`/${locale}/cvs`);
  redirect(target);
}

export async function createBlankCv(
  localeValue: string,
  title: string,
  language: Language,
): Promise<{ error: CreateErrorKey }> {
  const locale = toLocale(localeValue);
  let documentId: string;
  try {
    documentId = (await createBlankCvDocument(title.trim(), language)).id;
  } catch (error) {
    redirectIfSignedOut(error, locale, "/cvs/new");
    if (!(error instanceof ApiError)) console.error("Creating a blank CV failed", error);
    return { error: createErrorKey(error) };
  }
  revalidatePath(`/${locale}/cvs`);
  redirect(`/${locale}/cvs/${documentId}`);
}

export type SaveCvResult = { ok: true; document: CvDocument } | { ok: false; error: SaveErrorKey };

export async function saveCv(
  localeValue: string,
  documentId: string,
  changes: CvDocumentChanges,
): Promise<SaveCvResult> {
  const locale = toLocale(localeValue);
  try {
    const document = await updateCvDocument(documentId, changes);
    revalidatePath(`/${locale}/cvs`);
    return { ok: true, document };
  } catch (error) {
    redirectIfSignedOut(error, locale, `/cvs/${documentId}`);
    if (!(error instanceof ApiError)) console.error("Saving a CV failed", error);
    if (error instanceof ApiError && error.status === 422) return { ok: false, error: "invalid" };
    if (error instanceof ApiError && error.status === 429) return { ok: false, error: "rateLimited" };
    if (error instanceof ApiError && error.status === NETWORK_ERROR_STATUS) return { ok: false, error: "network" };
    return { ok: false, error: "generic" };
  }
}

export async function deleteCv(localeValue: string, documentId: string): Promise<{ ok: boolean }> {
  const locale = toLocale(localeValue);
  try {
    await deleteCvDocument(documentId);
  } catch (error) {
    redirectIfSignedOut(error, locale, "/cvs");
    return { ok: false };
  }
  revalidatePath(`/${locale}/cvs`);
  return { ok: true };
}

export type TailorErrorKey = "rateLimited" | "aiUnavailable" | "missing" | "network" | "generic";

/** Writes a CV for the posting of an analysis and opens it in the editor. */
export async function tailorCv(
  localeValue: string,
  analysisId: string,
  mode: TailoringMode,
): Promise<{ error: TailorErrorKey }> {
  const locale = toLocale(localeValue);
  let documentId: string;
  try {
    documentId = (await createTailoredCv(analysisId, mode)).id;
  } catch (error) {
    redirectIfSignedOut(error, locale, `/analyses/${analysisId}/cv`);
    if (!(error instanceof ApiError)) console.error("Tailoring a CV failed", error);
    const key = createErrorKey(error);
    return { error: key === "resumeMissing" ? "missing" : key };
  }
  revalidatePath(`/${locale}/cvs`);
  redirect(`/${locale}/cvs/${documentId}`);
}

export type AnswerResult = { ok: true; document: CvDocument } | { ok: false };

export async function answerQuestions(
  localeValue: string,
  documentId: string,
  answers: { id: string; accepted: boolean }[],
): Promise<AnswerResult> {
  const locale = toLocale(localeValue);
  try {
    const document = await answerCvQuestions(documentId, answers);
    revalidatePath(`/${locale}/cvs`);
    return { ok: true, document };
  } catch (error) {
    redirectIfSignedOut(error, locale, `/cvs/${documentId}`);
    if (!(error instanceof ApiError)) console.error("Answering CV questions failed", error);
    return { ok: false };
  }
}
