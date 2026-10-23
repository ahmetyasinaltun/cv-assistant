// TypeScript mirror of the analysis API contract defined by services/api/app/schemas/analysis.py.

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

export interface AnalysisDetail {
  id: string;
  status: AnalysisStatus;
  resume_id: string;
  job_description_id: string;
  resume_title: string;
  job_title: string;
  company: string | null;
  score: number | null;
  fit_level: FitLevel | null;
  created_at: string;
  completed_at: string | null;
  result: AnalysisResult | null;
  interview_questions: InterviewQuestion[] | null;
  error_message: string | null;
}
