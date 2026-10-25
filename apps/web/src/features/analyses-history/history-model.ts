// Pure helpers for the analyses list: which analyses are still running and how each row states its outcome.

import type { AnalysisStatus, AnalysisSummary, FitLevel } from "@/lib/api/types";

export function isInProgress(status: AnalysisStatus): boolean {
  return status === "pending" || status === "running";
}

export type RowOutcome =
  | { kind: "result"; fitLevel: FitLevel; score: number }
  | { kind: "progress"; status: "pending" | "running" }
  | { kind: "failed" };

export function rowOutcome(analysis: AnalysisSummary): RowOutcome {
  if (analysis.status === "pending" || analysis.status === "running") {
    return { kind: "progress", status: analysis.status };
  }
  if (analysis.status === "completed" && analysis.fit_level && analysis.score !== null) {
    return { kind: "result", fitLevel: analysis.fit_level, score: analysis.score };
  }
  // A completed analysis without a stored score is treated like a failure rather than shown as 0.
  return { kind: "failed" };
}
