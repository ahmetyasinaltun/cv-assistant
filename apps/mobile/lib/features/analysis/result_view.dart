// A completed analysis on a phone, fixes first (the product's main outcome): the brand band with the job, the summary
// card over its edge (score, summary and the requirements that make up the score), fix cards, the requirements card,
// limitations and interview questions. Tapping a fix or a requirement opens the CV sheet with its words highlighted.

import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../core/api/models.dart';
import '../../core/theme/app_text.dart';
import '../../core/theme/tokens.dart';
import '../../l10n/app_localizations.dart';
import '../../widgets/form_parts.dart';
import '../../widgets/paper.dart';
import '../../widgets/small_parts.dart';
import '../../widgets/status_mark.dart';
import 'evidence_sheet.dart';
import 'interview_questions.dart';
import 'labels.dart';
import 'result_view_model.dart';

class AnalysisResultView extends StatelessWidget {
  const AnalysisResultView({
    super.key,
    required this.detail,
    required this.result,
    this.isSample = false,
    this.generateQuestions,
  });

  final AnalysisDetail detail;
  final AnalysisResult result;
  final bool isSample;

  /// Null for the sample, whose questions come with it.
  final Future<List<InterviewQuestion>> Function()? generateQuestions;

  @override
  Widget build(BuildContext context) {
    final summary = detail.summary;
    final contentLocale = Locale(summary.outputLanguage);
    void open(RequirementMatch requirement) => showEvidenceSheet(
      context,
      result: result,
      requirement: requirement,
      resumeTitle: summary.resumeTitle,
      contentLocale: contentLocale,
    );

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        BandOverlap(
          header: ResultHeader(summary: summary, isSample: isSample),
          child: Padding(
            padding: screenPadding,
            child: _SummaryCard(
              overall: result.overall,
              requirements: result.requirements,
              contentLocale: contentLocale,
            ),
          ),
        ),
        const SizedBox(height: 28),
        _Fixes(result: result, contentLocale: contentLocale, onOpen: open),
        const SizedBox(height: 24),
        Padding(
          padding: screenPadding,
          child: _Requirements(requirements: result.requirements, onOpen: open),
        ),
        if (result.overall.limitations.isNotEmpty) ...[
          const SizedBox(height: 24),
          _Limitations(limitations: result.overall.limitations, contentLocale: contentLocale),
        ],
        const SizedBox(height: 24),
        Padding(
          padding: screenPadding,
          child: InterviewQuestionsSection(
            initialQuestions: detail.interviewQuestions,
            requirements: result.requirements,
            contentLocale: contentLocale,
            generate: generateQuestions,
          ),
        ),
        const SizedBox(height: 40),
      ],
    );
  }
}

/// Job title, company, the CV it was compared with and when, set on the brand band; shared by every state.
class ResultHeader extends StatelessWidget {
  const ResultHeader({super.key, required this.summary, this.isSample = false});

  final AnalysisSummary summary;
  final bool isSample;

  @override
  Widget build(BuildContext context) {
    final text = AppLocalizations.of(context);
    final language = Localizations.localeOf(context).toLanguageTag();
    final when = DateFormat.yMMMd(language).add_Hm().format(summary.createdAt.toLocal());
    final soft = AppText.meta.copyWith(color: Tokens.onBrandSoft, fontSize: 15);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Semantics(header: true, child: Text(summary.jobTitle, style: AppText.headline)),
        if (summary.company != null) ...[
          const SizedBox(height: 4),
          Text(summary.company!, style: soft.copyWith(fontSize: 16)),
        ],
        const SizedBox(height: 8),
        Text('${text.comparedWith(summary.resumeTitle)} · $when', style: soft),
        if (isSample) ...[const SizedBox(height: 14), SampleNotice(text.sampleNotice)],
      ],
    );
  }
}

class _SummaryCard extends StatefulWidget {
  const _SummaryCard({required this.overall, required this.requirements, required this.contentLocale});

  final OverallMatch overall;
  final List<RequirementMatch> requirements;
  final Locale contentLocale;

  @override
  State<_SummaryCard> createState() => _SummaryCardState();
}

class _SummaryCardState extends State<_SummaryCard> {
  bool _showScoring = false;

  @override
  Widget build(BuildContext context) {
    final text = AppLocalizations.of(context);
    final overall = widget.overall;
    final reduceMotion = MediaQuery.disableAnimationsOf(context);
    return PaperSheet(
      padding: EdgeInsets.zero,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 20, 20, 4),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Wrap(
                  alignment: WrapAlignment.spaceBetween,
                  crossAxisAlignment: WrapCrossAlignment.center,
                  spacing: 16,
                  runSpacing: 10,
                  children: [
                    Semantics(
                      label: text.scoreLabel(overall.score),
                      excludeSemantics: true,
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        crossAxisAlignment: CrossAxisAlignment.baseline,
                        textBaseline: TextBaseline.alphabetic,
                        children: [
                          Text('${overall.score}', style: AppText.score),
                          Text(
                            '/100',
                            style: AppText.title.copyWith(color: Tokens.mute, fontWeight: FontWeight.w600),
                          ),
                        ],
                      ),
                    ),
                    _FitChip(level: overall.fitLevel),
                  ],
                ),
                TextAction(label: text.howScored, onPressed: () => setState(() => _showScoring = !_showScoring)),
                AnimatedSize(
                  duration: reduceMotion ? Duration.zero : const Duration(milliseconds: 200),
                  curve: const Cubic(0.23, 1, 0.32, 1),
                  alignment: Alignment.topLeft,
                  child: _showScoring
                      ? Padding(
                          padding: const EdgeInsets.only(bottom: 12),
                          child: Text.rich(
                            TextSpan(text: overall.scoreExplanation, locale: widget.contentLocale),
                            style: AppText.meta.copyWith(color: Tokens.inkSoft),
                          ),
                        )
                      : const SizedBox(width: double.infinity),
                ),
              ],
            ),
          ),
          const Rule(),
          Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Semantics(header: true, child: Text(text.summaryTitle, style: AppText.title)),
                const SizedBox(height: 8),
                Text.rich(
                  TextSpan(text: overall.summary, locale: widget.contentLocale),
                  style: AppText.body,
                ),
              ],
            ),
          ),
          const Rule(),
          Padding(
            padding: const EdgeInsets.all(20),
            child: _Breakdown(requirements: widget.requirements),
          ),
        ],
      ),
    );
  }
}

class _FitChip extends StatelessWidget {
  const _FitChip({required this.level});

  final FitLevel level;

  @override
  Widget build(BuildContext context) {
    // A fit level borrows the icon and tone of the status it is closest to.
    final (status, background, foreground) = switch (level) {
      FitLevel.strong => (MatchStatus.matched, Tokens.okTint, Tokens.ok),
      FitLevel.moderate => (MatchStatus.partial, Tokens.partialTint, Tokens.partial),
      FitLevel.weak => (MatchStatus.missing, Tokens.markerTint, Tokens.marker),
    };
    return Container(
      padding: const EdgeInsets.fromLTRB(6, 4, 12, 4),
      decoration: BoxDecoration(color: background, borderRadius: const BorderRadius.all(Radius.circular(999))),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          StatusMark(status: status, size: 17),
          const SizedBox(width: 6),
          Text(fitLabel(AppLocalizations.of(context), level), style: AppText.button.copyWith(color: foreground)),
        ],
      ),
    );
  }
}

/// The requirements that make up the score: one segment each, coloured by status, must-haves drawn twice as wide.
class _Breakdown extends StatelessWidget {
  const _Breakdown({required this.requirements});

  final List<RequirementMatch> requirements;

  @override
  Widget build(BuildContext context) {
    final text = AppLocalizations.of(context);
    final counts = countByStatus(requirements);
    final segments = scoreSegments(requirements);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Wrap(
          alignment: WrapAlignment.spaceBetween,
          spacing: 12,
          children: [
            Text(text.requirementCount(requirements.length), style: AppText.button),
            Text(text.breakdownCaption, style: AppText.meta.copyWith(fontSize: 13)),
          ],
        ),
        if (segments.isNotEmpty) ...[
          const SizedBox(height: 12),
          ExcludeSemantics(
            child: SizedBox(
              height: 14,
              // Stretch, so each segment takes the bar's full height (an empty box would collapse to zero).
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  for (final (index, segment) in segments.indexed) ...[
                    if (index > 0) const SizedBox(width: 3),
                    Expanded(
                      flex: segment.width,
                      child: DecoratedBox(
                        decoration: BoxDecoration(
                          color: statusMarkColor(segment.requirement.status),
                          borderRadius: const BorderRadius.all(Radius.circular(3)),
                        ),
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),
        ],
        const SizedBox(height: 14),
        _LegendItem(MatchStatus.matched, text.statusCountMatched(counts[MatchStatus.matched]!)),
        _LegendItem(MatchStatus.partial, text.statusCountPartial(counts[MatchStatus.partial]!)),
        _LegendItem(MatchStatus.missing, text.statusCountMissing(counts[MatchStatus.missing]!)),
        const SizedBox(height: 8),
        Text(text.breakdownNote, style: AppText.meta.copyWith(fontSize: 13)),
      ],
    );
  }
}

Color statusMarkColor(MatchStatus status) => switch (status) {
  MatchStatus.matched => Tokens.okMark,
  MatchStatus.partial => Tokens.partialMark,
  MatchStatus.missing => Tokens.markerMark,
};

class _LegendItem extends StatelessWidget {
  const _LegendItem(this.status, this.label);

  final MatchStatus status;
  final String label;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: 8),
    child: Row(
      children: [
        StatusMark(status: status),
        const SizedBox(width: 10),
        Text(label, style: AppText.bodySmall),
      ],
    ),
  );
}

class _Fixes extends StatelessWidget {
  const _Fixes({required this.result, required this.contentLocale, required this.onOpen});

  final AnalysisResult result;
  final Locale contentLocale;
  final ValueChanged<RequirementMatch> onOpen;

  @override
  Widget build(BuildContext context) {
    final text = AppLocalizations.of(context);
    final fixes = sortSuggestionsByPriority(result.suggestions);
    return Padding(
      padding: screenPadding,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.baseline,
            textBaseline: TextBaseline.alphabetic,
            children: [
              Expanded(
                child: Semantics(header: true, child: Text(text.fixesTitle, style: AppText.titleSection)),
              ),
              if (fixes.isNotEmpty) Text(text.fixesCount(fixes.length), style: AppText.meta),
            ],
          ),
          const SizedBox(height: 12),
          if (fixes.isEmpty) PaperSheet(child: Text(text.fixesEmpty, style: AppText.bodySmall)),
          for (final (index, fix) in fixes.indexed) ...[
            if (index > 0) const SizedBox(height: 12),
            _FixCard(fix: fix, requirements: result.requirements, contentLocale: contentLocale, onOpen: onOpen),
          ],
        ],
      ),
    );
  }
}

IconData targetIcon(SuggestionTarget target) => switch (target) {
  SuggestionTarget.cvSection => Icons.description_outlined,
  SuggestionTarget.project => Icons.code,
  SuggestionTarget.interviewTopic => Icons.chat_bubble_outline,
  SuggestionTarget.skill => Icons.layers_outlined,
};

class _FixCard extends StatelessWidget {
  const _FixCard({required this.fix, required this.requirements, required this.contentLocale, required this.onOpen});

  final Suggestion fix;
  final List<RequirementMatch> requirements;
  final Locale contentLocale;
  final ValueChanged<RequirementMatch> onOpen;

  @override
  Widget build(BuildContext context) {
    final text = AppLocalizations.of(context);
    final target = requirementForFix(fix, requirements);
    final byId = {for (final requirement in requirements) requirement.id: requirement};
    final related = [
      for (final id in fix.relatedRequirementIds)
        if (byId[id] != null) byId[id]!,
    ];
    return PaperSheet(
      padding: EdgeInsets.zero,
      child: Material(
        type: MaterialType.transparency,
        child: InkWell(
          onTap: target == null ? null : () => onOpen(target),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(18, 18, 18, 14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                PriorityTag(priority: fix.priority, label: priorityLabel(text, fix.priority)),
                const SizedBox(height: 10),
                Text.rich(
                  TextSpan(text: fix.title, locale: contentLocale),
                  style: AppText.titleCard,
                ),
                const SizedBox(height: 6),
                Text.rich(
                  TextSpan(text: fix.detail, locale: contentLocale),
                  style: AppText.bodySmall,
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Icon(targetIcon(fix.target), size: 16, color: Tokens.mute),
                    const SizedBox(width: 6),
                    Text(targetLabel(text, fix.target), style: AppText.meta.copyWith(fontWeight: FontWeight.w500)),
                  ],
                ),
                for (final requirement in related) ...[
                  const SizedBox(height: 8),
                  _RequirementPill(requirement: requirement),
                ],
                if (target != null) ...[
                  const SizedBox(height: 4),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.end,
                    children: [
                      Text(
                        text.showInCv,
                        style: AppText.meta.copyWith(color: Tokens.accentHover, fontWeight: FontWeight.w600),
                      ),
                      const Icon(Icons.chevron_right, size: 20, color: Tokens.accentHover),
                    ],
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// A requirement named inside a fix: its status icon and wording on a light pill.
class _RequirementPill extends StatelessWidget {
  const _RequirementPill({required this.requirement});

  final RequirementMatch requirement;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.fromLTRB(6, 5, 10, 5),
    decoration: BoxDecoration(
      color: Tokens.desk,
      border: Border.all(color: Tokens.rule),
      borderRadius: const BorderRadius.all(Radius.circular(8)),
    ),
    child: Row(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(top: 1),
          child: StatusMark(status: requirement.status, size: 16),
        ),
        const SizedBox(width: 6),
        Flexible(
          child: Text(
            requirement.text,
            style: AppText.meta.copyWith(color: Tokens.ink, fontWeight: FontWeight.w500),
          ),
        ),
      ],
    ),
  );
}

class _Requirements extends StatelessWidget {
  const _Requirements({required this.requirements, required this.onOpen});

  final List<RequirementMatch> requirements;
  final ValueChanged<RequirementMatch> onOpen;

  @override
  Widget build(BuildContext context) {
    final text = AppLocalizations.of(context);
    final halves = [for (final importance in Importance.values) (importance, withImportance(requirements, importance))]
        .where((half) => half.$2.isNotEmpty)
        .toList();
    return PaperSheet(
      padding: const EdgeInsets.fromLTRB(8, 20, 8, 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.baseline,
              textBaseline: TextBaseline.alphabetic,
              children: [
                Expanded(
                  child: Semantics(header: true, child: Text(text.requirementsTitle, style: AppText.title)),
                ),
                if (requirements.isNotEmpty) Text(text.requirementCount(requirements.length), style: AppText.meta),
              ],
            ),
          ),
          if (requirements.isEmpty)
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 8, 12, 12),
              child: Text(text.requirementsEmpty, style: AppText.bodySmall),
            ),
          for (final (importance, items) in halves) ...[
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 16, 12, 6),
              child: GroupHead(importanceLabel(text, importance), count: items.length),
            ),
            for (final requirement in items) _RequirementTile(requirement: requirement, onOpen: onOpen),
          ],
        ],
      ),
    );
  }
}

class _RequirementTile extends StatelessWidget {
  const _RequirementTile({required this.requirement, required this.onOpen});

  final RequirementMatch requirement;
  final ValueChanged<RequirementMatch> onOpen;

  @override
  Widget build(BuildContext context) {
    final text = AppLocalizations.of(context);
    return Semantics(
      button: true,
      label: statusLabel(text, requirement.status),
      child: Material(
        type: MaterialType.transparency,
        child: InkWell(
          onTap: () => onOpen(requirement),
          borderRadius: const BorderRadius.all(Radius.circular(10)),
          child: ConstrainedBox(
            constraints: const BoxConstraints(minHeight: 48),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Padding(
                    padding: const EdgeInsets.only(top: 2),
                    child: StatusMark(status: requirement.status),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(requirement.text, style: AppText.bodySmall.copyWith(color: Tokens.ink, height: 1.42)),
                  ),
                  const SizedBox(width: 8),
                  Padding(
                    padding: const EdgeInsets.only(top: 1),
                    child: StatusChip(status: requirement.status, label: statusLabel(text, requirement.status)),
                  ),
                  const Icon(Icons.chevron_right, size: 20, color: Tokens.mute),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _Limitations extends StatelessWidget {
  const _Limitations({required this.limitations, required this.contentLocale});

  final List<String> limitations;
  final Locale contentLocale;

  @override
  Widget build(BuildContext context) {
    final text = AppLocalizations.of(context);
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          GroupHead(text.limitationsTitle),
          const SizedBox(height: 8),
          for (final limitation in limitations)
            Padding(
              padding: const EdgeInsets.only(bottom: 4),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('•  ', style: AppText.meta.copyWith(color: Tokens.fieldEdge)),
                  Expanded(
                    child: Text.rich(
                      TextSpan(text: limitation, locale: contentLocale),
                      style: AppText.meta,
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}
