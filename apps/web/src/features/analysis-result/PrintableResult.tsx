// Print-only version of a finished analysis, hidden on screen: the same judgements as a plain document for paper
// and "Save as PDF", without the band, the buttons or the interactive CV sheet. Each requirement carries its
// reason and the CV lines it relied on, because a printed page cannot open the sheet.

import { StatusMark } from "@/components/StatusMark";
import type { Dictionary } from "@/i18n/dictionaries";
import { interpolate } from "@/i18n/format";
import type { AnalysisDetail, AnalysisResult, InterviewQuestion, RequirementMatch } from "@/lib/api/types";

import { countByStatus, splitByImportance } from "./view-model";

interface PrintableResultProps {
  analysis: AnalysisDetail;
  result: AnalysisResult;
  /** Shown only when they have been generated. */
  questions: InterviewQuestion[] | null;
  labels: Dictionary["result"];
  createdAtLabel: string;
  contentLang?: string;
}

const sectionTitle = "text-[13pt] font-bold tracking-[-0.01em] text-ink";

export function PrintableResult({
  analysis,
  result,
  questions,
  labels,
  createdAtLabel,
  contentLang,
}: PrintableResultProps) {
  const { overall, requirements, suggestions } = result;
  const counts = countByStatus(requirements);
  const { mustHave, niceToHave } = splitByImportance(requirements);
  const requirementsById = new Map(requirements.map((requirement) => [requirement.id, requirement]));

  return (
    <article className="hidden text-[10.5pt] leading-[1.45] text-ink print:block">
      <header className="border-b-2 border-brand pb-3">
        <p className="text-[9pt] font-semibold tracking-[0.02em] text-brand" translate="no">
          AI Career Assistant
        </p>
        <h1 className="mt-1 text-[19pt] leading-[1.2] font-bold tracking-[-0.02em]">
          {analysis.job_title}
          {analysis.company && <span className="font-normal text-ink-soft"> · {analysis.company}</span>}
        </h1>
        <p className="mt-1 text-[9.5pt] text-ink-soft">
          {interpolate(labels.comparedWith, { resume: analysis.resume_title })} · {createdAtLabel}
        </p>
      </header>

      <section className="mt-4 grid grid-cols-[auto_minmax(0,1fr)] gap-x-6 break-inside-avoid">
        <div>
          <p className="text-[26pt] leading-none font-bold text-accent tabular-nums">
            {overall.score}
            <span className="text-[12pt] font-semibold text-ink-soft">/100</span>
          </p>
          <p className="mt-1 text-[10pt] font-semibold">{labels.fit[overall.fit_level]}</p>
        </div>
        <div>
          <p lang={contentLang}>{overall.summary}</p>
          <p className="mt-1.5 text-[9.5pt] text-ink-soft">
            {(["matched", "partial", "missing"] as const)
              .map((status) => interpolate(labels.statusCount[status], { count: counts[status] }))
              .join(" · ")}
          </p>
          <p className="mt-1 text-[9pt] text-mute">{overall.score_explanation}</p>
        </div>
      </section>

      {suggestions.length > 0 && (
        <section className="mt-6">
          <h2 className={sectionTitle}>{labels.fixesTitle}</h2>
          <ol className="mt-2 grid gap-2.5">
            {suggestions.map((suggestion) => {
              const related = suggestion.related_requirement_ids
                .map((id) => requirementsById.get(id)?.text)
                .filter(Boolean);
              return (
                <li key={suggestion.title} className="break-inside-avoid">
                  <p className="font-semibold">
                    <span className="font-bold text-accent">{labels.priority[suggestion.priority]}</span>
                    {" · "}
                    <span lang={contentLang}>{suggestion.title}</span>
                  </p>
                  <p lang={contentLang} className="text-ink-soft">
                    {suggestion.detail}
                  </p>
                  <p className="text-[9pt] text-mute">
                    {labels.target[suggestion.target]}
                    {related.length > 0 && ` · ${related.join("; ")}`}
                  </p>
                </li>
              );
            })}
          </ol>
        </section>
      )}

      <section className="mt-6">
        <h2 className={sectionTitle}>{labels.requirementsTitle}</h2>
        {[
          { title: labels.importance.must_have, items: mustHave },
          { title: labels.importance.nice_to_have, items: niceToHave },
        ]
          .filter((group) => group.items.length > 0)
          .map((group) => (
            <div key={group.title} className="mt-2">
              <h3 className="text-[10pt] font-semibold text-ink-soft">{group.title}</h3>
              <ul className="mt-1 grid gap-2">
                {group.items.map((requirement) => (
                  <PrintedRequirement
                    key={requirement.id}
                    requirement={requirement}
                    labels={labels}
                    contentLang={contentLang}
                  />
                ))}
              </ul>
            </div>
          ))}
      </section>

      {questions && questions.length > 0 && (
        <section className="mt-6">
          <h2 className={sectionTitle}>{labels.questions.title}</h2>
          <ol className="mt-2 grid list-decimal gap-2 pl-5 marker:text-mute">
            {questions.map((question) => (
              <li key={question.question} className="break-inside-avoid">
                <p lang={contentLang} className="font-medium">
                  {question.question}
                </p>
                <p className="text-[9.5pt] text-ink-soft">
                  <span className="font-semibold text-ink">{labels.questions.why}:</span>{" "}
                  <span lang={contentLang}>{question.rationale}</span>
                </p>
              </li>
            ))}
          </ol>
        </section>
      )}

      {overall.limitations.length > 0 && (
        <section className="mt-6 break-inside-avoid">
          <h2 className="text-[10pt] font-semibold text-ink-soft">{labels.limitationsTitle}</h2>
          <ul lang={contentLang} className="mt-1 list-disc pl-5 text-[9pt] text-mute">
            {overall.limitations.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      )}

      <footer className="mt-6 border-t border-rule pt-2 text-[8.5pt] text-mute">{labels.print.footer}</footer>
    </article>
  );
}

function PrintedRequirement({
  requirement,
  labels,
  contentLang,
}: {
  requirement: RequirementMatch;
  labels: Dictionary["result"];
  contentLang?: string;
}) {
  const quotes = [...new Set(requirement.evidence.map((item) => item.quote.trim()).filter(Boolean))];
  return (
    <li className="grid grid-cols-[14pt_minmax(0,1fr)] gap-x-1.5 break-inside-avoid">
      <span className="pt-[2pt]">
        <StatusMark status={requirement.status} size={13} />
      </span>
      <div>
        <p>
          <span className="font-semibold">{requirement.text}</span>{" "}
          <span className="text-[9pt] font-semibold text-ink-soft">· {labels.status[requirement.status]}</span>
        </p>
        <p lang={contentLang} className="text-[9.5pt] text-ink-soft">
          {requirement.reasoning}
        </p>
        {quotes.length > 0 && (
          <ul className="mt-0.5 grid gap-0.5 text-[9pt] text-ink-soft">
            {quotes.map((quote) => (
              <li key={quote} className="border-l-2 border-rule pl-2">
                “{quote}”
              </li>
            ))}
          </ul>
        )}
      </div>
    </li>
  );
}
