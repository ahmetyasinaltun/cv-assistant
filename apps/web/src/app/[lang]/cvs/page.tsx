// My CVs: every CV document as a card with its first page, newest edit first, and the way to start a new one.
// The title and the primary action are static, so they appear at once; the cards stream in after them.

import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { BandPage } from "@/components/BandPage";
import { onBrandPrimaryButtonClass } from "@/components/button-styles";
import { CvList, type CvCardData } from "@/features/cv-documents/CvList";
import { getDictionary, getLocale } from "@/i18n/dictionaries";
import { interpolate } from "@/i18n/format";
import { listCvDocuments } from "@/lib/api/backend";
import { requireUser } from "@/lib/auth/current-user";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).meta.titles.cvs };
}

async function CvListContent() {
  const [locale, dictionary] = await Promise.all([getLocale(), getDictionary()]);
  await requireUser(locale, `/${locale}/cvs`);
  const documents = await listCvDocuments();
  const labels = dictionary.cvs;

  if (documents.length === 0) {
    return (
      <section
        aria-labelledby="empty-title"
        className="max-w-[760px] rounded-card border border-rule bg-paper px-6 py-7 shadow-sheet sm:px-8"
      >
        <h2 id="empty-title" className="text-[21px] font-bold tracking-[-0.015em]">
          {labels.list.empty.title}
        </h2>
        <p className="mt-2 max-w-[60ch] text-ink-soft">{labels.list.empty.body}</p>
      </section>
    );
  }

  const dateFormat = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });
  const cards: CvCardData[] = documents.map((document) => ({
    id: document.id,
    title: document.title,
    meta: [
      labels.languageNames[document.language],
      labels.templates[document.template],
      ...(document.kind === "tailored" ? [labels.tailor.listTailored] : []),
    ].join(" · "),
    editedLabel: interpolate(labels.list.edited, { date: dateFormat.format(new Date(document.updated_at)) }),
    // The edit time in the address lets the browser keep the image until the CV changes.
    thumbnailUrl: `/${locale}/cvs/${document.id}/thumbnail?v=${encodeURIComponent(document.updated_at)}`,
    editorUrl: `/${locale}/cvs/${document.id}`,
    pdfUrl: `/${locale}/cvs/${document.id}/pdf`,
  }));
  return <CvList cards={cards} locale={locale} labels={labels.list} />;
}

function CvListSkeleton() {
  return (
    <ul aria-hidden="true" className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {[0, 1, 2].map((index) => (
        <li key={index} className="overflow-hidden rounded-card border border-rule bg-paper shadow-sheet">
          <div className="h-[300px] border-b border-rule bg-desk" />
          <div className="space-y-2.5 px-[18px] pt-4 pb-5">
            <div className="h-4 w-3/4 rounded bg-desk-deep" />
            <div className="h-3.5 w-1/2 rounded bg-desk-deep" />
          </div>
        </li>
      ))}
    </ul>
  );
}

export default async function CvsPage() {
  const [locale, dictionary] = await Promise.all([getLocale(), getDictionary()]);

  return (
    <BandPage
      title={dictionary.cvs.list.title}
      meta={dictionary.cvs.list.meta}
      action={
        <Link href={`/${locale}/cvs/new`} className={onBrandPrimaryButtonClass}>
          {dictionary.cvs.list.newCv}
        </Link>
      }
    >
      <Suspense fallback={<CvListSkeleton />}>
        <CvListContent />
      </Suspense>
    </BandPage>
  );
}
