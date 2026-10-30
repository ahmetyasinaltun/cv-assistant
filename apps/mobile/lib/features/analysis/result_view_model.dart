// Pure helpers that shape an analysis result for display (the Dart twin of the web's view-model.ts).
// They only rearrange server data; matching and scoring decisions stay on the server.

import '../../core/api/models.dart';

typedef StatusCounts = Map<MatchStatus, int>;

class EvidenceSection {
  const EvidenceSection(this.section, this.items);

  /// Section name as extracted by the pipeline; null when the pipeline could not tell.
  final String? section;
  final List<CandidateEvidence> items;
}

class TextSegment {
  const TextSegment(this.text, {required this.highlighted});

  final String text;
  final bool highlighted;
}

StatusCounts countByStatus(List<RequirementMatch> requirements) {
  final counts = {for (final status in MatchStatus.values) status: 0};
  for (final requirement in requirements) {
    counts[requirement.status] = counts[requirement.status]! + 1;
  }
  return counts;
}

List<RequirementMatch> withImportance(List<RequirementMatch> requirements, Importance importance) =>
    requirements.where((requirement) => requirement.importance == importance).toList();

/// Groups evidence by CV section, keeping the order in which sections first appear in the CV.
List<EvidenceSection> groupEvidenceBySection(List<CandidateEvidence> evidence) {
  final groups = <String?, List<CandidateEvidence>>{};
  for (final item in evidence) {
    final section = item.section?.trim();
    groups.putIfAbsent(section == null || section.isEmpty ? null : section, () => []).add(item);
  }
  return [for (final entry in groups.entries) EvidenceSection(entry.key, entry.value)];
}

const _priorityRank = {Priority.high: 0, Priority.medium: 1, Priority.low: 2};

List<Suggestion> sortSuggestionsByPriority(List<Suggestion> suggestions) =>
    [...suggestions]..sort((a, b) => _priorityRank[a.priority]!.compareTo(_priorityRank[b.priority]!));

/// The requirement a fix opens on the CV sheet: its first unmet related requirement, else its first one.
RequirementMatch? requirementForFix(Suggestion suggestion, List<RequirementMatch> requirements) {
  final byId = {for (final requirement in requirements) requirement.id: requirement};
  final related = [
    for (final id in suggestion.relatedRequirementIds)
      if (byId[id] != null) byId[id]!,
  ];
  for (final requirement in related) {
    if (requirement.status != MatchStatus.matched) return requirement;
  }
  return related.isEmpty ? null : related.first;
}

/// Splits [text] around the first case-insensitive occurrence of [quote] so the quoted words can be marked.
List<TextSegment> splitByQuote(String text, String? quote) {
  final needle = quote?.trim() ?? '';
  final start = needle.isEmpty ? -1 : text.toLowerCase().indexOf(needle.toLowerCase());
  if (start == -1) return [TextSegment(text, highlighted: false)];
  final end = start + needle.length;
  return [
    TextSegment(text.substring(0, start), highlighted: false),
    TextSegment(text.substring(start, end), highlighted: true),
    TextSegment(text.substring(end), highlighted: false),
  ].where((segment) => segment.text.isNotEmpty).toList();
}

/// Like [splitByQuote], for a line that supports the requirement: when the quote is not found, the whole line is marked.
List<TextSegment> splitForHighlight(String text, String? quote) {
  final segments = splitByQuote(text, quote);
  return segments.any((segment) => segment.highlighted) ? segments : [TextSegment(text, highlighted: true)];
}

class ScoreSegment {
  const ScoreSegment(this.requirement, this.width);

  final RequirementMatch requirement;
  final int width;
}

const _statusRank = {MatchStatus.matched: 0, MatchStatus.partial: 1, MatchStatus.missing: 2};

/// One bar segment per requirement, matched first, so the bar reads as the score's make-up. The widths mirror the
/// server's importance weights for drawing only; the score itself always comes from the API.
List<ScoreSegment> scoreSegments(List<RequirementMatch> requirements) => [
  for (final requirement in requirements)
    ScoreSegment(requirement, requirement.importance == Importance.mustHave ? 2 : 1),
]..sort((a, b) => _statusRank[a.requirement.status]!.compareTo(_statusRank[b.requirement.status]!));
