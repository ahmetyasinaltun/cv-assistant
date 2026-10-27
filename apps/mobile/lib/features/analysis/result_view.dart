// A completed analysis on a phone, fixes first (the product's main outcome): header, summary band with the
// score and how it is computed, what to fix, the requirement checklist, limitations, then interview questions.
// Tapping a fix or a requirement opens the CV sheet with the supporting lines circled.

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
        ResultHeader(summary: summary, isSample: isSample),
        const SizedBox(height: 20),
        _SummaryBand(overall: result.overall, requirements: result.requirements, contentLocale: contentLocale),
        const SizedBox(height: 28),
        _Fixes(result: result, contentLocale: contentLocale, onOpen: open),
        const SizedBox(height: 28),
        const Padding(padding: screenPadding, child: Rule(strong: true)),
        const SizedBox(height: 20),
        _Requirements(requirements: result.requirements, onOpen: open),
        if (result.overall.limitations.isNotEmpty) ...[
          const SizedBox(height: 28),
          _Limitations(limitations: result.overall.limitations, contentLocale: contentLocale),
        ],
        const SizedBox(height: 32),
        const Padding(padding: screenPadding, child: Rule(strong: true)),
        const SizedBox(height: 20),
        InterviewQuestionsSection(
          initialQuestions: detail.interviewQuestions,
          requirements: result.requirements,
          contentLocale: contentLocale,
          generate: generateQuestions,
        ),
        const SizedBox(height: 40),
      ],
    );
  }
}

/// Job title, company, the CV it was compared with and when; shared by every state of an analysis.
class ResultHeader extends StatelessWidget {
  const ResultHeader({super.key, required this.summary, this.isSample = false});

  final AnalysisSummary summary;
  final bool isSample;

  @override
  Widget build(BuildContext context) {
    final text = AppLocalizations.of(context);
    final language = Localizations.localeOf(context).toLanguageTag();
    final when = DateFormat.yMMMd(language).add_Hm().format(summary.createdAt.toLocal());
    return Padding(
      padding: screenPadding,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (isSample) ...[_SampleNotice(text.sampleNotice), const SizedBox(height: 16)],
          Semantics(header: true, child: Text(summary.jobTitle, style: AppText.headline)),
          if (summary.company != null) ...[
            const SizedBox(height: 2),
            Text(summary.company!, style: AppText.body.copyWith(color: Tokens.mute)),
          ],
          const SizedBox(height: 8),
          Text('${text.comparedWith(summary.resumeTitle)} · $when', style: AppText.meta),
        ],
      ),
    );
  }
}

class _SampleNotice extends StatelessWidget {
  const _SampleNotice(this.message);

  final String message;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
    decoration: const BoxDecoration(color: Tokens.deskDeep, borderRadius: BorderRadius.all(Radius.circular(4))),
    child: Row(
      children: [
        // The contact-strip glyph: a small film edge in Edge-Print Orange.
        Container(
          width: 10,
          height: 12,
          decoration: BoxDecoration(border: Border.all(color: Tokens.edge, width: 1.5)),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: Text(message, style: AppText.meta.copyWith(color: Tokens.inkSoft)),
        ),
      ],
    ),
  );
}

class _SummaryBand extends StatefulWidget {
  const _SummaryBand({required this.overall, required this.requirements, required this.contentLocale});

  final OverallMatch overall;
  final List<RequirementMatch> requirements;
  final Locale contentLocale;

  @override
  State<_SummaryBand> createState() => _SummaryBandState();
}

class _SummaryBandState extends State<_SummaryBand> {
  bool _showScoring = false;

  @override
  Widget build(BuildContext context) {
    final text = AppLocalizations.of(context);
    final overall = widget.overall;
    final counts = countByStatus(widget.requirements);
    final reduceMotion = MediaQuery.disableAnimationsOf(context);
    return Padding(
      padding: screenPadding,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Rule(),
          const SizedBox(height: 16),
          Row(
            crossAxisAlignment: CrossAxisAlignment.baseline,
            textBaseline: TextBaseline.alphabetic,
            children: [
              Text(fitLabel(text, overall.fitLevel), style: AppText.titleFit),
              const SizedBox(width: 12),
              Text('${overall.score}', style: AppText.score),
              Text(' / 100', style: AppText.meta.copyWith(fontFeatures: AppText.score.fontFeatures)),
            ],
          ),
          const SizedBox(height: 10),
          Text.rich(
            TextSpan(text: overall.summary, locale: widget.contentLocale),
            style: AppText.body,
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 16,
            runSpacing: 6,
            children: [
              _LegendItem(MatchStatus.matched, text.statusCountMatched(counts[MatchStatus.matched]!)),
              _LegendItem(MatchStatus.partial, text.statusCountPartial(counts[MatchStatus.partial]!)),
              _LegendItem(MatchStatus.missing, text.statusCountMissing(counts[MatchStatus.missing]!)),
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
          const Rule(),
        ],
      ),
    );
  }
}

class _LegendItem extends StatelessWidget {
  const _LegendItem(this.status, this.label);

  final MatchStatus status;
  final String label;

  @override
  Widget build(BuildContext context) => Row(
    mainAxisSize: MainAxisSize.min,
    children: [
      StatusMark(status: status),
      const SizedBox(width: 6),
      Text(label, style: AppText.meta),
    ],
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
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Padding(
          padding: screenPadding,
          child: Semantics(header: true, child: Text(text.fixesTitle, style: AppText.titleSection)),
        ),
        const SizedBox(height: 8),
        if (fixes.isEmpty)
          Padding(
            padding: screenPadding,
            child: Text(text.fixesEmpty, style: AppText.bodySmall),
          ),
        for (final (index, fix) in fixes.indexed) ...[
          if (index > 0) const Padding(padding: screenPadding, child: Rule()),
          _FixTile(fix: fix, requirements: result.requirements, contentLocale: contentLocale, onOpen: onOpen),
        ],
      ],
    );
  }
}

class _FixTile extends StatelessWidget {
  const _FixTile({required this.fix, required this.requirements, required this.contentLocale, required this.onOpen});

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
    return InkWell(
      onTap: target == null ? null : () => onOpen(target),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 14, 16, 14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                PriorityTag(priority: fix.priority, label: priorityLabel(text, fix.priority)),
                const SizedBox(width: 8),
                Text(targetLabel(text, fix.target), style: AppText.meta),
              ],
            ),
            const SizedBox(height: 8),
            Text.rich(
              TextSpan(text: fix.title, locale: contentLocale),
              style: AppText.body.copyWith(fontWeight: FontWeight.w600, height: 1.4),
            ),
            const SizedBox(height: 4),
            Text.rich(
              TextSpan(text: fix.detail, locale: contentLocale),
              style: AppText.bodySmall,
            ),
            if (target != null) ...[
              const SizedBox(height: 10),
              Row(
                children: [
                  for (final requirement in related) ...[
                    StatusMark(status: requirement.status, importance: requirement.importance),
                    const SizedBox(width: 4),
                  ],
                  const SizedBox(width: 4),
                  Text(text.showInCv, style: AppText.meta.copyWith(color: Tokens.ink)),
                  const Icon(Icons.chevron_right, size: 18, color: Tokens.ink),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }
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
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Padding(
          padding: screenPadding,
          child: Semantics(header: true, child: Text(text.requirementsTitle, style: AppText.titleSection)),
        ),
        if (requirements.isEmpty)
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
            child: Text(text.requirementsEmpty, style: AppText.bodySmall),
          ),
        for (final (index, (importance, items)) in halves.indexed) ...[
          if (index > 0) const Padding(padding: EdgeInsets.fromLTRB(16, 12, 16, 0), child: Rule(strong: true)),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 4),
            child: Row(
              children: [
                Expanded(child: LabelCaps(importanceLabel(text, importance))),
                Text('${items.length}', style: AppText.edgeNumber.copyWith(color: Tokens.mute, fontSize: 13)),
              ],
            ),
          ),
          for (final requirement in items) _RequirementTile(requirement: requirement, onOpen: onOpen),
        ],
      ],
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
    final refs = requirement.evidence.map((reference) => evidenceLabel(reference.evidenceId)).join(' ');
    return Semantics(
      button: true,
      label: statusLabel(text, requirement.status),
      child: InkWell(
        onTap: () => onOpen(requirement),
        child: ConstrainedBox(
          constraints: const BoxConstraints(minHeight: 48),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                SizedBox(
                  width: 14,
                  height: 21,
                  child: Center(
                    child: StatusMark(status: requirement.status, importance: requirement.importance),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(requirement.text, style: AppText.bodySmall.copyWith(color: Tokens.ink)),
                ),
                const SizedBox(width: 8),
                ExcludeSemantics(
                  child: Padding(
                    padding: const EdgeInsets.only(top: 2),
                    child: Text(
                      refs.isEmpty ? '—' : refs,
                      style: AppText.edgeNumber.copyWith(color: refs.isEmpty ? Tokens.marker : Tokens.edge),
                    ),
                  ),
                ),
              ],
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
      padding: screenPadding,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          LabelCaps(text.limitationsTitle),
          const SizedBox(height: 8),
          for (final limitation in limitations)
            Padding(
              padding: const EdgeInsets.only(bottom: 4),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('•  ', style: AppText.meta.copyWith(color: Tokens.rule)),
                  Expanded(
                    child: Text.rich(
                      TextSpan(text: limitation, locale: contentLocale),
                      style: AppText.meta.copyWith(color: Tokens.inkSoft),
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
