// One analysis: loads it, polls while it runs (paused in the background), and shows the running panel, the failure
// with the right next step, or the finished result. Pull down to refresh.

import 'package:flutter/material.dart';

import '../../app_scope.dart';
import '../../core/api/api_client.dart';
import '../../core/api/models.dart';
import '../../core/polling.dart';
import '../../l10n/app_localizations.dart';
import '../../widgets/paper.dart';
import '../new_analysis/new_analysis_screen.dart';
import 'labels.dart';
import 'result_view.dart';
import 'status_panel.dart';

class AnalysisScreen extends StatefulWidget {
  const AnalysisScreen({super.key, required this.analysisId});

  final String analysisId;

  @override
  State<AnalysisScreen> createState() => _AnalysisScreenState();
}

class _AnalysisScreenState extends State<AnalysisScreen> {
  late final _poller = Poller(onTick: _load);
  AnalysisDetail? _detail;
  bool _loadFailed = false;
  bool _starting = false;
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
      final detail = await AppScope.call(context, (api) => api.getAnalysis(widget.analysisId));
      if (!mounted) return;
      setState(() {
        _detail = detail;
        _loadFailed = false;
      });
      _poller.update(active: detail.summary.isInProgress);
    } on ApiException {
      // Keep showing the last good state while polling; only an empty screen turns into the error panel.
      if (mounted && _detail == null) setState(() => _loadFailed = true);
    }
  }

  Future<void> _rerun(AnalysisSummary summary) async {
    final navigator = Navigator.of(context);
    final messenger = ScaffoldMessenger.of(context);
    final failedText = AppLocalizations.of(context).errorStartGeneric;
    final language = AppScope.of(context).session.language;
    setState(() => _starting = true);
    try {
      final created = await AppScope.call(
        context,
        (api) => api.createAnalysis(summary.resumeId, summary.jobDescriptionId, language),
      );
      navigator.pushReplacement(MaterialPageRoute<void>(builder: (_) => AnalysisScreen(analysisId: created.id)));
    } on ApiException {
      if (!mounted) return;
      setState(() => _starting = false);
      messenger.showSnackBar(SnackBar(content: Text(failedText)));
    }
  }

  Future<List<InterviewQuestion>> _generateQuestions() =>
      AppScope.call(context, (api) => api.generateInterviewQuestions(widget.analysisId));

  @override
  Widget build(BuildContext context) {
    final text = AppLocalizations.of(context);
    return Scaffold(
      appBar: AppBar(title: Text(text.analysisTitle)),
      body: SafeArea(
        top: false,
        child: RefreshIndicator(
          onRefresh: _load,
          child: ReadableWidth(
            child: ListView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: EdgeInsets.zero,
              children: [_content(text)],
            ),
          ),
        ),
      ),
    );
  }

  Widget _content(AppLocalizations text) {
    final detail = _detail;
    if (detail == null) {
      return Padding(
        padding: const EdgeInsets.fromLTRB(16, 20, 16, 0),
        child: _loadFailed
            ? ProblemPanel(
                title: text.loadErrorTitle,
                body: text.loadErrorBody,
                actionLabel: text.tryAgain,
                onAction: () {
                  setState(() => _loadFailed = false);
                  _load();
                },
              )
            : const Padding(
                padding: EdgeInsets.only(top: 80),
                child: Center(child: CircularProgressIndicator()),
              ),
      );
    }
    final summary = detail.summary;
    final result = detail.result;
    if (summary.status == AnalysisStatus.completed && result != null) {
      return AnalysisResultView(detail: detail, result: result, generateQuestions: _generateQuestions);
    }
    final failed = summary.status == AnalysisStatus.failed;
    final needsNewInputs = needsNewInput.contains(detail.errorCode);
    return BandOverlap(
      header: ResultHeader(summary: summary),
      child: Padding(
        padding: screenPadding,
        child: failed
            ? ProblemPanel(
                title: text.failedTitle,
                body: failureReason(text, detail.errorCode),
                actionLabel: _starting
                    ? text.failedStarting
                    : (needsNewInputs ? text.failedNewAnalysis : text.failedRetry),
                onAction: _starting
                    ? null
                    : needsNewInputs
                    ? () =>
                          Navigator.of(context)
                              .pushReplacement(MaterialPageRoute<void>(builder: (_) => const NewAnalysisScreen()))
                    : () => _rerun(summary),
              )
            : RunningPanel(status: summary.status),
      ),
    );
  }
}
