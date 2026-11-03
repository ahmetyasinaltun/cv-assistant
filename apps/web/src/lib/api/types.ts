// TypeScript mirror of the API contract defined by the Pydantic schemas in services/api/app/schemas/.

export type AnalysisStatus = "pending" | "running" | "completed" | "failed";
export type RequirementCategory =
  | "technical_skill"
  | "tool"
  | "experience"
  | "education"
  | "soft_skill"
  | "domain"
  | "other";
export type Importance = "must_have" | "nice_to_have";
export type MatchStatus = "matched" | "partial" | "missing";
export type FitLevel = "strong" | "moderate" | "weak";
export type SuggestionTarget = "skill" | "cv_section" | "project" | "interview_topic";
export type Priority = "high" | "medium" | "low";
export type QuestionCategory = "technical" | "behavioral" | "project" | "gap";
/** Account language and language of AI-written text; requirement wording and CV quotes keep their own. */
export type Language = "en" | "tr";

export interface EvidenceReference {
  evidence_id: string;
  /** Verbatim or near-verbatim excerpt from the resume. */
  quote: string;
  similarity: number;
}

export interface RequirementMatch {
  id: string;
  text: string;
  category: RequirementCategory;
  importance: Importance;
  status: MatchStatus;
  reasoning: string;
  evidence: EvidenceReference[];
}

export interface CandidateEvidence {
  id: string;
  text: string;
  section: string | null;
  skills: string[];
}

export interface Suggestion {
  title: string;
  detail: string;
  target: SuggestionTarget;
  priority: Priority;
  related_requirement_ids: string[];
}

export interface OverallMatch {
  score: number;
  fit_level: FitLevel;
  summary: string;
  score_explanation: string;
  limitations: string[];
}

export interface AnalysisResult {
  overall: OverallMatch;
  requirements: RequirementMatch[];
  candidate_evidence: CandidateEvidence[];
  suggestions: Suggestion[];
}

export interface InterviewQuestion {
  question: string;
  category: QuestionCategory;
  rationale: string;
  related_requirement_ids: string[];
}

export interface AnalysisSummary {
  id: string;
  status: AnalysisStatus;
  output_language: Language;
  resume_id: string;
  job_description_id: string;
  resume_title: string;
  job_title: string;
  company: string | null;
  score: number | null;
  fit_level: FitLevel | null;
  created_at: string;
  completed_at: string | null;
}

export interface AnalysisDetail extends AnalysisSummary {
  result: AnalysisResult | null;
  interview_questions: InterviewQuestion[] | null;
  /** Stable reason for a failure (e.g. "ai_quota_exhausted"); clients map it to localized text. */
  error_code: string | null;
  error_message: string | null;
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  preferred_language: Language;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: "bearer";
  user: User;
}

export interface ResumeSummary {
  id: string;
  title: string;
  source_type: "text" | "pdf" | "docx";
  original_filename: string | null;
  character_count: number;
  created_at: string;
}

export interface JobDescriptionSummary {
  id: string;
  title: string;
  company: string | null;
  character_count: number;
  created_at: string;
}

/** What a link held, to fill the posting fields; the API does not save it. */
export interface JobDescriptionDraft {
  title: string | null;
  company: string | null;
  text: string;
  /** The page the text was read from, after redirects (a short lnkd.in link ends on linkedin.com). */
  source_url: string;
}

export interface SampleAnalysisInput {
  resume: { title: string; text: string };
  job_description: { title: string; company: string | null; text: string };
}

// --- CV documents (services/api/app/cv/content.py and app/schemas/cv.py) -----------------------------

export type CvTemplateId = "classic" | "modern" | "standard";
export type CvSectionKey =
  | "summary"
  | "experience"
  | "education"
  | "projects"
  | "skills"
  | "languages"
  | "certificates";
/** Where a line came from; shown in the editor only, never printed. */
export type LineOrigin = "cv" | "ai_reworded" | "ai_embellished" | "ai_added" | "confirmed" | "user";

export interface CvLine {
  text: string;
  origin: LineOrigin;
  evidence_ids: string[];
}

export interface CvLink {
  url: string;
}

export interface CvContact {
  name: string;
  email: string | null;
  phone: string | null;
  location: string | null;
  links: CvLink[];
}

/** "2025" or "2025-06"; an end date may also be "present". */
export type CvDate = string | null;

export interface CvExperience {
  role: string;
  organization: string;
  location: string | null;
  start: CvDate;
  end: CvDate;
  bullets: CvLine[];
}

export interface CvEducation {
  degree: string;
  school: string;
  location: string | null;
  start: CvDate;
  end: CvDate;
  details: CvLine[];
}

export interface CvProject {
  name: string;
  link: CvLink | null;
  start: CvDate;
  end: CvDate;
  bullets: CvLine[];
}

export interface CvSkillGroup {
  name: string | null;
  items: CvLine[];
}

export interface CvLanguage {
  name: string;
  level: string | null;
}

export interface CvCertificate {
  name: string;
  issuer: string | null;
  date: CvDate;
}

export interface CvSection {
  key: CvSectionKey;
  visible: boolean;
}

export interface CvContent {
  contact: CvContact;
  headline: string | null;
  summary: CvLine[];
  experience: CvExperience[];
  education: CvEducation[];
  projects: CvProject[];
  skills: CvSkillGroup[];
  languages: CvLanguage[];
  certificates: CvCertificate[];
  sections: CvSection[];
}

export type TailoringMode = "flexible" | "strict";

export interface CvDocumentSummary {
  id: string;
  kind: "maker" | "tailored";
  title: string;
  language: Language;
  template: CvTemplateId;
  resume_id: string | null;
  analysis_id: string | null;
  tailoring_mode: TailoringMode | null;
  created_at: string;
  updated_at: string;
}

/** Strict mode asks before adding a claim; a yes adds the proposed line, marked as confirmed. */
export interface TailoringQuestion {
  id: string;
  question: string;
  kind: "experience" | "projects";
  entry_name: string;
  proposed_line: string;
  answer: boolean | null;
}

export interface CvDocument extends CvDocumentSummary {
  content: CvContent;
  questions: TailoringQuestion[];
}

export interface UnsupportedFact {
  kind: "role" | "organization" | "degree" | "school" | "date";
  value: string;
}

export interface CvDocumentFromResume extends CvDocument {
  unsupported_facts: UnsupportedFact[];
  omitted_sections: string[];
}
