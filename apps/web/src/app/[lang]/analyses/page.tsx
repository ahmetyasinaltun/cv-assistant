// Analyses list, the signed-in home: every analysis newest first, with the way to start a new one.
// The title and the primary action are static, so they appear at once; the list streams in after them.

import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { primaryButtonClass } from "@/components/button-styles";
import { inlineLinkClass, textActionClass } from "@/components/form/field-styles";
import { PageHeader } from "@/components/PageHeader";
import { RefreshWhileRunning } from "@/components/RefreshWhileRunning";
import { AnalysisHistoryList, AnalysisHistorySkeleton } from "@/features/analyses-history/AnalysisHistoryList";
import { isInProgress } from "@/features/analyses-history/history-model";
import { getDictionary, getLocale } from "@/i18n/dictionaries";
import { listAnalyses } from "@/lib/api/backend";
import { requireUser } from "@/lib/auth/current-user";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).meta.titles.analyses };
}

async function AnalysesContent() {
  const [locale, dictionary] = await Promise.all([getLocale(), getDictionary()]);
  await requireUser(locale, `/${locale}/analyses`);
  const analyses = await listAnalyses();
  const labels = dictionary.history;

  if (analyses.length === 0) {
    return (
      <section aria-labelledby="empty-title" className="max-w-[720px] bg-paper px-6 py-7 shadow-sheet sm:px-8">
        <h2 id="empty-title" className="text-[20px] font-semibold tracking-[-0.01em]">
          {labels.empty.title}
        </h2>
        <p className="mt-2 max-w-[60ch] text-ink-soft">{labels.empty.body}</p>
        <p className="mt-4 text-ink-soft">
          {labels.empty.tryPrompt}{" "}
          <Link href={`/${locale}/analyses/new?sample=1`} className={inlineLinkClass}>
            {labels.empty.tryLink}
          </Link>
        </p>
        <p className="mt-5 text-[13px] text-mute">
          {labels.empty.samplePrompt}{" "}
          <Link href={`/${locale}/analyses/sample`} className={textActionClass}>
            {labels.empty.sampleLink}
          </Link>
        </p>
      </section>
    );
  }

  return (
    <>
      <RefreshWhileRunning active={analyses.some((analysis) => isInProgress(analysis.status))} />
      <AnalysisHistoryList
        analyses={analyses}
        locale={locale}
        labels={labels}
        fitLabels={dictionary.result.fit}
      />
    </>
  );
}

export default async function AnalysesPage() {
  const [locale, dictionary] = await Promise.all([getLocale(), getDictionary()]);

  return (
    <main id="main" className="mx-auto max-w-[1520px] px-4 pb-24 sm:px-6">
      <PageHeader
        title={dictionary.history.title}
        action={
          <Link href={`/${locale}/analyses/new`} className={primaryButtonClass}>
            {dictionary.history.newAnalysis}
          </Link>
        }
      />
      <Suspense fallback={<AnalysisHistorySkeleton />}>
        <AnalysesContent />
      </Suspense>
    </main>
  );
}
