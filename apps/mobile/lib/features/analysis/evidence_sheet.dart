// The CV sheet in a bottom sheet: the chosen requirement on top with the editor's note, then every line read from
// the CV. Supporting lines are circled with the grease-pencil loop, their quoted words underlined, the rest dimmed,
// and the sheet scrolls itself to the first circle (the mobile form of the web's "registration").

import 'package:flutter/material.dart';

import '../../core/api/models.dart';
import '../../core/theme/app_text.dart';
import '../../core/theme/tokens.dart';
import '../../l10n/app_localizations.dart';
import '../../widgets/grease_pencil_loop.dart';
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
  final _firstCircle = GlobalKey();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _registerSheet());
  }

  /// Brings the first circled line into view only when it starts below the fold, and only as far as needed, so the
  /// requirement and its note at the top stay on screen whenever the circle already fits.
  void _registerSheet() {
    final target = _firstCircle.currentContext;
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
    final firstCircledId = sections
        .expand((section) => section.items)
        .map((item) => item.id)
        .where(quotes.containsKey)
        .firstOrNull;

    return ListView(
      controller: widget.controller,
      padding: const EdgeInsets.fromLTRB(20, 0, 20, 40),
      children: [
        _RequirementNote(requirement: requirement, contentLocale: widget.contentLocale),
        const SizedBox(height: 20),
        const Rule(strong: true),
        const SizedBox(height: 20),
        Semantics(header: true, child: Text(widget.resumeTitle, style: AppText.title)),
        const SizedBox(height: 4),
        Text(text.sheetLines(evidence.length), style: AppText.meta),
        if (evidence.isEmpty)
          Padding(
            padding: const EdgeInsets.only(top: 20),
            child: Text(text.sheetEmpty, style: AppText.bodySmall),
          ),
        for (final section in sections) ...[
          const SizedBox(height: 24),
          Text(
            section.section ?? text.otherSection,
            style: AppText.meta.copyWith(color: Tokens.ink, fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 6),
          const Rule(),
          for (final item in section.items)
            if (quotes.containsKey(item.id))
              Padding(
                key: item.id == firstCircledId ? _firstCircle : null,
                padding: EdgeInsets.symmetric(vertical: loopMargin.vertical / 2 + 6),
                child: Semantics(
                  hint: statusLabel(text, requirement.status),
                  child: CircledLine(
                    seed: '${requirement.id}-${item.id}',
                    open: requirement.status == MatchStatus.partial,
                    child: _EvidenceLine(item: item, quote: quotes[item.id], circled: true),
                  ),
                ),
              )
            else
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 8),
                child: _EvidenceLine(item: item, quote: null, circled: false),
              ),
        ],
      ],
    );
  }
}

class _RequirementNote extends StatelessWidget {
  const _RequirementNote({required this.requirement, required this.contentLocale});

  final RequirementMatch requirement;
  final Locale contentLocale;

  @override
  Widget build(BuildContext context) {
    final text = AppLocalizations.of(context);
    final missing = requirement.status == MatchStatus.missing;
    final noteColor = requirement.status == MatchStatus.matched ? Tokens.inkSoft : Tokens.marker;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            StatusMark(status: requirement.status, importance: requirement.importance),
            const SizedBox(width: 8),
            LabelCaps(importanceLabel(text, requirement.importance)),
          ],
        ),
        const SizedBox(height: 8),
        // Requirement wording stays in the posting's language, so it carries no content locale.
        Text(requirement.text, style: AppText.title.copyWith(fontSize: 18)),
        const SizedBox(height: 12),
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.only(top: 2),
              child: Icon(Icons.subdirectory_arrow_right, size: 16, color: noteColor),
            ),
            const SizedBox(width: 6),
            Expanded(
              child: Text.rich(
                TextSpan(
                  style: AppText.bodySmall.copyWith(color: noteColor),
                  children: [
                    TextSpan(
                      text: '${statusLabel(text, requirement.status)}. ',
                      style: const TextStyle(fontWeight: FontWeight.w600),
                    ),
                    if (missing) TextSpan(text: '${text.missingNote(requirement.text)} '),
                    TextSpan(text: requirement.reasoning, locale: contentLocale),
                  ],
                ),
              ),
            ),
          ],
        ),
      ],
    );
  }
}

class _EvidenceLine extends StatelessWidget {
  const _EvidenceLine({required this.item, required this.quote, required this.circled});

  final CandidateEvidence item;
  final String? quote;
  final bool circled;

  @override
  Widget build(BuildContext context) {
    final color = circled ? Tokens.ink : Tokens.mute;
    final segments = splitByQuote(item.text, quote);
    // When the quote is the whole line the loop already marks it; the underline only helps when it singles out a part.
    final marksPart = segments.length > 1;
    return Text.rich(
      TextSpan(
        style: AppText.bodySheet.copyWith(color: color),
        children: [
          // CV lines stay in the CV's own language, which is not detected, so they carry no locale.
          for (final segment in segments)
            TextSpan(
              text: segment.text,
              style: segment.highlighted && marksPart
                  ? const TextStyle(
                      decoration: TextDecoration.underline,
                      decorationColor: Tokens.marker,
                      decorationThickness: 2,
                    )
                  : null,
            ),
        ],
      ),
    );
  }
}
