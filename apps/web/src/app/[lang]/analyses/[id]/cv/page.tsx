// A CV for the posting of one analysis: choose how freely the AI may write, then write it. The band names the
// posting and the language the CV will be written in (the posting's own).

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { BandPage } from "@/components/BandPage";
import { TailorForm } from "@/features/cv-documents/TailorForm";
import { getDictionary, getLocale } from "@/i18n/dictionaries";
import { getAnalysis } from "@/lib/api/backend";
import { ApiError } from "@/lib/api/client";
import { requireUser } from "@/lib/auth/current-user";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).meta.titles.tailorCv };
}

/** Loads the analysis to name its posting; only a completed analysis can have a CV written for it. */
async function TailorContent({ params }: PageProps<"/[lang]/analyses/[id]/cv">) {
  const [locale, dictionary, { id }] = await Promise.all([getLocale(), getDictionary(), params]);
  await requireUser(locale, `/${locale}/analyses/${id}/cv`);
  let analysis;
  try {
    analysis = await getAnalysis(id);
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 422)) notFound();
    throw error;
  }
  const labels = dictionary.cvs.tailor.page;
  const job = analysis.company ? `${analysis.job_title} · ${analysis.company}` : analysis.job_title;
  const backLink = (
    <Link
      href={`/${locale}/analyses/${id}`}
      className="underline decoration-white/30 underline-offset-[3px] transition-colors duration-150 hover:text-on-brand hover:decoration-white/70"
    >
      {analysis.job_title}
    </Link>
  );

  return (
    <BandPage title={labels.title} breadcrumb={backLink} meta={job}>
      {analysis.status === "completed" ? (
        <TailorForm analysisId={id} locale={locale} labels={labels} />
      ) : (
        <p className="max-w-[760px] rounded-card border border-rule bg-paper px-6 py-7 shadow-sheet">
          {labels.notCompleted}
        </p>
      )}
    </BandPage>
  );
}

export default function TailorCvPage(props: PageProps<"/[lang]/analyses/[id]/cv">) {
  return (
    <Suspense fallback={<main id="main" aria-busy="true" className="h-[300px] bg-brand" />}>
      <TailorContent {...props} />
    </Suspense>
  );
}
