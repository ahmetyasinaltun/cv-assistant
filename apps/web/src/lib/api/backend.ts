// Typed calls to the API resources the web client uses; authenticated calls take the token from the session cookie.

import { getSessionToken } from "@/lib/auth/session";

import { apiRequest } from "./client";
import type {
  AnalysisDetail,
  AnalysisSummary,
  InterviewQuestion,
  JobDescriptionDraft,
  JobDescriptionSummary,
  Language,
  ResumeSummary,
  SampleAnalysisInput,
  TokenResponse,
  User,
} from "./types";

type AuthedOptions = Omit<NonNullable<Parameters<typeof apiRequest>[1]>, "token">;

async function authed<T>(path: string, options: AuthedOptions = {}): Promise<T> {
  return apiRequest<T>(path, { ...options, token: await getSessionToken() });
}

const segment = encodeURIComponent;

export function login(email: string, password: string) {
  return apiRequest<TokenResponse>("/auth/login", { method: "POST", json: { email, password } });
}

export function register(fullName: string, email: string, password: string, preferredLanguage: Language) {
  return apiRequest<TokenResponse>("/auth/register", {
    method: "POST",
    json: { full_name: fullName, email, password, preferred_language: preferredLanguage },
  });
}

export function getMe() {
  return authed<User>("/me");
}

export function updatePreferredLanguage(language: Language) {
  return authed<User>("/me", { method: "PATCH", json: { preferred_language: language } });
}

export function getSampleInput() {
  return apiRequest<SampleAnalysisInput>("/samples/analysis-input");
}

export function listResumes() {
  return authed<ResumeSummary[]>("/resumes");
}

export function createResumeFromText(title: string, text: string) {
  return authed<ResumeSummary>("/resumes", { method: "POST", json: { title, text } });
}

export function uploadResume(title: string, file: File) {
  const formData = new FormData();
  formData.set("title", title);
  formData.set("file", file);
  return authed<ResumeSummary>("/resumes/upload", { method: "POST", formData });
}

export function deleteResume(resumeId: string) {
  return authed<void>(`/resumes/${segment(resumeId)}`, { method: "DELETE" });
}

export function createJobDescription(title: string, company: string | null, text: string) {
  return authed<JobDescriptionSummary>("/job-descriptions", {
    method: "POST",
    json: { title, company, text },
  });
}

export function importJobDescription(url: string) {
  return authed<JobDescriptionDraft>("/job-descriptions/import", { method: "POST", json: { url } });
}

export function listAnalyses() {
  return authed<AnalysisSummary[]>("/analyses");
}

export function getAnalysis(analysisId: string) {
  return authed<AnalysisDetail>(`/analyses/${segment(analysisId)}`);
}

export function createAnalysis(resumeId: string, jobDescriptionId: string, outputLanguage: Language) {
  return authed<AnalysisSummary>("/analyses", {
    method: "POST",
    json: { resume_id: resumeId, job_description_id: jobDescriptionId, output_language: outputLanguage },
  });
}

export function generateInterviewQuestions(analysisId: string) {
  return authed<InterviewQuestion[]>(`/analyses/${segment(analysisId)}/interview-questions`, {
    method: "POST",
  });
}
