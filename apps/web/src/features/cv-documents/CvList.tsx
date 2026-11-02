"use client";

// The CV list: one card per CV with its first page as a thumbnail, its language and template, when it was last
// edited, a download link and delete with an in-place confirmation. The whole card opens the editor.

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";

import { dangerButtonClass } from "@/components/button-styles";
import { textActionClass } from "@/components/form/field-styles";
import { StatusMark } from "@/components/StatusMark";
import type { Dictionary } from "@/i18n/dictionaries";
import { interpolate } from "@/i18n/format";

import { deleteCv } from "./actions";

export interface CvCardData {
  id: string;
  title: string;
  /** "Turkish · Classic", already in the interface language. */
  meta: string;
  /** Formatted on the server, so the server and the browser print the same text. */
  editedLabel: string;
  thumbnailUrl: string;
  editorUrl: string;
  pdfUrl: string;
}

interface CvListProps {
  cards: CvCardData[];
  locale: string;
  labels: Dictionary["cvs"]["list"];
}

export function CvList({ cards, locale, labels }: CvListProps) {
  return (
    <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {cards.map((card) => (
        <CvCard key={card.id} card={card} locale={locale} labels={labels} />
      ))}
    </ul>
  );
}

function CvCard({ card, locale, labels }: { card: CvCardData; locale: string; labels: CvListProps["labels"] }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [failed, setFailed] = useState(false);
  const [isDeleting, startDelete] = useTransition();
  const deleteButton = useRef<HTMLButtonElement>(null);

  function confirmDelete() {
    setFailed(false);
    startDelete(async () => {
      const result = await deleteCv(locale, card.id);
      if (result.ok) router.refresh();
      else setFailed(true);
    });
  }

  function cancel() {
    setConfirming(false);
    setFailed(false);
    // Focus goes back to where the confirmation started.
    requestAnimationFrame(() => deleteButton.current?.focus());
  }

  return (
    <li className="group relative flex flex-col overflow-hidden rounded-card border border-rule bg-paper shadow-sheet">
      <div className="h-[300px] overflow-hidden border-b border-rule bg-desk px-[22px] pt-[18px]">
        {/* A plain image: it comes from an authenticated route handler, not from Next's image optimizer. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={card.thumbnailUrl}
          alt={interpolate(labels.thumbnailAlt, { title: card.title })}
          width={496}
          height={702}
          loading="lazy"
          className="block h-auto w-full rounded-[2px] bg-paper shadow-[0_2px_10px_-2px_rgb(16_52_48/0.25)] transition-transform duration-200 ease-out group-hover:-translate-y-0.5"
        />
      </div>
      <div className="flex flex-1 flex-col px-[18px] pt-3.5 pb-4">
        <h2 className="text-[16px] leading-[1.35] font-semibold">
          {/* The title link covers the card, so the whole card opens the editor; the footer actions sit above it. */}
          <Link
            href={card.editorUrl}
            className="rounded-[3px] after:absolute after:inset-0 after:content-[''] hover:text-accent-hover"
          >
            {card.title}
          </Link>
        </h2>
        <p className="mt-1 text-[14px] text-ink-soft">{card.meta}</p>

        {confirming ? (
          <div role="group" aria-label={labels.delete} className="relative mt-3 rounded-[10px] bg-marker-tint p-3">
            <p className="text-[14px] text-ink">{interpolate(labels.deleteQuestion, { title: card.title })}</p>
            {failed && (
              <p role="alert" className="mt-2 flex items-center gap-1.5 text-[14px] text-marker">
                <StatusMark status="missing" size={15} />
                {labels.deleteFailed}
              </p>
            )}
            <div className="mt-3 flex items-center gap-4">
              <button
                type="button"
                autoFocus
                onClick={confirmDelete}
                disabled={isDeleting}
                className={`${dangerButtonClass} h-10`}
              >
                {isDeleting ? labels.deleting : labels.deleteAction}
              </button>
              <button type="button" onClick={cancel} className={textActionClass}>
                {labels.cancel}
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-auto flex items-center justify-between gap-3 pt-3">
            <span className="text-[14px] text-mute">{card.editedLabel}</span>
            <span className="relative flex items-center gap-4">
              <a href={card.pdfUrl} download className={textActionClass}>
                {labels.download}
              </a>
              <button
                ref={deleteButton}
                type="button"
                onClick={() => setConfirming(true)}
                className={textActionClass}
              >
                {labels.delete}
              </button>
            </span>
          </div>
        )}
      </div>
    </li>
  );
}
