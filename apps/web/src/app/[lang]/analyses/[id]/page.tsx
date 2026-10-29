// A real analysis result: polls while the analysis runs, then shows the result screen with live actions.

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { RefreshWhileRunning } from "@/components/RefreshWhileRunning";
import { isInProgress } from "@/features/analyses-history/history-model";
import { generateQuestionsForAnalysis, rerunAnalysis } from "@/features/analysis-result/actions";
import { AnalysisResultView } from "@/features/analysis-result/AnalysisResultView";
import { getDictionary, getLocale } from "@/i18n/dictionaries";
import { getAnalysis } from "@/lib/api/backend";
import { ApiError } from "@/lib/api/client";
import type { AnalysisDetail } from "@/lib/api/types";
import { requireUser } from "@/lib/auth/current-user";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).meta.titles.analysis };
}

async function loadAnalysis(analysisId: string): Promise<AnalysisDetail> {
  try {
    return await getAnalysis(analysisId);
  } catch (error) {
    // 404: not this user's analysis (or none at all); 422: the id is not even a valid UUID.
    if (error instanceof ApiError && (error.status === 404 || error.status === 422)) notFound();
    throw error;
  }
}

async function AnalysisContent({ params }: PageProps<"/[lang]/analyses/[id]">) {
  const [{ id }, locale, dictionary] = await Promise.all([params, getLocale(), getDictionary()]);
  await requireUser(locale, `/${locale}/analyses/${id}`);
  const analysis = await loadAnalysis(id);
  const createdAtLabel = new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(
    new Date(analysis.created_at),
  );

  return (
    <>
      <RefreshWhileRunning active={isInProgress(analysis.status)} />
      <AnalysisResultView
        // A new status remounts the view, so the default selection is chosen once the result arrives.
        key={analysis.status}
        analysis={analysis}
        labels={dictionary.result}
        locale={locale}
        createdAtLabel={createdAtLabel}
        generateQuestions={generateQuestionsForAnalysis.bind(null, analysis.id)}
        retryAction={rerunAnalysis.bind(null, locale, analysis.id)}
        newAnalysisHref={`/${locale}/analyses/new`}
        backHref={`/${locale}/analyses`}
      />
    </>
  );
}

export default function AnalysisPage(props: PageProps<"/[lang]/analyses/[id]">) {
  return (
    <Suspense fallback={<main id="main" aria-busy="true" className="min-h-[60vh]" />}>
      <AnalysisContent {...props} />
    </Suspense>
  );
}
