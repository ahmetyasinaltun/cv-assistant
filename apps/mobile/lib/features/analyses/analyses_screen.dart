// Home for a signed-in user: the analyses list as one card over the brand band, refreshing itself while anything
// runs, with "New analysis" as the one primary action (FAB) and an empty state that offers the sample paths.

import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../app_scope.dart';
import '../../core/api/api_client.dart';
import '../../core/api/models.dart';
import '../../core/polling.dart';
import '../../core/theme/app_text.dart';
import '../../core/theme/tokens.dart';
import '../../l10n/app_localizations.dart';
import '../../widgets/account_menu.dart';
import '../../widgets/form_parts.dart';
import '../../widgets/paper.dart';
import '../../widgets/status_mark.dart';
import '../analysis/analysis_screen.dart';
import '../analysis/labels.dart';
import '../analysis/sample_analysis_screen.dart';
import '../analysis/status_panel.dart';
import '../new_analysis/new_analysis_screen.dart';

class AnalysesScreen extends StatefulWidget {
  const AnalysesScreen({super.key});

  @override
  State<AnalysesScreen> createState() => _AnalysesScreenState();
}

class _AnalysesScreenState extends State<AnalysesScreen> {
  late final _poller = Poller(onTick: _load);
  List<AnalysisSummary>? _analyses;
  bool _loadFailed = false;
  bool _started = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_started) return;
    _started = true;
    _load();
  }

  @override
  void dispose() {
    _poller.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    try {
      final analyses = await AppScope.call(context, (api) => api.listAnalyses());
      if (!mounted) return;
      setState(() {
        _analyses = analyses;
        _loadFailed = false;
      });
      _poller.update(active: analyses.any((analysis) => analysis.isInProgress));
    } on ApiException {
      if (mounted && _analyses == null) setState(() => _loadFailed = true);
    }
  }

  Future<void> _open(Widget screen) async {
    await Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => screen));
    // Back on the list: a new or rerun analysis may have been added meanwhile.
    if (mounted) _load();
  }

  @override
  Widget build(BuildContext context) {
    final text = AppLocalizations.of(context);
    return Scaffold(
      appBar: AppBar(title: Text(text.historyTitle), actions: const [AccountMenu()]),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _open(const NewAnalysisScreen()),
        icon: const Icon(Icons.add),
        label: Text(text.historyNewAnalysis),
      ),
      body: SafeArea(
        top: false,
        child: RefreshIndicator(
          onRefresh: _load,
          child: ReadableWidth(
            child: ListView(
              physics: const AlwaysScrollableScrollPhysics(),
              // Room under the last row so the FAB never covers it.
              padding: const EdgeInsets.only(bottom: 96),
              children: [
                BandOverlap(
                  overlap: 40,
                  child: Padding(padding: screenPadding, child: _content(text)),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _content(AppLocalizations text) {
    final analyses = _analyses;
    if (analyses == null) {
      return _loadFailed
          ? ProblemPanel(
              title: text.loadErrorTitle,
              body: text.loadErrorBody,
              actionLabel: text.tryAgain,
              onAction: () {
                setState(() => _loadFailed = false);
                _load();
              },
            )
          : const _ListSkeleton();
    }
    if (analyses.isEmpty) {
      return _EmptyList(
        onTrySample: () => _open(const NewAnalysisScreen(fillWithSample: true)),
        onOpenSample: () => _open(const SampleAnalysisScreen()),
      );
    }
    return PaperSheet(
      padding: EdgeInsets.zero,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          for (final (index, analysis) in analyses.indexed) ...[
            if (index > 0) const Rule(),
            _AnalysisRow(
              analysis: analysis,
              onTap: () => _open(AnalysisScreen(analysisId: analysis.id)),
            ),
          ],
        ],
      ),
    );
  }
}

class _AnalysisRow extends StatelessWidget {
  const _AnalysisRow({required this.analysis, required this.onTap});

  final AnalysisSummary analysis;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final language = Localizations.localeOf(context).toLanguageTag();
    final when = DateFormat.yMMMd(language).add_Hm().format(analysis.createdAt.toLocal());
    return Material(
      type: MaterialType.transparency,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(18, 16, 18, 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text.rich(
                TextSpan(
                  text: analysis.jobTitle,
                  style: AppText.body.copyWith(fontWeight: FontWeight.w600, height: 1.35),
                  children: [
                    if (analysis.company != null)
                      TextSpan(
                        text: ' · ${analysis.company}',
                        style: AppText.body.copyWith(color: Tokens.mute),
                      ),
                  ],
                ),
              ),
              const SizedBox(height: 4),
              Row(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Expanded(
                    child: Text(
                      analysis.resumeTitle,
                      style: AppText.bodySmall,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  const SizedBox(width: 12),
                  _ResultCell(analysis: analysis),
                ],
              ),
              const SizedBox(height: 4),
              Text(when, style: AppText.meta),
            ],
          ),
        ),
      ),
    );
  }
}

class _ResultCell extends StatelessWidget {
  const _ResultCell({required this.analysis});

  final AnalysisSummary analysis;

  @override
  Widget build(BuildContext context) {
    final text = AppLocalizations.of(context);
    switch (analysis.status) {
      case AnalysisStatus.pending || AnalysisStatus.running:
        return Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            const _RunningDot(),
            const SizedBox(width: 8),
            Text(
              analysis.status == AnalysisStatus.pending ? text.historyStatusPending : text.historyStatusRunning,
              style: AppText.meta.copyWith(color: Tokens.accentHover, fontWeight: FontWeight.w600),
            ),
          ],
        );
      case AnalysisStatus.failed:
        return Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            const StatusMark(status: MatchStatus.missing, size: 16),
            const SizedBox(width: 6),
            Text(
              text.historyStatusFailed,
              style: AppText.meta.copyWith(color: Tokens.marker, fontWeight: FontWeight.w500),
            ),
          ],
        );
      case AnalysisStatus.completed:
        final fit = analysis.fitLevel;
        return Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (fit != null) ...[
              // A fit level borrows the icon of the status it is closest to, as on the result screen.
              StatusMark(
                status: switch (fit) {
                  FitLevel.strong => MatchStatus.matched,
                  FitLevel.moderate => MatchStatus.partial,
                  FitLevel.weak => MatchStatus.missing,
                },
                size: 16,
              ),
              const SizedBox(width: 6),
              Text(fitLabel(text, fit), style: AppText.meta.copyWith(color: Tokens.inkSoft)),
              const SizedBox(width: 8),
            ],
            Text('${analysis.score ?? '–'}', style: AppText.scoreSmall),
            Text('/100', style: AppText.meta.copyWith(fontSize: 12.5, fontWeight: FontWeight.w600)),
          ],
        );
    }
  }
}

class _EmptyList extends StatelessWidget {
  const _EmptyList({required this.onTrySample, required this.onOpenSample});

  final VoidCallback onTrySample;
  final VoidCallback onOpenSample;

  @override
  Widget build(BuildContext context) {
    final text = AppLocalizations.of(context);
    return PaperSheet(
      padding: const EdgeInsets.fromLTRB(20, 24, 20, 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Semantics(header: true, child: Text(text.historyEmptyTitle, style: AppText.title)),
          const SizedBox(height: 8),
          Text(text.historyEmptyBody, style: AppText.bodySmall),
          const SizedBox(height: 16),
          Text(text.historyEmptyTryPrompt, style: AppText.bodySmall.copyWith(color: Tokens.ink)),
          TextAction(label: text.historyEmptyTryLink, onPressed: onTrySample),
          const SizedBox(height: 4),
          Text(text.historyEmptySamplePrompt, style: AppText.meta),
          TextAction(label: text.historyEmptySampleLink, onPressed: onOpenSample),
        ],
      ),
    );
  }
}

/// Static bars in the list's own shape while it loads, so the screen does not jump when rows arrive.
class _ListSkeleton extends StatelessWidget {
  const _ListSkeleton();

  @override
  Widget build(BuildContext context) {
    Widget bar(double width, double height) => Container(
      width: width,
      height: height,
      margin: const EdgeInsets.only(bottom: 8),
      decoration: const BoxDecoration(color: Tokens.deskDeep, borderRadius: BorderRadius.all(Radius.circular(3))),
    );
    return ExcludeSemantics(
      child: PaperSheet(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            for (var row = 0; row < 3; row++) ...[bar(220, 14), bar(160, 12), bar(100, 10), const SizedBox(height: 14)],
          ],
        ),
      ),
    );
  }
}

/// The running analysis in a list row: a still teal dot beside the label. It does not pulse: the list already
/// refreshes itself while anything runs, and an endless animation would only cost battery.
class _RunningDot extends StatelessWidget {
  const _RunningDot();

  @override
  Widget build(BuildContext context) => Container(
    width: 8,
    height: 8,
    decoration: const BoxDecoration(color: Tokens.accent, shape: BoxShape.circle),
  );
}
