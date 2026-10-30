// Interview questions for a completed analysis: generated on request (one more AI call), with a writing state,
// a recoverable error, and each question's category, rationale and related requirements.

import 'package:flutter/material.dart';

import '../../core/api/api_client.dart';
import '../../core/api/models.dart';
import '../../core/theme/app_text.dart';
import '../../core/theme/tokens.dart';
import '../../l10n/app_localizations.dart';
import '../../widgets/form_parts.dart';
import '../../widgets/paper.dart';
import '../../widgets/status_mark.dart';
import 'labels.dart';

enum _QuestionsState { idle, writing, failed, ready }

class InterviewQuestionsSection extends StatefulWidget {
  const InterviewQuestionsSection({
    super.key,
    required this.initialQuestions,
    required this.requirements,
    required this.contentLocale,
    required this.generate,
  });

  final List<InterviewQuestion>? initialQuestions;
  final List<RequirementMatch> requirements;
  final Locale contentLocale;
  final Future<List<InterviewQuestion>> Function()? generate;

  @override
  State<InterviewQuestionsSection> createState() => _InterviewQuestionsSectionState();
}

class _InterviewQuestionsSectionState extends State<InterviewQuestionsSection> {
  late List<InterviewQuestion>? _questions = widget.initialQuestions;
  late _QuestionsState _state = _questions == null ? _QuestionsState.idle : _QuestionsState.ready;

  Future<void> _generate() async {
    setState(() => _state = _QuestionsState.writing);
    try {
      final questions = await widget.generate!();
      if (!mounted) return;
      setState(() {
        _questions = questions;
        _state = _QuestionsState.ready;
      });
    } on ApiException {
      if (mounted) setState(() => _state = _QuestionsState.failed);
    }
  }

  @override
  Widget build(BuildContext context) {
    final text = AppLocalizations.of(context);
    return PaperSheet(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Semantics(header: true, child: Text(text.questionsTitle, style: AppText.title)),
          const SizedBox(height: 6),
          Text(text.questionsIntro, style: AppText.bodySmall),
          const SizedBox(height: 16),
          ...switch (_state) {
            _QuestionsState.idle => [
              if (widget.generate != null) FilledButton(onPressed: _generate, child: Text(text.questionsGenerate)),
            ],
            _QuestionsState.writing => [
              Semantics(liveRegion: true, child: Text(text.questionsGenerating, style: AppText.meta)),
              const SizedBox(height: 12),
              const _QuestionSkeleton(),
            ],
            _QuestionsState.failed => [
              FormAlert(text.questionsError),
              const SizedBox(height: 12),
              FilledButton(onPressed: _generate, child: Text(text.tryAgain)),
            ],
            _QuestionsState.ready => [
              if (_questions!.isEmpty) Text(text.questionsEmpty, style: AppText.bodySmall),
              for (final (index, question) in _questions!.indexed) ...[
                if (index > 0) const Rule(),
                _QuestionItem(
                  question: question,
                  requirements: widget.requirements,
                  contentLocale: widget.contentLocale,
                ),
              ],
            ],
          },
        ],
      ),
    );
  }
}

class _QuestionItem extends StatelessWidget {
  const _QuestionItem({required this.question, required this.requirements, required this.contentLocale});

  final InterviewQuestion question;
  final List<RequirementMatch> requirements;
  final Locale contentLocale;

  @override
  Widget build(BuildContext context) {
    final text = AppLocalizations.of(context);
    final byId = {for (final requirement in requirements) requirement.id: requirement};
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: const BoxDecoration(
                  color: Tokens.deskDeep,
                  borderRadius: BorderRadius.all(Radius.circular(6)),
                ),
                child: Text(
                  categoryLabel(text, question.category),
                  style: AppText.chip.copyWith(color: Tokens.inkSoft),
                ),
              ),
              const SizedBox(width: 10),
              for (final id in question.relatedRequirementIds)
                if (byId[id] != null) ...[StatusMark(status: byId[id]!.status, size: 16), const SizedBox(width: 4)],
            ],
          ),
          const SizedBox(height: 8),
          Text.rich(
            TextSpan(text: question.question, locale: contentLocale),
            style: AppText.question,
          ),
          const SizedBox(height: 8),
          Text(
            text.questionsWhy,
            style: AppText.meta.copyWith(color: Tokens.ink, fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 2),
          Text.rich(
            TextSpan(text: question.rationale, locale: contentLocale),
            style: AppText.bodySmall,
          ),
        ],
      ),
    );
  }
}

/// Static grey bars in the shape of two questions; they stay still, so nothing moves while the AI writes.
class _QuestionSkeleton extends StatelessWidget {
  const _QuestionSkeleton();

  @override
  Widget build(BuildContext context) {
    Widget bar(double widthFactor) => Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: FractionallySizedBox(
        widthFactor: widthFactor,
        alignment: Alignment.centerLeft,
        child: Container(
          height: 12,
          decoration: const BoxDecoration(color: Tokens.deskDeep, borderRadius: BorderRadius.all(Radius.circular(3))),
        ),
      ),
    );
    return ExcludeSemantics(
      child: Column(
        children: [bar(0.3), bar(0.95), bar(0.7), const SizedBox(height: 12), bar(0.3), bar(0.9), bar(0.6)],
      ),
    );
  }
}
