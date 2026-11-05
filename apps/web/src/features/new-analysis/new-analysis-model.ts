// Pure rules for the new-analysis screen: limits, client-side checks, API error mapping and the default CV.
// The API stays the authority; these checks only answer obvious mistakes before a round trip.

import type { Dictionary } from "@/i18n/dictionaries";
import { ApiError, NETWORK_ERROR_STATUS } from "@/lib/api/client";
import type { AnalysisSummary, JobDescriptionDraft, ResumeSummary } from "@/lib/api/types";

/** Mirrors the API: shorter documents are rejected, longer ones are cut to the limit. */
export const MIN_DOCUMENT_CHARS = 50;
export const MAX_DOCUMENT_CHARS = 30_000;
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

/** PDF and Word (.docx); the API tells them apart by content, so these only catch an obvious wrong pick. */
const UPLOAD_TYPES = [
  { mime: "application/pdf", extension: ".pdf" },
  { mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", extension: ".docx" },
];
export const UPLOAD_ACCEPT = UPLOAD_TYPES.flatMap(({ mime, extension }) => [mime, extension]).join(",");

export const NEW_RESUME = "new";

/** A saved CV as the picker shows it; the date is formatted on the server so both renders match. */
export interface ResumeOption extends ResumeSummary {
  createdAtLabel: string;
}

export type FieldName = "resumeTitle" | "resumeText" | "resumeFile" | "jobTitle" | "jobText";
export type FieldErrorKey = keyof Dictionary["newAnalysis"]["errors"];
export type FieldErrors = Partial<Record<FieldName, FieldErrorKey>>;

export interface StartAnalysisResult {
  formError: "unavailable" | "rateLimited" | "generic" | null;
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

export type NewResumeDraft = Pick<
  NewAnalysisDraft,
  "resumeSource" | "resumeTitle" | "resumeText" | "resumeFile"
>;

function checkDocument(text: string, missing: FieldErrorKey): FieldErrorKey | undefined {
  if (!text.trim()) return missing;
  if (text.trim().length < MIN_DOCUMENT_CHARS) return "tooShort";
  return undefined;
}

export function checkUpload(file: NewAnalysisDraft["resumeFile"]): FieldErrorKey | undefined {
  if (!file) return "fileMissing";
  const name = file.name.toLowerCase();
  const supported = UPLOAD_TYPES.some(({ mime, extension }) => file.type === mime || name.endsWith(extension));
  if (!supported) return "fileType";
  if (file.size > MAX_UPLOAD_BYTES) return "fileTooLarge";
  return undefined;
}

function withoutEmpty(errors: FieldErrors): FieldErrors {
  return Object.fromEntries(Object.entries(errors).filter(([, key]) => key)) as FieldErrors;
}

/** Checks a CV being added; the new-analysis and New CV screens share these rules. */
export function validateNewResume(draft: NewResumeDraft): FieldErrors {
  const errors: FieldErrors = {};
  if (!draft.resumeTitle.trim()) errors.resumeTitle = "resumeTitleMissing";
  if (draft.resumeSource === "paste") {
    errors.resumeText = checkDocument(draft.resumeText, "resumeTextMissing");
  } else {
    errors.resumeFile = checkUpload(draft.resumeFile);
  }
  return withoutEmpty(errors);
}

export function validateDraft(draft: NewAnalysisDraft): FieldErrors {
  const errors: FieldErrors = draft.resumeChoice === NEW_RESUME ? validateNewResume(draft) : {};
  if (!draft.jobTitle.trim()) errors.jobTitle = "jobTitleMissing";
  errors.jobText = checkDocument(draft.jobText, "jobTextMissing");
  return withoutEmpty(errors);
}

/** What picking a file changes: the file itself, and the CV's name while the user has not typed one. */
export function filePatch(file: File | null, currentTitle: string): Partial<NewResumeDraft> {
  if (!file) return { resumeFile: null };
  const resumeFile = { name: file.name, size: file.size, type: file.type };
  if (currentTitle.trim()) return { resumeFile };
  return { resumeFile, resumeTitle: file.name.replace(/\.[^.]+$/, "") };
}

const UPLOAD_ERRORS: Record<string, FieldErrorKey> = {
  file_too_large: "fileTooLarge",
  unsupported_file_type: "fileType",
  pdf_invalid: "pdfInvalid",
  pdf_encrypted: "pdfEncrypted",
  pdf_no_text: "pdfNoText",
  docx_invalid: "docxInvalid",
  docx_no_text: "docxNoText",
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
  if (error instanceof ApiError && error.status === 429) {
    result.formError = "rateLimited";
    return result;
  }
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

export type LinkErrorKey = keyof Dictionary["newAnalysis"]["link"]["errors"];

const LINK_ERRORS: Record<string, LinkErrorKey> = {
  link_invalid: "invalid",
  validation_failed: "invalid",
  link_not_allowed: "notAllowed",
  link_blocked: "blocked",
  link_not_found: "notFound",
  link_unreachable: "unreachable",
  link_no_posting: "noPosting",
  rate_limited: "tooMany",
};

/** The message for a failed fill; an unknown failure or an unreachable API gets the general "paste instead". */
export function linkErrorKey(error: unknown): LinkErrorKey {
  return (error instanceof ApiError && LINK_ERRORS[error.code]) || "unavailable";
}

/** "kariyer.net" for messages that name the site; null when the text is not a link. */
export function siteName(link: string): string | null {
  const trimmed = link.trim();
  if (!trimmed || /\s/.test(trimmed)) return null;
  try {
    const url = new URL(/^[a-z][a-z0-9+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`);
    return url.hostname.replace(/^www\./, "") || null;
  } catch {
    return null;
  }
}

/** All three posting fields replaced by what the link held, so the form shows that posting and nothing older. */
export function linkPatch(posting: JobDescriptionDraft): Pick<NewAnalysisDraft, "jobTitle" | "company" | "jobText"> {
  return { jobTitle: posting.title ?? "", company: posting.company ?? "", jobText: posting.text };
}

/** What the start card names before the user starts; null where the draft does not say yet. */
export interface ComparisonSummary {
  resume: string | null;
  posting: string | null;
}

export function comparisonSummary(
  draft: NewAnalysisDraft,
  resumes: Pick<ResumeSummary, "id" | "title">[],
): ComparisonSummary {
  const resume =
    draft.resumeChoice === NEW_RESUME
      ? draft.resumeTitle.trim()
      : (resumes.find((saved) => saved.id === draft.resumeChoice)?.title ?? "");
  const jobTitle = draft.jobTitle.trim();
  const company = draft.company.trim();
  return {
    resume: resume || null,
    posting: jobTitle ? [jobTitle, company].filter(Boolean).join(" · ") : null,
  };
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
