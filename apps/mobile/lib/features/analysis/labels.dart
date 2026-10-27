// Localized names for the contract's enums and failure codes, shared by the result screens and the list.

import '../../core/api/models.dart';
import '../../l10n/app_localizations.dart';

String statusLabel(AppLocalizations text, MatchStatus status) => switch (status) {
  MatchStatus.matched => text.statusMatched,
  MatchStatus.partial => text.statusPartial,
  MatchStatus.missing => text.statusMissing,
};

String importanceLabel(AppLocalizations text, Importance importance) => switch (importance) {
  Importance.mustHave => text.importanceMustHave,
  Importance.niceToHave => text.importanceNiceToHave,
};

String fitLabel(AppLocalizations text, FitLevel fit) => switch (fit) {
  FitLevel.strong => text.fitStrong,
  FitLevel.moderate => text.fitModerate,
  FitLevel.weak => text.fitWeak,
};

String priorityLabel(AppLocalizations text, Priority priority) => switch (priority) {
  Priority.high => text.priorityHigh,
  Priority.medium => text.priorityMedium,
  Priority.low => text.priorityLow,
};

String targetLabel(AppLocalizations text, SuggestionTarget target) => switch (target) {
  SuggestionTarget.skill => text.targetSkill,
  SuggestionTarget.cvSection => text.targetCvSection,
  SuggestionTarget.project => text.targetProject,
  SuggestionTarget.interviewTopic => text.targetInterviewTopic,
};

String categoryLabel(AppLocalizations text, QuestionCategory category) => switch (category) {
  QuestionCategory.technical => text.categoryTechnical,
  QuestionCategory.behavioral => text.categoryBehavioral,
  QuestionCategory.project => text.categoryProject,
  QuestionCategory.gap => text.categoryGap,
};

/// Failures the same CV and posting would hit again: the way forward is new input, not a rerun.
const needsNewInput = {'no_requirements_extracted', 'no_evidence_extracted'};

/// A specific reason for a known failure code, else the general explanation. Raw server text is never shown.
String failureReason(AppLocalizations text, String? code) => switch (code) {
  'ai_quota_exhausted' => text.reasonAiQuotaExhausted,
  'no_requirements_extracted' => text.reasonNoRequirements,
  'no_evidence_extracted' => text.reasonNoEvidence,
  _ => text.failedBody,
};
