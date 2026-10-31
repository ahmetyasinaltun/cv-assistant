"use client";

// CV file picker (PDF or Word) that also accepts a dropped file; the native file input stays the real control.

import { useRef, useState, type DragEvent } from "react";

import { FieldError } from "@/components/form/FieldError";
import type { Dictionary } from "@/i18n/dictionaries";

import { UPLOAD_ACCEPT, type NewAnalysisDraft } from "./new-analysis-model";

interface FileDropProps {
  id: string;
  name: string;
  file: NewAnalysisDraft["resumeFile"];
  onFileChange: (file: File | null) => void;
  labels: Dictionary["newAnalysis"]["resume"];
  locale: string;
  error?: string | null;
}

/** "1.2 MB" with a non-breaking space, so the number and its unit never split across lines. */
function formatSize(bytes: number, locale: string): string {
  const megabytes = bytes / (1024 * 1024);
  if (megabytes >= 0.1) {
    return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(megabytes)} MB`;
  }
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(bytes / 1024)} KB`;
}

export function FileDrop({ id, name, file, onFileChange, labels, locale, error }: FileDropProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const errorId = error ? `${id}-error` : undefined;

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setIsDragging(false);
    const dropped = event.dataTransfer.files[0];
    if (!dropped || !inputRef.current) return;
    // Put the dropped file into the real input, so the form submits it like a picked one.
    const transfer = new DataTransfer();
    transfer.items.add(dropped);
    inputRef.current.files = transfer.files;
    onFileChange(dropped);
  }

  return (
    <div>
      <input
        ref={inputRef}
        id={id}
        name={name}
        type="file"
        accept={UPLOAD_ACCEPT}
        className="peer sr-only"
        aria-invalid={error ? true : undefined}
        aria-describedby={[errorId, `${id}-hint`].filter(Boolean).join(" ")}
        onChange={(event) => onFileChange(event.currentTarget.files?.[0] ?? null)}
      />
      <label
        htmlFor={id}
        data-dragging={isDragging}
        data-invalid={Boolean(error)}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className="flex min-h-36 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-[10px] border border-dashed border-field-edge bg-desk/50 px-4 py-6 text-center transition-[border-color,background-color] duration-150 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent hover:border-accent hover:bg-accent-tint/50 data-[dragging=true]:border-accent data-[dragging=true]:bg-accent-tint data-[invalid=true]:border-marker"
      >
        <svg aria-hidden="true" width="26" height="26" viewBox="0 0 24 24" className="mb-1 text-accent">
          <path
            d="M12 15V4m0 0L7.5 8.5M12 4l4.5 4.5M5 14.5V18a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {file ? (
          <>
            <span className="max-w-full truncate text-[16px] font-semibold text-ink">{file.name}</span>
            <span className="text-[14px] text-mute">
              {formatSize(file.size, locale)} ·{" "}
              <span className="font-medium text-accent-hover underline decoration-accent/35 underline-offset-[3px]">
                {labels.replaceFile}
              </span>
            </span>
          </>
        ) : (
          <span className="text-[15px] text-ink-soft">
            {labels.dropPrompt}{" "}
            <span className="font-semibold text-accent-hover underline decoration-accent/35 underline-offset-[3px]">
              {labels.chooseFile}
            </span>
          </span>
        )}
      </label>
      <FieldError id={`${id}-error`} message={error} />
      <p id={`${id}-hint`} className="mt-1.5 text-[14px] text-mute">
        {labels.fileHint}
      </p>
    </div>
  );
}
