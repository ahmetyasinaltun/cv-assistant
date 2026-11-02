// New CV: turn a saved CV into an editable one, or start a blank CV. The band is static; the saved CVs stream in.

import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { BandPage } from "@/components/BandPage";
import { NewCvForms, type SavedResumeOption } from "@/features/cv-documents/NewCvForms";
import { getDictionary, getLocale } from "@/i18n/dictionaries";
import { pluralize } from "@/i18n/format";
import { listResumes } from "@/lib/api/backend";
import { requireUser } from "@/lib/auth/current-user";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).meta.titles.newCv };
}

async function NewCvContent() {
  const [locale, dictionary] = await Promise.all([getLocale(), getDictionary()]);
  const user = await requireUser(locale, `/${locale}/cvs/new`);
  const resumes = await listResumes();
  const resumeLabels = dictionary.newAnalysis.resume;
  const dateFormat = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });
  const options: SavedResumeOption[] = resumes.map((resume) => ({
    id: resume.id,
    title: resume.title,
    meta: [
      resume.source_type === "pdf"
        ? resumeLabels.pdf
        : resume.source_type === "docx"
          ? resumeLabels.word
          : resumeLabels.text,
      pluralize(locale, resume.character_count, resumeLabels.characters),
      dateFormat.format(new Date(resume.created_at)),
    ].join(" · "),
  }));

  return (
    <NewCvForms
      resumes={options}
      locale={locale}
      defaultTitle={user.full_name}
      defaultLanguage={locale}
      labels={dictionary.cvs}
    />
  );
}

export default async function NewCvPage() {
  const [locale, dictionary] = await Promise.all([getLocale(), getDictionary()]);

  return (
    <BandPage
      title={dictionary.cvs.new.title}
      meta={dictionary.cvs.new.meta}
      breadcrumb={
        <Link
          href={`/${locale}/cvs`}
          className="underline decoration-white/30 underline-offset-[3px] transition-colors duration-150 hover:text-on-brand hover:decoration-white/70"
        >
          {dictionary.cvs.list.title}
        </Link>
      }
    >
      <Suspense fallback={<div className="h-80 rounded-card border border-rule bg-paper shadow-sheet" />}>
        <NewCvContent />
      </Suspense>
    </BandPage>
  );
}
