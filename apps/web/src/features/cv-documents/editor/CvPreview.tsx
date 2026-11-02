"use client";

// Live preview of the CV being edited: the template choice, the page count and the page itself, rendered by the API
// from the unsaved content after each pause in typing. The last good page stays on screen while a new one loads.

import { useEffect, useRef, useState } from "react";

import { SegmentedChoice } from "@/components/form/SegmentedChoice";
import type { Dictionary } from "@/i18n/dictionaries";
import { interpolate, pluralize } from "@/i18n/format";
import type { CvContent, CvTemplateId, Language } from "@/lib/api/types";

import { IconButton } from "./controls";
import { CheckIcon, ChevronLeftIcon, ChevronRightIcon, PageIcon } from "./icons";

const TEMPLATE_IDS: CvTemplateId[] = ["classic", "modern", "standard"];
/** Wait for a pause in typing before asking the server for a new page. */
const PAUSE_MS = 600;

interface CvPreviewProps {
  locale: string;
  template: CvTemplateId;
  onTemplateChange: (template: CvTemplateId) => void;
  language: Language;
  content: CvContent;
  labels: Dictionary["cvs"]["editor"]["preview"];
  templateNames: Dictionary["cvs"]["templates"];
  /** Fit the page to the screen height (beside the form); the phone dialog lets it fill the width instead. */
  fitHeight?: boolean;
}

type Status = "loading" | "ready" | "failed";

export function CvPreview({
  locale,
  template,
  onTemplateChange,
  language,
  content,
  labels,
  templateNames,
  fitHeight = true,
}: CvPreviewProps) {
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const isFirstLoad = useRef(true);
  const shownUrl = useRef<string | null>(null);
  const request = JSON.stringify({ template, language, content, page });

  useEffect(() => {
    const controller = new AbortController();
    // The first page and a page or template switch load at once; typing waits for a pause.
    const delay = isFirstLoad.current ? 0 : PAUSE_MS;
    const timer = window.setTimeout(async () => {
      setStatus("loading");
      try {
        const response = await fetch(`/${locale}/cvs/preview`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: request,
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(`Preview failed with ${response.status}`);
        const count = Number(response.headers.get("x-page-count")) || 1;
        const url = URL.createObjectURL(await response.blob());
        if (shownUrl.current) URL.revokeObjectURL(shownUrl.current);
        shownUrl.current = url;
        setImageUrl(url);
        setPageCount(count);
        if (page > count) setPage(count);
        setStatus("ready");
        isFirstLoad.current = false;
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error(error);
          setStatus("failed");
        }
      }
    }, delay);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [locale, request, page]);

  // Release the last image when the preview goes away.
  useEffect(
    () => () => {
      if (shownUrl.current) URL.revokeObjectURL(shownUrl.current);
    },
    [],
  );

  function switchTemplate(next: CvTemplateId) {
    isFirstLoad.current = true;
    onTemplateChange(next);
  }

  function turnPage(delta: -1 | 1) {
    isFirstLoad.current = true;
    setPage((current) => Math.min(Math.max(current + delta, 1), pageCount));
  }

  const templateName = templateNames[template];

  return (
    <div className="overflow-hidden rounded-card border border-rule bg-paper shadow-sheet">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-rule px-4 py-3">
        <SegmentedChoice
          name="cv-template"
          legend={labels.templateLegend}
          hideLegend
          value={template}
          options={TEMPLATE_IDS.map((id) => ({ value: id, label: templateNames[id] }))}
          onChange={switchTemplate}
        />
        <p aria-live="polite" className="flex items-center gap-1.5 text-[14px] text-ink-soft">
          {status === "loading" && imageUrl ? (
            labels.updating
          ) : (
            <>
              {pageCount === 1 ? <CheckIcon size={16} /> : <PageIcon size={16} />}
              {pluralize(locale, pageCount, labels.pages)}
            </>
          )}
        </p>
      </div>

      {pageCount > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-rule bg-desk px-4 py-2">
          <p className="text-[14px] text-ink-soft">{interpolate(labels.longNote, { count: pageCount })}</p>
          <div className="flex items-center gap-1">
            <IconButton label={labels.previous} onClick={() => turnPage(-1)} disabled={page <= 1}>
              <ChevronLeftIcon size={17} />
            </IconButton>
            <span className="text-[14px] text-ink-soft tabular-nums">
              {interpolate(labels.pageOf, { page, count: pageCount })}
            </span>
            <IconButton label={labels.next} onClick={() => turnPage(1)} disabled={page >= pageCount}>
              <ChevronRightIcon size={17} />
            </IconButton>
          </div>
        </div>
      )}

      {status === "failed" && (
        <p role="status" className="border-b border-rule bg-marker-tint px-4 py-2 text-[14px] text-ink">
          {labels.failed}
        </p>
      )}

      <div className="flex justify-center bg-desk p-4 sm:p-[22px]">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- a blob URL from the API, not an optimizable asset
          <img
            src={imageUrl}
            alt={interpolate(labels.imageAlt, { page, template: templateName })}
            // A4 at the API's preview resolution, so the box keeps its shape before the image arrives.
            width={1058}
            height={1497}
            className={`block h-auto bg-paper shadow-[0_2px_14px_-3px_rgb(16_52_48/0.3)] transition-opacity duration-200 ${
              fitHeight ? "max-h-[calc(100vh-152px)] w-auto max-w-full" : "w-full"
            } ${status === "loading" ? "opacity-80" : ""}`}
          />
        ) : (
          <div
            aria-hidden="true"
            className="aspect-[210/297] w-full max-w-[520px] bg-paper shadow-[0_2px_14px_-3px_rgb(16_52_48/0.3)]"
          />
        )}
      </div>
    </div>
  );
}
