// Sample analysis page: lets first-time visitors and reviewers see a real result without an account.
// `?preview=` shows the other states of the screen (pending, running, failed, questions not generated or failing).

import { Suspense } from "react";

import { getDictionary, getLocale } from "@/i18n/dictionaries";
import { sampleAnalysis } from "@/features/analysis-result/sample-analysis";
import { SampleAnalysis } from "@/features/analysis-result/SampleAnalysis";
import { parseSamplePreview } from "@/features/analysis-result/sample-previews";

async function SampleAnalysisContent({ searchParams }: PageProps<"/[lang]/analyses/sample">) {
  const [locale, dictionary, query] = await Promise.all([getLocale(), getDictionary(), searchParams]);
  const createdAtLabel = new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(
    new Date(sampleAnalysis.created_at),
  );

  return (
    <SampleAnalysis
      preview={parseSamplePreview(query.preview)}
      labels={dictionary.result}
      locale={locale}
      createdAtLabel={createdAtLabel}
      sampleHref={`/${locale}/analyses/sample`}
    />
  );
}

export default function SampleAnalysisPage(props: PageProps<"/[lang]/analyses/sample">) {
  return (
    <Suspense fallback={<main id="main" aria-busy="true" className="min-h-[60vh]" />}>
      <SampleAnalysisContent {...props} />
    </Suspense>
  );
}
