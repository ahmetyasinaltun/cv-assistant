// Unit tests for the new-analysis rules, the history row outcome and the auth error mapping.

import { describe, expect, it } from "vitest";

import { rowOutcome } from "@/features/analyses-history/history-model";
import { authErrorKey } from "@/features/auth/auth-errors";
import { ApiError, NETWORK_ERROR_STATUS } from "@/lib/api/client";
import type { AnalysisSummary } from "@/lib/api/types";

import {
  MAX_PDF_BYTES,
  NEW_RESUME,
  analysesPerResume,
  checkPdf,
  comparisonSummary,
  defaultResumeChoice,
  linkErrorKey,
  linkPatch,
  siteName,
  submitErrorResult,
  validateDraft,
  type NewAnalysisDraft,
} from "./new-analysis-model";

const POSTING = "Junior Backend Developer. Requirements: Python, SQL, Docker, code review.";

const draft = (patch: Partial<NewAnalysisDraft> = {}): NewAnalysisDraft => ({
  resumeChoice: "resume-1",
  resumeSource: "paste",
  resumeTitle: "",
  resumeText: "",
  resumeFile: null,
  jobTitle: "Junior Backend Developer",
  company: "",
  jobText: POSTING,
  ...patch,
});

function analysis(patch: Partial<AnalysisSummary>): AnalysisSummary {
  return {
    id: "a1",
    status: "completed",
    output_language: "en",
    resume_id: "resume-1",
    job_description_id: "job-1",
    resume_title: "CV",
    job_title: "Developer",
    company: null,
    score: 72,
    fit_level: "moderate",
    created_at: "2026-10-25T10:00:00Z",
    completed_at: "2026-10-25T10:01:00Z",
    ...patch,
  };
}

describe("validateDraft", () => {
  it("accepts a saved CV with a complete posting", () => {
    expect(validateDraft(draft())).toEqual({});
  });

  it("asks for the new CV's name and text, and for a long enough posting", () => {
    const errors = validateDraft(draft({ resumeChoice: NEW_RESUME, jobTitle: " ", jobText: "Too short" }));
    expect(errors).toEqual({
      resumeTitle: "resumeTitleMissing",
      resumeText: "resumeTextMissing",
      jobTitle: "jobTitleMissing",
      jobText: "tooShort",
    });
  });

  it("checks the file instead of the text when uploading", () => {
    const errors = validateDraft(
      draft({ resumeChoice: NEW_RESUME, resumeTitle: "CV", resumeSource: "upload" }),
    );
    expect(errors).toEqual({ resumeFile: "fileMissing" });
  });
});

describe("checkPdf", () => {
  it("rejects files that are not PDFs or are too large", () => {
    expect(checkPdf({ name: "cv.docx", size: 1000, type: "application/msword" })).toBe("fileType");
    expect(checkPdf({ name: "cv.pdf", size: MAX_PDF_BYTES + 1, type: "application/pdf" })).toBe("fileTooLarge");
    expect(checkPdf({ name: "CV.PDF", size: 1000, type: "" })).toBeUndefined();
  });
});

describe("submitErrorResult", () => {
  it("puts API validation errors on the field of the failing step", () => {
    const upload = submitErrorResult("resumeUpload", new ApiError(422, "pdf_no_text", ""), null);
    expect(upload.fieldErrors).toEqual({ resumeFile: "pdfNoText" });
    const job = submitErrorResult("jobDescription", new ApiError(422, "validation_failed", ""), "r9");
    expect(job).toEqual({ formError: null, fieldErrors: { jobText: "tooShort" }, savedResumeId: "r9" });
  });

  it("reports an unreachable API separately from other failures", () => {
    const offline = submitErrorResult("analysis", new ApiError(NETWORK_ERROR_STATUS, "network_error", ""), null);
    expect(offline.formError).toBe("unavailable");
    expect(submitErrorResult("analysis", new Error("boom"), null).formError).toBe("generic");
  });
});

describe("filling from a link", () => {
  it("maps each API code to its message and anything unexpected to a general one", () => {
    expect(linkErrorKey(new ApiError(502, "link_blocked", ""))).toBe("blocked");
    expect(linkErrorKey(new ApiError(422, "link_no_posting", ""))).toBe("noPosting");
    expect(linkErrorKey(new ApiError(422, "link_invalid", ""))).toBe("invalid");
    expect(linkErrorKey(new ApiError(422, "validation_failed", ""))).toBe("invalid");
    expect(linkErrorKey(new ApiError(NETWORK_ERROR_STATUS, "network_error", ""))).toBe("unavailable");
    expect(linkErrorKey(new ApiError(500, "http_500", ""))).toBe("unavailable");
    expect(linkErrorKey(new Error("boom"))).toBe("unavailable");
  });

  it("names the site by its host without www, and nothing for text that is not a link", () => {
    expect(siteName("https://www.kariyer.net/is-ilani/x-1")).toBe("kariyer.net");
    expect(siteName("tr.linkedin.com/jobs/view/1")).toBe("tr.linkedin.com");
    expect(siteName("not a link")).toBeNull();
  });

  it("replaces all three posting fields with what the link held, emptying the ones it lacks", () => {
    const posting = { title: null, company: "SafeSpeech", text: POSTING, source_url: "https://www.linkedin.com/posts/x" };
    expect(linkPatch(posting)).toEqual({ jobTitle: "", company: "SafeSpeech", jobText: POSTING });
  });
});

describe("comparisonSummary", () => {
  const saved = [{ id: "resume-1", title: "CV, October 2026" }];

  it("names the saved CV that is picked and the posting with its company", () => {
    expect(comparisonSummary(draft({ company: " Acme " }), saved)).toEqual({
      resume: "CV, October 2026",
      posting: "Junior Backend Developer · Acme",
    });
  });

  it("uses the typed name of a new CV and leaves out a missing company", () => {
    expect(comparisonSummary(draft({ resumeChoice: NEW_RESUME, resumeTitle: " My CV " }), saved)).toEqual({
      resume: "My CV",
      posting: "Junior Backend Developer",
    });
  });

  it("reports what is not given yet as null", () => {
    expect(comparisonSummary(draft({ resumeChoice: NEW_RESUME, jobTitle: "  " }), saved)).toEqual({
      resume: null,
      posting: null,
    });
  });
});

describe("CV choice and counts", () => {
  const analyses = [
    analysis({ id: "a3", resume_id: "resume-2" }),
    analysis({ id: "a2", resume_id: "resume-1" }),
    analysis({ id: "a1", resume_id: "resume-2" }),
  ];

  it("counts analyses per CV", () => {
    expect(analysesPerResume(analyses)).toEqual(new Map([["resume-2", 2], ["resume-1", 1]]));
  });

  it("prefers the most recently used CV, then the newest saved one, then a new one", () => {
    expect(defaultResumeChoice(analyses, ["resume-1", "resume-2"])).toBe("resume-2");
    expect(defaultResumeChoice([], ["resume-1", "resume-2"])).toBe("resume-1");
    expect(defaultResumeChoice(analyses, [])).toBe(NEW_RESUME);
  });
});

describe("rowOutcome", () => {
  it("shows the fit and score of a completed analysis", () => {
    expect(rowOutcome(analysis({}))).toEqual({ kind: "result", fitLevel: "moderate", score: 72 });
  });

  it("shows progress and failure, and never a score of zero for a missing result", () => {
    expect(rowOutcome(analysis({ status: "running", score: null, fit_level: null }))).toEqual({
      kind: "progress",
      status: "running",
    });
    expect(rowOutcome(analysis({ status: "failed", score: null, fit_level: null }))).toEqual({ kind: "failed" });
    expect(rowOutcome(analysis({ score: null }))).toEqual({ kind: "failed" });
  });
});

describe("authErrorKey", () => {
  it("maps the API's auth error codes to form messages", () => {
    expect(authErrorKey(new ApiError(401, "invalid_credentials", ""))).toBe("invalidCredentials");
    expect(authErrorKey(new ApiError(409, "email_taken", ""))).toBe("emailTaken");
    expect(authErrorKey(new ApiError(422, "validation_failed", ""))).toBe("invalidInput");
    expect(authErrorKey(new ApiError(503, "http_503", ""))).toBe("unavailable");
    expect(authErrorKey(new TypeError("x"))).toBe("generic");
  });
});
