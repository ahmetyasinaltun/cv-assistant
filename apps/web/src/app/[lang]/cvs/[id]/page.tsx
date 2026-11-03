// CV editor page: loads one CV document and opens it in the editor. `?imported=` carries the one-time note after
// importing a saved CV. The band and the editor arrive together, because the band shows the CV's own title.

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { CvEditor } from "@/features/cv-documents/CvEditor";
import { decodeImportNotice } from "@/features/cv-documents/import-notice";
import { getDictionary, getLocale } from "@/i18n/dictionaries";
import { getAnalysis, getCvDocument } from "@/lib/api/backend";
import { ApiError } from "@/lib/api/client";
import { requireUser } from "@/lib/auth/current-user";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).meta.titles.cv };
}

async function EditorContent({ params, searchParams }: PageProps<"/[lang]/cvs/[id]">) {
  const [locale, dictionary, { id }, query] = await Promise.all([
    getLocale(),
    getDictionary(),
    params,
    searchParams,
  ]);
  const user = await requireUser(locale, `/${locale}/cvs/${id}`);
  let document;
  try {
    document = await getCvDocument(id);
  } catch (error) {
    // Another user's CV answers 404 too, so a guessed address shows nothing.
    if (error instanceof ApiError && (error.status === 404 || error.status === 422)) notFound();
    throw error;
  }
  const posting = document.analysis_id ? await postingOf(locale, document.analysis_id) : null;

  return (
    <CvEditor
      // A different CV starts the editor over instead of carrying over the previous one's state.
      key={document.id}
      document={document}
      locale={locale}
      fallbackName={user.full_name}
      importNotice={decodeImportNotice(query.imported)}
      posting={posting}
      labels={dictionary.cvs}
    />
  );
}

/** The posting a tailored CV was written for; null once its analysis is gone (the CV outlives it). */
async function postingOf(locale: string, analysisId: string) {
  try {
    const analysis = await getAnalysis(analysisId);
    const title = analysis.company ? `${analysis.job_title} · ${analysis.company}` : analysis.job_title;
    return { title, href: `/${locale}/analyses/${analysisId}` };
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

function EditorSkeleton() {
  return (
    <main id="main" aria-busy="true" className="pb-24">
      <div className="h-[220px] bg-brand sm:h-[236px]" />
      <div className="mx-auto max-w-[1280px] px-4 sm:px-8">
        <div className="relative -mt-[76px] grid gap-6 sm:-mt-[84px] lg:grid-cols-[minmax(0,1fr)_minmax(0,1.08fr)]">
          <div className="h-96 rounded-card border border-rule bg-paper shadow-sheet" />
          <div className="hidden h-[640px] rounded-card border border-rule bg-paper shadow-sheet lg:block" />
        </div>
      </div>
    </main>
  );
}

export default function CvEditorPage(props: PageProps<"/[lang]/cvs/[id]">) {
  return (
    <Suspense fallback={<EditorSkeleton />}>
      <EditorContent {...props} />
    </Suspense>
  );
}
