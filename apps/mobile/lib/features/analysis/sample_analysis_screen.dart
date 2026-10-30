// The fictional sample result, readable without an account: the same result screen over data bundled with the app
// (exported from the web client's sample, so both clients show the same example).

import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../core/api/models.dart';
import '../../l10n/app_localizations.dart';
import '../../widgets/paper.dart';
import 'result_view.dart';

class SampleAnalysisScreen extends StatefulWidget {
  const SampleAnalysisScreen({super.key});

  @override
  State<SampleAnalysisScreen> createState() => _SampleAnalysisScreenState();
}

class _SampleAnalysisScreenState extends State<SampleAnalysisScreen> {
  // Loaded once; a rebuild (for example a language switch) reuses it.
  late final Future<AnalysisDetail> _sample = _load();

  static Future<AnalysisDetail> _load() async =>
      AnalysisDetail.fromJson(jsonDecode(await rootBundle.loadString('assets/sample/sample_analysis.json')) as Json);

  @override
  Widget build(BuildContext context) {
    final text = AppLocalizations.of(context);
    return Scaffold(
      appBar: AppBar(title: Text(text.analysisTitle)),
      body: SafeArea(
        top: false,
        child: FutureBuilder<AnalysisDetail>(
          future: _sample,
          builder: (context, snapshot) {
            final detail = snapshot.data;
            if (detail == null) return const Center(child: CircularProgressIndicator());
            return ReadableWidth(
              child: ListView(
                padding: EdgeInsets.zero,
                children: [AnalysisResultView(detail: detail, result: detail.result!, isSample: true)],
              ),
            );
          },
        ),
      ),
    );
  }
}
