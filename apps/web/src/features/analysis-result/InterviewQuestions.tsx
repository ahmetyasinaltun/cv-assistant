// Interview questions card with its four states: not generated, generating, failed and ready.

import { primaryButtonClass } from "@/components/button-styles";
import type { Dictionary } from "@/i18n/dictionaries";
import type { InterviewQuestion, RequirementMatch } from "@/lib/api/types";

import { RequirementLink } from "./RequirementLink";
import type { SelectionSource } from "./RequirementList";
import { StatusMark } from "./StatusMark";

export type QuestionsState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error" }
  | { kind: "ready"; questions: InterviewQuestion[] };

interface InterviewQuestionsProps {
  state: QuestionsState;
  onGenerate?: () => void;
  requirementsById: Map<string, RequirementMatch>;
  selectedId: string | null;
  onSelect: (requirementId: string, source: SelectionSource) => void;
  labels: Dictionary["result"]["questions"];
  contentLang?: string;
}

export function InterviewQuestions({
  state,
  onGenerate,
  requirementsById,
  selectedId,
  onSelect,
  labels,
  contentLang,
}: InterviewQuestionsProps) {
  return (
    <section
      id="interview-questions"
      aria-labelledby="questions-heading"
      aria-busy={state.kind === "loading"}
      className="mt-6 scroll-mt-6 rounded-card border border-rule bg-paper p-5 shadow-sheet sm:p-7"
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 id="questions-heading" className="text-[21px] leading-tight font-bold tracking-[-0.015em]">
            {labels.title}
          </h2>
          <p className="mt-1.5 max-w-[70ch] text-ink-soft">{labels.intro}</p>
        </div>
        {(state.kind === "idle" || state.kind === "error") && onGenerate && (
          <button type="button" onClick={onGenerate} className={`${primaryButtonClass} self-start md:self-auto`}>
            {state.kind === "error" ? labels.retry : labels.generate}
          </button>
        )}
      </div>

      {state.kind === "error" && (
        <p role="alert" className="mt-4 flex max-w-[65ch] items-start gap-2 text-[15px] text-marker">
          <span className="mt-0.5">
            <StatusMark status="missing" size={17} />
          </span>
          {labels.error}
        </p>
      )}

      {state.kind === "loading" && (
        <div className="mt-6" role="status">
          <p className="text-[15px] text-ink-soft">{labels.generating}</p>
          <div aria-hidden="true" className="mt-4 grid gap-x-10 gap-y-6 lg:grid-cols-2">
            {[0, 1, 2, 3].map((index) => (
              <div key={index} className="space-y-2 motion-safe:animate-pulse">
                <div className="h-4 w-full rounded bg-desk-deep" />
                <div className="h-4 w-3/4 rounded bg-desk-deep" />
                <div className="h-3 w-1/3 rounded bg-desk-deep" />
              </div>
            ))}
          </div>
        </div>
      )}

      {state.kind === "ready" &&
        (state.questions.length === 0 ? (
          <p className="mt-4 text-ink-soft">{labels.empty}</p>
        ) : (
          <ol className="mt-4 grid list-none gap-x-10 lg:grid-cols-2">
            {state.questions.map((question) => {
              const related = question.related_requirement_ids
                .map((id) => requirementsById.get(id))
                .filter((requirement) => requirement !== undefined);
              return (
                <li key={question.question} className="border-t border-rule py-5">
                  <p lang={contentLang} className="text-[16.5px] leading-[1.5] font-medium text-ink">
                    {question.question}
                  </p>
                  <p lang={contentLang} className="mt-2 text-[15px] text-ink-soft">
                    <span className="font-semibold text-ink">{labels.why}: </span>
                    {question.rationale}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-[14px]">
                    <span className="rounded-md bg-desk-deep px-2 py-0.5 text-[12.5px] leading-[1.5] font-semibold text-ink-soft">
                      {labels.category[question.category]}
                    </span>
                    {related.map((requirement) => (
                      <RequirementLink
                        key={requirement.id}
                        requirement={requirement}
                        isSelected={requirement.id === selectedId}
                        onSelect={onSelect}
                      />
                    ))}
                  </div>
                </li>
              );
            })}
          </ol>
        ))}
    </section>
  );
}
