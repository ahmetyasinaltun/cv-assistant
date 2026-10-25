// Pure rules for the new-analysis screen: limits, client-side checks, API error mapping and the default CV.
// The API stays the authority; these checks only answer obvious mistakes before a round trip.

import type { Dictionary } from "@/i18n/dictionaries";
import { ApiError, NETWORK_ERROR_STATUS } from "@/lib/api/client";
import type { AnalysisSummary, ResumeSummary } from "@/lib/api/types";

/** Mirrors the API: shorter documents are rejected, longer ones are cut to the limit. */
export const MIN_DOCUMENT_CHARS = 50;
export const MAX_DOCUMENT_CHARS = 30_000;
export const MAX_PDF_BYTES = 5 * 1024 * 1024;

export const NEW_RESUME = "new";

/** A saved CV as the picker shows it; the date is formatted on the server so both renders match. */
export interface ResumeOption extends ResumeSummary {
  createdAtLabel: string;
}

export type FieldName = "resumeTitle" | "resumeText" | "resumeFile" | "jobTitle" | "jobText";
export type FieldErrorKey = keyof Dictionary["newAnalysis"]["errors"];
export type FieldErrors = Partial<Record<FieldName, FieldErrorKey>>;

export interface StartAnalysisResult {
  formError: "unavailable" | "generic" | null;
  fieldErrors: FieldErrors;
  /** A CV saved before a later step failed; the form selects it so a retry does not save it twice. */
  savedResumeId: string | null;
}

export interface NewAnalysisDraft {
  resumeChoice: string;
  resumeSource: "paste" | "upload";
  resumeTitle: string;
  resumeText: string;
  resumeFile: { name: string; size: number; type: string } | null;
  jobTitle: string;
  company: string;
  jobText: string;
}

function checkDocument(text: string, missing: FieldErrorKey): FieldErrorKey | undefined {
  if (!text.trim()) return missing;
  if (text.trim().length < MIN_DOCUMENT_CHARS) return "tooShort";
  return undefined;
}

export function checkPdf(file: NewAnalysisDraft["resumeFile"]): FieldErrorKey | undefined {
  if (!file) return "fileMissing";
  const looksLikePdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  if (!looksLikePdf) return "fileType";
  if (file.size > MAX_PDF_BYTES) return "fileTooLarge";
  return undefined;
}

export function validateDraft(draft: NewAnalysisDraft): FieldErrors {
  const errors: FieldErrors = {};
  if (draft.resumeChoice === NEW_RESUME) {
    if (!draft.resumeTitle.trim()) errors.resumeTitle = "resumeTitleMissing";
    if (draft.resumeSource === "paste") {
      errors.resumeText = checkDocument(draft.resumeText, "resumeTextMissing");
    } else {
      errors.resumeFile = checkPdf(draft.resumeFile);
    }
  }
  if (!draft.jobTitle.trim()) errors.jobTitle = "jobTitleMissing";
  errors.jobText = checkDocument(draft.jobText, "jobTextMissing");
  return Object.fromEntries(Object.entries(errors).filter(([, key]) => key)) as FieldErrors;
}

const UPLOAD_ERRORS: Record<string, FieldErrorKey> = {
  file_too_large: "fileTooLarge",
  unsupported_file_type: "fileType",
  pdf_invalid: "pdfInvalid",
  pdf_encrypted: "pdfEncrypted",
  pdf_no_text: "pdfNoText",
  document_too_short: "pdfNoText",
};

/** Which step of starting an analysis failed decides which field the API error belongs to. */
export type SubmitStep = "resumeText" | "resumeUpload" | "jobDescription" | "analysis";

export function submitErrorResult(
  step: SubmitStep,
  error: unknown,
  savedResumeId: string | null,
): StartAnalysisResult {
  const result: StartAnalysisResult = { formError: null, fieldErrors: {}, savedResumeId };
  if (error instanceof ApiError && error.status === 422) {
    if (step === "resumeUpload") result.fieldErrors.resumeFile = UPLOAD_ERRORS[error.code] ?? "pdfInvalid";
    else if (step === "resumeText") result.fieldErrors.resumeText = "tooShort";
    else if (step === "jobDescription") result.fieldErrors.jobText = "tooShort";
    else result.formError = "generic";
    return result;
  }
  const unreachable =
    error instanceof ApiError && (error.status === NETWORK_ERROR_STATUS || error.status >= 500);
  result.formError = unreachable ? "unavailable" : "generic";
  return result;
}

/** How many analyses were made with each CV; deleting a CV deletes these too. */
export function analysesPerResume(analyses: AnalysisSummary[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const analysis of analyses) {
    counts.set(analysis.resume_id, (counts.get(analysis.resume_id) ?? 0) + 1);
  }
  return counts;
}

/** The CV used most recently (analyses arrive newest first), else the newest saved CV, else a new one. */
export function defaultResumeChoice(analyses: AnalysisSummary[], resumeIds: string[]): string {
  const available = new Set(resumeIds);
  const used = analyses.find((analysis) => available.has(analysis.resume_id));
  return used?.resume_id ?? resumeIds[0] ?? NEW_RESUME;
}
