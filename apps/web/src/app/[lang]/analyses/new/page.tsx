// New analysis: pick or add a CV, paste a posting, start. `?sample=1` fills both with the fictional sample.
// The title row is static; the sheets stream in once the saved CVs are known.

import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { textActionClass } from "@/components/form/field-styles";
import { PageHeader } from "@/components/PageHeader";
import { SampleNotice } from "@/components/SampleNotice";
import { NewAnalysisForm } from "@/features/new-analysis/NewAnalysisForm";
import {
  NEW_RESUME,
  analysesPerResume,
  defaultResumeChoice,
  type NewAnalysisDraft,
} from "@/features/new-analysis/new-analysis-model";
import { getDictionary, getLocale } from "@/i18n/dictionaries";
import { getSampleInput, listAnalyses, listResumes } from "@/lib/api/backend";
import { requireUser } from "@/lib/auth/current-user";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).meta.titles.newAnalysis };
}

const EMPTY_DRAFT: Omit<NewAnalysisDraft, "resumeChoice"> = {
  resumeSource: "paste",
  resumeTitle: "",
  resumeText: "",
  resumeFile: null,
  jobTitle: "",
  company: "",
  jobText: "",
};

async function NewAnalysisContent({ searchParams }: PageProps<"/[lang]/analyses/new">) {
  const [locale, dictionary, query] = await Promise.all([getLocale(), getDictionary(), searchParams]);
  await requireUser(locale, `/${locale}/analyses/new`);
  const [resumes, analyses, sample] = await Promise.all([
    listResumes(),
    listAnalyses(),
    query.sample === "1" ? getSampleInput() : null,
  ]);
  const labels = dictionary.newAnalysis;
  const dateFormat = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });
  const resumeOptions = resumes.map((resume) => ({
    ...resume,
    createdAtLabel: dateFormat.format(new Date(resume.created_at)),
  }));

  // Reuse the sample CV if an earlier sample run saved it, so repeated clicks do not pile up copies.
  const savedSampleResume = sample && resumes.find((resume) => resume.title === sample.resume.title);
  const initialDraft: NewAnalysisDraft = sample
    ? {
        ...EMPTY_DRAFT,
        resumeChoice: savedSampleResume ? savedSampleResume.id : NEW_RESUME,
        resumeTitle: savedSampleResume ? "" : sample.resume.title,
        resumeText: savedSampleResume ? "" : sample.resume.text,
        jobTitle: sample.job_description.title,
        company: sample.job_description.company ?? "",
        jobText: sample.job_description.text,
      }
    : { ...EMPTY_DRAFT, resumeChoice: defaultResumeChoice(analyses, resumes.map((resume) => resume.id)) };

  return (
    <>
      {sample && <SampleNotice className="mb-6">{labels.sampleFilled}</SampleNotice>}
      <NewAnalysisForm
        // The sample link swaps the starting values, so the form starts over instead of keeping old state.
        key={sample ? "sample" : "blank"}
        resumes={resumeOptions}
        analysisCounts={analysesPerResume(analyses)}
        initialDraft={initialDraft}
        locale={locale}
        labels={labels}
      />
    </>
  );
}

/** Two blank sheets in the form's layout while the saved CVs load. */
function SheetsSkeleton() {
  return (
    <div aria-busy="true" className="grid gap-7 lg:grid-cols-2 lg:gap-8">
      <div className="min-h-80 bg-paper shadow-sheet" />
      <div className="min-h-80 bg-paper shadow-sheet" />
    </div>
  );
}

export default async function NewAnalysisPage(props: PageProps<"/[lang]/analyses/new">) {
  const [locale, dictionary] = await Promise.all([getLocale(), getDictionary()]);
  const labels = dictionary.newAnalysis;

  return (
    <main id="main" className="mx-auto max-w-[1520px] px-4 pb-24 sm:px-6">
      <PageHeader
        title={labels.title}
        meta={labels.intro}
        action={
          <Link href={`/${locale}/analyses/new?sample=1`} className={textActionClass}>
            {labels.fillSample}
          </Link>
        }
      />
      <Suspense fallback={<SheetsSkeleton />}>
        <NewAnalysisContent {...props} />
      </Suspense>
    </main>
  );
}
