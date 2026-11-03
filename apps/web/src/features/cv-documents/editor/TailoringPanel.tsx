"use client";

// Top of a tailored CV in the editor: which posting it was written for and in which mode, that the analysis score is
// unchanged, the lines the AI added or embellished ("be ready to talk about"), and strict mode's yes/no questions.

import Link from "next/link";
import { useState, useTransition } from "react";

import { secondaryButtonClass } from "@/components/button-styles";
import { inlineLinkClass, textActionClass } from "@/components/form/field-styles";
import { StatusMark } from "@/components/StatusMark";
import type { Dictionary } from "@/i18n/dictionaries";
import { interpolate } from "@/i18n/format";
import type { CvContent, CvDocument, TailoringMode, TailoringQuestion } from "@/lib/api/types";

import { answerQuestions } from "../actions";
import { linesToTalkAbout } from "../cv-model";

import { OriginMark } from "./controls";

type TailorLabels = Dictionary["cvs"]["tailor"]["panel"];
type EditorLabels = Dictionary["cvs"]["editor"];

interface TailoringPanelProps {
  documentId: string;
  locale: string;
  mode: TailoringMode;
  /** The analysed posting and the way to its analysis, while the analysis still exists. */
  posting: { title: string; href: string } | null;
  fallbackTitle: string;
  content: CvContent;
  questions: TailoringQuestion[];
  /** Answers change the saved CV on the server, so unsaved edits must be saved first. */
  isDirty: boolean;
  onAnswered: (document: CvDocument) => void;
  labels: TailorLabels;
  editorLabels: EditorLabels;
}

export function TailoringPanel({
  documentId,
  locale,
  mode,
  posting,
  fallbackTitle,
  content,
  questions,
  isDirty,
  onAnswered,
  labels,
  editorLabels,
}: TailoringPanelProps) {
  const ready = linesToTalkAbout(content, editorLabels.sections);
  const [failed, setFailed] = useState(false);
  const [isAnswering, startAnswer] = useTransition();

  function answer(id: string, accepted: boolean) {
    setFailed(false);
    startAnswer(async () => {
      const result = await answerQuestions(locale, documentId, [{ id, accepted }]);
      if (result.ok) onAnswered(result.document);
      else setFailed(true);
    });
  }

  return (
    <section
      aria-labelledby="tailoring-title"
      className="rounded-card border border-rule bg-paper px-5 py-5 shadow-sheet sm:px-[22px]"
    >
      <h2 id="tailoring-title" className="text-[17.5px] leading-[1.35] font-bold tracking-[-0.01em] break-words">
        {interpolate(labels.title, { job: posting?.title ?? fallbackTitle })}
      </h2>
      <p className="mt-1 text-[14px] text-mute">
        {labels.mode[mode]} · {labels.scoreNote}
        {posting && (
          <>
            {" "}
            <Link href={posting.href} className={inlineLinkClass}>
              {labels.openAnalysis}
            </Link>
          </>
        )}
      </p>

      {questions.length > 0 && (
        <div className="mt-5 border-t border-rule pt-4">
          <h3 className="text-[15px] font-semibold text-ink">{labels.questionsTitle}</h3>
          <p className="mt-0.5 text-[14px] text-mute">{labels.questionsNote}</p>
          {isDirty && questions.some((q) => q.answer === null) && (
            <p className="mt-2 text-[14px] text-ink-soft">{labels.saveFirst}</p>
          )}
          {failed && (
            <p role="alert" className="mt-2 flex items-center gap-1.5 text-[14px] text-marker">
              <StatusMark status="missing" size={15} />
              {labels.answerFailed}
            </p>
          )}
          <ul className="mt-3 space-y-3">
            {questions.map((question) => (
              <li key={question.id} className="rounded-[10px] border border-rule px-4 py-3">
                <p className="font-medium text-ink">{question.question}</p>
                <p className="mt-1 text-[14px] text-ink-soft">
                  “{question.proposed_line}” <span className="text-mute">{interpolate(labels.in, { entry: question.entry_name })}</span>
                </p>
                {question.answer === null ? (
                  <div className="mt-3 flex flex-wrap items-center gap-4">
                    <button
                      type="button"
                      onClick={() => answer(question.id, true)}
                      disabled={isDirty || isAnswering}
                      className={`${secondaryButtonClass} h-10`}
                    >
                      {labels.yes}
                    </button>
                    <button
                      type="button"
                      onClick={() => answer(question.id, false)}
                      disabled={isDirty || isAnswering}
                      className={textActionClass}
                    >
                      {labels.no}
                    </button>
                  </div>
                ) : (
                  <p className="mt-2 text-[14px] font-semibold text-accent-hover">
                    {question.answer ? labels.answered.yes : labels.answered.no}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-5 border-t border-rule pt-4">
        <h3 className="text-[15px] font-semibold text-ink">{labels.readyTitle}</h3>
        {ready.length === 0 ? (
          <p className="mt-0.5 text-[14px] text-mute">{labels.readyEmpty}</p>
        ) : (
          <>
            <p className="mt-0.5 max-w-[62ch] text-[14px] text-mute">{labels.readyNote}</p>
            <ul className="mt-3 space-y-3">
              {ready.map((line, index) => (
                <li key={index}>
                  <OriginMark origin={line.origin} labels={editorLabels} compact />
                  <p className="text-[15px] leading-[1.5] break-words text-ink">{line.text}</p>
                  <p className="text-[13px] text-mute">{line.place}</p>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </section>
  );
}
