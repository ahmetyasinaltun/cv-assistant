// The CV sheet in a bottom sheet: the chosen requirement on top with its reason in the status tint, then every line
// read from the CV. Supporting words are highlighted in the status colour, the rest dimmed, and the sheet scrolls
// itself to the first highlighted line (the mobile form of the web's "registration").

import 'package:flutter/material.dart';

import '../../core/api/models.dart';
import '../../core/theme/app_text.dart';
import '../../core/theme/tokens.dart';
import '../../l10n/app_localizations.dart';
import '../../widgets/paper.dart';
import '../../widgets/small_parts.dart';
import '../../widgets/status_mark.dart';
import 'labels.dart';
import 'result_view_model.dart';

Future<void> showEvidenceSheet(
  BuildContext context, {
  required AnalysisResult result,
  required RequirementMatch requirement,
  required String resumeTitle,
  required Locale contentLocale,
}) => showModalBottomSheet<void>(
  context: context,
  isScrollControlled: true,
  useSafeArea: true,
  builder: (context) => DraggableScrollableSheet(
    expand: false,
    initialChildSize: 0.9,
    minChildSize: 0.5,
    maxChildSize: 1,
    builder: (context, controller) => EvidenceSheetBody(
      controller: controller,
      result: result,
      requirement: requirement,
      resumeTitle: resumeTitle,
      contentLocale: contentLocale,
    ),
  ),
);

class EvidenceSheetBody extends StatefulWidget {
  const EvidenceSheetBody({
    super.key,
    required this.controller,
    required this.result,
    required this.requirement,
    required this.resumeTitle,
    required this.contentLocale,
  });

  final ScrollController controller;
  final AnalysisResult result;
  final RequirementMatch requirement;
  final String resumeTitle;
  final Locale contentLocale;

  @override
  State<EvidenceSheetBody> createState() => _EvidenceSheetBodyState();
}

class _EvidenceSheetBodyState extends State<EvidenceSheetBody> {
  final _firstHighlight = GlobalKey();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _registerSheet());
  }

  /// Brings the first highlighted line into view only when it starts below the fold, and only as far as needed, so
  /// the requirement and its note at the top stay on screen whenever the line already fits.
  void _registerSheet() {
    final target = _firstHighlight.currentContext;
    if (target == null || !mounted) return;
    final reduceMotion = MediaQuery.disableAnimationsOf(context);
    Scrollable.ensureVisible(
      target,
      alignmentPolicy: ScrollPositionAlignmentPolicy.keepVisibleAtEnd,
      duration: reduceMotion ? Duration.zero : const Duration(milliseconds: 320),
      curve: Curves.easeOutCubic,
    );
  }

  @override
  Widget build(BuildContext context) {
    final text = AppLocalizations.of(context);
    final requirement = widget.requirement;
    final quotes = {for (final reference in requirement.evidence) reference.evidenceId: reference.quote};
    final evidence = widget.result.candidateEvidence;
    final sections = groupEvidenceBySection(evidence);
    final firstHighlightedId = sections
        .expand((section) => section.items)
        .map((item) => item.id)
        .where(quotes.containsKey)
        .firstOrNull;

    return ListView(
      controller: widget.controller,
      padding: const EdgeInsets.fromLTRB(20, 0, 20, 40),
      children: [
        _RequirementNote(requirement: requirement, contentLocale: widget.contentLocale),
        const SizedBox(height: 24),
        Semantics(header: true, child: Text(widget.resumeTitle, style: AppText.title)),
        const SizedBox(height: 4),
        Text(text.sheetLines(evidence.length), style: AppText.meta),
        const SizedBox(height: 4),
        const Rule(),
        if (evidence.isEmpty)
          Padding(
            padding: const EdgeInsets.only(top: 20),
            child: Text(text.sheetEmpty, style: AppText.bodySmall),
          ),
        for (final section in sections) ...[
          const SizedBox(height: 20),
          GroupHead(section.section ?? text.otherSection),
          const SizedBox(height: 4),
          for (final item in section.items)
            Padding(
              key: item.id == firstHighlightedId ? _firstHighlight : null,
              padding: const EdgeInsets.symmetric(vertical: 7),
              child: quotes.containsKey(item.id)
                  ? Semantics(
                      hint: statusLabel(text, requirement.status),
                      child: _HighlightedLine(item: item, quote: quotes[item.id], status: requirement.status),
                    )
                  : Text(item.text, style: AppText.bodySheet.copyWith(color: Tokens.mute)),
            ),
        ],
      ],
    );
  }
}

/// The requirement on top of the sheet: its importance, its wording, and a note in its status tint with the reason.
class _RequirementNote extends StatelessWidget {
  const _RequirementNote({required this.requirement, required this.contentLocale});

  final RequirementMatch requirement;
  final Locale contentLocale;

  @override
  Widget build(BuildContext context) {
    final text = AppLocalizations.of(context);
    final tint = switch (requirement.status) {
      MatchStatus.matched => Tokens.okTint,
      MatchStatus.partial => Tokens.partialTint,
      MatchStatus.missing => Tokens.markerTint,
    };
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(importanceLabel(text, requirement.importance), style: AppText.groupHead),
        const SizedBox(height: 6),
        // Requirement wording stays in the posting's language, so it carries no content locale.
        Text(requirement.text, style: AppText.title.copyWith(fontSize: 19)),
        const SizedBox(height: 14),
        Container(
          padding: const EdgeInsets.fromLTRB(14, 12, 14, 12),
          decoration: BoxDecoration(color: tint, borderRadius: const BorderRadius.all(Radius.circular(10))),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Padding(
                padding: const EdgeInsets.only(top: 2),
                child: StatusMark(status: requirement.status),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Text.rich(
                  TextSpan(
                    style: AppText.bodySmall.copyWith(color: Tokens.ink),
                    children: [
                      TextSpan(
                        text: '${statusLabel(text, requirement.status)}. ',
                        style: const TextStyle(fontWeight: FontWeight.w600),
                      ),
                      TextSpan(text: requirement.reasoning, locale: contentLocale),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

/// A CV line that supports the requirement: ink text with the quoted words (or the whole line) under a marker fill in
/// the status colour, which fades in once when the sheet opens; at once when the system asks for less motion.
class _HighlightedLine extends StatelessWidget {
  const _HighlightedLine({required this.item, required this.quote, required this.status});

  final CandidateEvidence item;
  final String? quote;
  final MatchStatus status;

  @override
  Widget build(BuildContext context) {
    final fill = status == MatchStatus.partial ? const Color(0x5CF0AC1E) : const Color(0x381E9A4B);
    final reduceMotion = MediaQuery.disableAnimationsOf(context);
    return TweenAnimationBuilder<double>(
      tween: Tween(begin: reduceMotion ? 1 : 0, end: 1),
      duration: reduceMotion ? Duration.zero : const Duration(milliseconds: 360),
      curve: const Cubic(0.23, 1, 0.32, 1),
      builder: (context, progress, _) => Text.rich(
        TextSpan(
          style: AppText.bodySheet,
          children: [
            // CV lines stay in the CV's own language, which is not detected, so they carry no locale.
            for (final segment in splitForHighlight(item.text, quote))
              TextSpan(
                text: segment.text,
                style: segment.highlighted
                    ? TextStyle(background: Paint()..color = fill.withValues(alpha: fill.a * progress))
                    : null,
              ),
          ],
        ),
      ),
    );
  }
}
