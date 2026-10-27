// Paper panels for an analysis that is not finished: running (sweep and status label) or failed (a localized
// reason per error code and the right next step). Also the panel for a screen that could not load.

import 'package:flutter/material.dart';

import '../../core/api/models.dart';
import '../../core/theme/app_text.dart';
import '../../core/theme/tokens.dart';
import '../../l10n/app_localizations.dart';
import '../../widgets/paper.dart';
import '../../widgets/small_parts.dart';
import '../../widgets/status_mark.dart';

class RunningPanel extends StatelessWidget {
  const RunningPanel({super.key, required this.status});

  final AnalysisStatus status;

  @override
  Widget build(BuildContext context) {
    final text = AppLocalizations.of(context);
    return PaperSheet(
      padding: const EdgeInsets.fromLTRB(20, 24, 20, 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          LabelCaps(status == AnalysisStatus.pending ? text.progressPending : text.progressRunning, color: Tokens.edge),
          const SizedBox(height: 10),
          Semantics(liveRegion: true, child: Text(text.progressTitle, style: AppText.title)),
          const SizedBox(height: 16),
          const ProgressSweep(),
          const SizedBox(height: 16),
          Text(text.progressBody, style: AppText.bodySmall),
        ],
      ),
    );
  }
}

/// A failure or load error: struck mark beside the title, a plain explanation, and one graphite action.
class ProblemPanel extends StatelessWidget {
  const ProblemPanel({
    super.key,
    required this.title,
    required this.body,
    required this.actionLabel,
    required this.onAction,
  });

  final String title;
  final String body;
  final String actionLabel;
  final VoidCallback? onAction;

  @override
  Widget build(BuildContext context) => PaperSheet(
    padding: const EdgeInsets.fromLTRB(20, 24, 20, 24),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Padding(padding: EdgeInsets.only(top: 5), child: StruckMark(size: 14)),
            const SizedBox(width: 10),
            Expanded(
              child: Semantics(liveRegion: true, child: Text(title, style: AppText.title)),
            ),
          ],
        ),
        const SizedBox(height: 12),
        Text(body, style: AppText.bodySmall),
        const SizedBox(height: 20),
        FilledButton(onPressed: onAction, child: Text(actionLabel)),
      ],
    ),
  );
}
