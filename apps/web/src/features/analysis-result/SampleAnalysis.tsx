"use client";

// Sample analysis wrapper: renders the result screen with fictional data and a preview of each async state.
// Question generation is simulated with a short delay because the sample has no account or API call behind it.

import type { Dictionary } from "@/i18n/dictionaries";
import type { AnalysisDetail } from "@/lib/api/types";

import { AnalysisResultView } from "./AnalysisResultView";
import { sampleAnalysis, sampleInterviewQuestions } from "./sample-analysis";
import type { SamplePreview } from "./sample-previews";

const SIMULATED_GENERATION_MS = 1200;

function analysisForPreview(preview: SamplePreview | null): AnalysisDetail {
  switch (preview) {
    case "pending":
    case "running":
      return { ...sampleAnalysis, status: preview, result: null, score: null, fit_level: null, completed_at: null, interview_questions: null };
    case "failed":
      return {
        ...sampleAnalysis,
        status: "failed",
        result: null,
        score: null,
        fit_level: null,
        completed_at: null,
        interview_questions: null,
        error_code: "ai_provider_error",
        error_message: "The AI provider timed out after 2 retries.",
      };
    case "no-questions":
    case "questions-error":
      return { ...sampleAnalysis, interview_questions: null };
    default:
      return sampleAnalysis;
  }
}

interface SampleAnalysisProps {
  preview: SamplePreview | null;
  labels: Dictionary["result"];
  locale: string;
  createdAtLabel: string;
  sampleHref: string;
}

export function SampleAnalysis({ preview, labels, locale, createdAtLabel, sampleHref }: SampleAnalysisProps) {
  const generateQuestions = () =>
    new Promise<typeof sampleInterviewQuestions>((resolve, reject) =>
      window.setTimeout(
        () =>
          preview === "questions-error"
            ? reject(new Error("Simulated generation failure"))
            : resolve(sampleInterviewQuestions),
        SIMULATED_GENERATION_MS,
      ),
    );

  return (
    <AnalysisResultView
      analysis={analysisForPreview(preview)}
      labels={labels}
      locale={locale}
      createdAtLabel={createdAtLabel}
      isSample
      generateQuestions={generateQuestions}
      retryHref={sampleHref}
    />
  );
}
