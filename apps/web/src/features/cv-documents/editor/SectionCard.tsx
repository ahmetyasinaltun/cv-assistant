"use client";

// A CV section as a card that opens in place (summary line while closed; show/hide and move tools in its head), and
// an entry inside a section (a position, a school, a project) as a hairline box that opens in place too.

import type { ReactNode } from "react";

import { interpolate } from "@/i18n/format";

import { IconButton, type EditorLabels } from "./controls";
import { ArrowDownIcon, ArrowUpIcon, ChevronIcon, CloseIcon, EyeIcon, EyeOffIcon } from "./icons";

interface SectionCardProps {
  id: string;
  title: string;
  /** Number of entries, shown beside the title. */
  count?: number;
  /** One line of what the section holds, shown while it is closed. */
  summary: string;
  open: boolean;
  onToggle: () => void;
  /** Show/hide and move tools; the personal details card has none. */
  tools?: {
    visible: boolean;
    onToggleVisible: () => void;
    onMoveUp?: () => void;
    onMoveDown?: () => void;
  };
  labels: EditorLabels;
  children: ReactNode;
}

export function SectionCard({ id, title, count, summary, open, onToggle, tools, labels, children }: SectionCardProps) {
  const bodyId = `${id}-body`;
  const hidden = tools && !tools.visible;
  const name = { section: title };

  return (
    <section aria-labelledby={`${id}-title`} className="rounded-card border border-rule bg-paper shadow-sheet">
      <div className="flex items-center gap-2 py-3 pr-3 pl-5 sm:pl-[22px]">
        {/* The heading holds the toggle (the accordion pattern); its hit area stretches over the summary line. */}
        <div className="relative min-w-0 flex-1 py-1">
          <h2
            id={`${id}-title`}
            className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[17.5px] leading-[1.35] font-bold tracking-[-0.01em]"
          >
            <button
              type="button"
              onClick={onToggle}
              aria-expanded={open}
              aria-controls={bodyId}
              className={`rounded-[4px] text-left after:absolute after:inset-0 after:content-[''] ${hidden ? "text-mute" : ""}`}
            >
              {title}
            </button>
            {count !== undefined && count > 0 && (
              <span className="rounded-[6px] bg-desk px-2 py-px text-[13px] font-semibold text-mute tabular-nums">
                {count}
              </span>
            )}
            {hidden && (
              <span className="rounded-[6px] bg-desk-deep px-2 py-0.5 text-[12.5px] font-semibold text-ink-soft">
                {labels.tools.hidden}
              </span>
            )}
          </h2>
          {!open && summary && <p className="mt-0.5 truncate text-[14px] text-mute">{summary}</p>}
        </div>
        {tools && (
          <div className="flex shrink-0 items-center">
            <IconButton
              label={interpolate(tools.visible ? labels.tools.hide : labels.tools.show, name)}
              pressed={!tools.visible}
              onClick={tools.onToggleVisible}
            >
              {tools.visible ? <EyeIcon /> : <EyeOffIcon />}
            </IconButton>
            <IconButton
              label={interpolate(labels.tools.up, name)}
              onClick={() => tools.onMoveUp?.()}
              disabled={!tools.onMoveUp}
            >
              <ArrowUpIcon />
            </IconButton>
            <IconButton
              label={interpolate(labels.tools.down, name)}
              onClick={() => tools.onMoveDown?.()}
              disabled={!tools.onMoveDown}
            >
              <ArrowDownIcon />
            </IconButton>
          </div>
        )}
        <IconButton
          label={interpolate(open ? labels.tools.close : labels.tools.open, name)}
          expanded={open}
          controls={bodyId}
          onClick={onToggle}
        >
          <ChevronIcon className={`transition-transform duration-200 ease-out ${open ? "rotate-180" : ""}`} />
        </IconButton>
      </div>
      <div id={bodyId} hidden={!open} className="px-5 pt-1 pb-6 sm:px-[22px]">
        {open && children}
      </div>
    </section>
  );
}

interface EntryBoxProps {
  id: string;
  title: string;
  /** Organization, place and dates, after the title. */
  subtitle: string;
  open: boolean;
  onToggle: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onRemove: () => void;
  labels: EditorLabels;
  children: ReactNode;
}

export function EntryBox({
  id,
  title,
  subtitle,
  open,
  onToggle,
  onMoveUp,
  onMoveDown,
  onRemove,
  labels,
  children,
}: EntryBoxProps) {
  const bodyId = `${id}-body`;
  const name = { entry: title };

  return (
    <div className="rounded-[10px] border border-rule">
      <div className="flex items-center gap-1 py-1.5 pr-1.5 pl-4">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-controls={bodyId}
          className="min-w-0 flex-1 rounded-lg py-1.5 text-left text-[15.5px] leading-[1.45]"
        >
          <span className="font-semibold text-ink">{title}</span>
          {subtitle && <span className="text-mute"> · {subtitle}</span>}
        </button>
        <IconButton label={labels.tools.entryUp} onClick={() => onMoveUp?.()} disabled={!onMoveUp}>
          <ArrowUpIcon size={17} />
        </IconButton>
        <IconButton label={labels.tools.entryDown} onClick={() => onMoveDown?.()} disabled={!onMoveDown}>
          <ArrowDownIcon size={17} />
        </IconButton>
        <IconButton label={interpolate(labels.tools.removeEntry, name)} onClick={onRemove}>
          <CloseIcon size={17} />
        </IconButton>
        <IconButton
          label={interpolate(open ? labels.tools.entryClose : labels.tools.entryOpen, name)}
          expanded={open}
          controls={bodyId}
          onClick={onToggle}
        >
          <ChevronIcon size={17} className={`transition-transform duration-200 ease-out ${open ? "rotate-180" : ""}`} />
        </IconButton>
      </div>
      <div id={bodyId} hidden={!open} className="space-y-4 border-t border-rule px-4 pt-4 pb-5">
        {open && children}
      </div>
    </div>
  );
}
