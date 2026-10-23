// Interview questions section with its four states: not generated, generating, failed and ready.

import { primaryButtonClass } from "@/components/button-styles";
import type { Dictionary } from "@/i18n/dictionaries";
import type { InterviewQuestion, RequirementMatch } from "@/lib/api/types";

import { RequirementLink } from "./RequirementLink";
import type { SelectionSource } from "./RequirementList";

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
      className="mt-14 scroll-mt-6 border-t-2 border-rule-strong pt-6"
    >
      <div className="flex max-w-[72ch] flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 id="questions-heading" className="text-[22px] font-semibold tracking-[-0.02em]">
            {labels.title}
          </h2>
          <p className="mt-1 max-w-[72ch] text-[14px] text-ink-soft">{labels.intro}</p>
        </div>
        {(state.kind === "idle" || state.kind === "error") && onGenerate && (
          <button type="button" onClick={onGenerate} className={primaryButtonClass}>
            {state.kind === "error" ? labels.retry : labels.generate}
          </button>
        )}
      </div>

      {state.kind === "error" && (
        <p role="alert" className="mt-4 max-w-[65ch] text-[14px] text-marker">
          {labels.error}
        </p>
      )}

      {state.kind === "loading" && (
        <div className="mt-6 max-w-[72ch]" role="status">
          <p className="text-[14px] text-ink-soft">{labels.generating}</p>
          <div aria-hidden="true" className="mt-4 space-y-6">
            {[0, 1, 2].map((index) => (
              <div key={index} className="space-y-2 motion-safe:animate-pulse">
                <div className="h-4 w-full rounded-sm bg-desk-deep" />
                <div className="h-4 w-3/4 rounded-sm bg-desk-deep" />
                <div className="h-3 w-1/3 rounded-sm bg-desk-deep" />
              </div>
            ))}
          </div>
        </div>
      )}

      {state.kind === "ready" &&
        (state.questions.length === 0 ? (
          <p className="mt-4 text-[14px] text-ink-soft">{labels.empty}</p>
        ) : (
          <ol className="mt-4 max-w-[72ch] list-none">
            {state.questions.map((question) => {
              const related = question.related_requirement_ids
                .map((id) => requirementsById.get(id))
                .filter((requirement) => requirement !== undefined);
              return (
                <li key={question.question} className="border-t border-rule py-5 first:border-t-0">
                  <p lang={contentLang} className="text-[16px] leading-[1.5] font-medium text-ink">
                    {question.question}
                  </p>
                  <p lang={contentLang} className="mt-2 text-[14px] text-ink-soft">
                    <span className="font-semibold text-mute">{labels.why}: </span>
                    {question.rationale}
                  </p>
                  <p className="mt-2 text-[13px] leading-[1.6]">
                    <span className="mr-3 text-mute">{labels.category[question.category]}</span>
                    {related.map((requirement) => (
                      <span key={requirement.id} className="mr-3">
                        <RequirementLink
                          requirement={requirement}
                          isSelected={requirement.id === selectedId}
                          onSelect={onSelect}
                        />
                      </span>
                    ))}
                  </p>
                </li>
              );
            })}
          </ol>
        ))}
    </section>
  );
}
