// New analysis on one scrolling screen: the CV sheet (pick a saved CV or add one by paste or PDF) above the posting
// sheet, one start action, and "fill with the sample" in the app bar. Starting saves the CV if new, saves the
// posting, starts the analysis and opens it; a failure keeps every typed character and names the field at fault.

import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../app_scope.dart';
import '../../core/api/api_client.dart';
import '../../core/api/models.dart';
import '../../core/theme/app_text.dart';
import '../../core/theme/tokens.dart';
import '../../l10n/app_localizations.dart';
import '../../widgets/form_parts.dart';
import '../../widgets/paper.dart';
import '../../widgets/small_parts.dart';
import '../analysis/analysis_screen.dart';
import '../analysis/status_panel.dart';
import 'new_analysis_model.dart';
import 'resume_sheet.dart';

const _newResume = '';

class NewAnalysisScreen extends StatefulWidget {
  const NewAnalysisScreen({super.key, this.fillWithSample = false});

  /// Opened from the empty list's "try it with the sample": fill the form once it has loaded.
  final bool fillWithSample;

  @override
  State<NewAnalysisScreen> createState() => _NewAnalysisScreenState();
}

class _NewAnalysisScreenState extends State<NewAnalysisScreen> {
  final _resumeTitle = TextEditingController();
  final _resumeText = TextEditingController();
  final _jobTitle = TextEditingController();
  final _company = TextEditingController();
  final _jobText = TextEditingController();
  final _focus = {for (final field in Field.values) field: FocusNode()};

  List<ResumeSummary>? _resumes;
  List<AnalysisSummary> _analyses = const [];
  bool _loadFailed = false;
  bool _started = false;

  String _choice = _newResume;
  ResumeSource _source = ResumeSource.paste;
  PickedPdf? _file;
  Map<Field, FieldProblem> _problems = {};
  FormProblem? _formProblem;
  bool _submitting = false;
  bool _sampleFilled = false;

  String? _confirmingDeleteId;
  bool _deleting = false;
  bool _deleteFailed = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_started) return;
    _started = true;
    _load(fillSample: widget.fillWithSample);
  }

  @override
  void dispose() {
    for (final controller in [_resumeTitle, _resumeText, _jobTitle, _company, _jobText]) {
      controller.dispose();
    }
    for (final node in _focus.values) {
      node.dispose();
    }
    super.dispose();
  }

  Future<void> _load({bool fillSample = false, String? select}) async {
    try {
      final (resumes, analyses) = await AppScope.call(
        context,
        (api) async => (await api.listResumes(), await api.listAnalyses()),
      );
      if (!mounted) return;
      setState(() {
        _resumes = resumes;
        _analyses = analyses;
        _loadFailed = false;
        final available = resumes.any((resume) => resume.id == _choice);
        _choice = select ?? (available ? _choice : defaultResumeChoice(analyses, resumes) ?? _newResume);
      });
      if (fillSample) await _fillSample();
    } on ApiException {
      if (mounted && _resumes == null) setState(() => _loadFailed = true);
    }
  }

  /// Fills both sheets with the fictional sample; a sample CV saved earlier is reused, not saved twice.
  Future<void> _fillSample() async {
    try {
      final sample = await AppScope.call(context, (api) => api.sampleInput());
      if (!mounted) return;
      final saved = _resumes?.where((resume) => resume.title == sample.resumeTitle).firstOrNull;
      setState(() {
        if (saved != null) {
          _choice = saved.id;
        } else {
          _choice = _newResume;
          _source = ResumeSource.paste;
          _resumeTitle.text = sample.resumeTitle;
          _resumeText.text = sample.resumeText;
        }
        _jobTitle.text = sample.jobTitle;
        _company.text = sample.company ?? '';
        _jobText.text = sample.jobText;
        _problems = {};
        _formProblem = null;
        _sampleFilled = true;
      });
    } on ApiException {
      if (mounted) setState(() => _formProblem = FormProblem.unavailable);
    }
  }

  Future<void> _pickPdf() async {
    final file = await FilePicker.pickFile(type: FileType.custom, allowedExtensions: const ['pdf']);
    if (file == null) return;
    final bytes = await file.readAsBytes();
    if (!mounted) return;
    setState(() {
      _file = PickedPdf(name: file.name, bytes: bytes);
      final problem = checkPdf(_file);
      _problems = {..._problems}..remove(Field.resumeFile);
      if (problem != null) _problems[Field.resumeFile] = problem;
    });
  }

  NewAnalysisDraft get _draft => NewAnalysisDraft(
    resumeId: _choice == _newResume ? null : _choice,
    resumeSource: _source,
    resumeTitle: _resumeTitle.text,
    resumeText: _resumeText.text,
    resumeFile: _file,
    jobTitle: _jobTitle.text,
    company: _company.text,
    jobText: _jobText.text,
  );

  Future<void> _submit() async {
    final draft = _draft;
    final problems = validateDraft(draft);
    setState(() {
      _problems = problems;
      _formProblem = null;
    });
    if (problems.isNotEmpty) {
      _focus[Field.values.firstWhere(problems.containsKey)]!.requestFocus();
      return;
    }
    setState(() => _submitting = true);
    final navigator = Navigator.of(context);
    final language = AppScope.of(context).session.language;
    var step = SubmitStep.analysis;
    var resumeId = draft.resumeId;
    String? savedResumeId;
    try {
      if (resumeId == null) {
        final title = draft.resumeTitle.trim();
        if (draft.resumeSource == ResumeSource.upload) {
          step = SubmitStep.resumeUpload;
          final file = draft.resumeFile!;
          resumeId = (await AppScope.call(context, (api) => api.uploadResume(title, file.bytes, file.name))).id;
        } else {
          step = SubmitStep.resumeText;
          resumeId = (await AppScope.call(context, (api) => api.createResumeFromText(title, draft.resumeText))).id;
        }
        savedResumeId = resumeId;
      }
      step = SubmitStep.jobDescription;
      final company = draft.company.trim();
      if (!mounted) return;
      final job = await AppScope.call(
        context,
        (api) => api.createJobDescription(draft.jobTitle.trim(), company.isEmpty ? null : company, draft.jobText),
      );
      step = SubmitStep.analysis;
      if (!mounted) return;
      final finalResumeId = resumeId;
      final created = await AppScope.call(context, (api) => api.createAnalysis(finalResumeId, job.id, language));
      navigator.pushReplacement(MaterialPageRoute<void>(builder: (_) => AnalysisScreen(analysisId: created.id)));
    } on ApiException catch (error) {
      if (!mounted || error.isUnauthorized) return;
      final failure = submitFailureFor(step, error);
      setState(() {
        _submitting = false;
        _formProblem = failure.formProblem;
        if (failure.field != null) _problems = {failure.field!: failure.fieldProblem!};
      });
      if (failure.field != null) _focus[failure.field!]!.requestFocus();
      // A CV saved before a later step failed is selected, so a retry does not save it twice.
      if (savedResumeId != null) await _load(select: savedResumeId);
    }
  }

  Future<void> _deleteResume(String resumeId) async {
    setState(() {
      _deleting = true;
      _deleteFailed = false;
    });
    try {
      await AppScope.call(context, (api) => api.deleteResume(resumeId));
      if (!mounted) return;
      setState(() {
        _confirmingDeleteId = null;
        _deleting = false;
        if (_choice == resumeId) _choice = _newResume;
      });
      await _load();
    } on ApiException {
      if (mounted) {
        setState(() {
          _deleting = false;
          _deleteFailed = true;
        });
      }
    }
  }

  bool get _hasInput =>
      [_resumeTitle, _resumeText, _jobTitle, _company, _jobText].any((c) => c.text.trim().isNotEmpty) || _file != null;

  Future<void> _confirmLeave() async {
    final text = AppLocalizations.of(context);
    final navigator = Navigator.of(context);
    final discard = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(text.discardTitle),
        content: Text(text.discardBody),
        actions: [
          TextButton(onPressed: () => Navigator.of(context).pop(false), child: Text(text.discardCancel)),
          TextButton(onPressed: () => Navigator.of(context).pop(true), child: Text(text.discardConfirm)),
        ],
      ),
    );
    if (discard == true) navigator.pop();
  }

  String _problemText(AppLocalizations text, FieldProblem problem) => switch (problem) {
    FieldProblem.resumeTitleMissing => text.errorResumeTitleMissing,
    FieldProblem.resumeTextMissing => text.errorResumeTextMissing,
    FieldProblem.jobTitleMissing => text.errorJobTitleMissing,
    FieldProblem.jobTextMissing => text.errorJobTextMissing,
    FieldProblem.tooShort => text.errorTooShort,
    FieldProblem.fileMissing => text.errorFileMissing,
    FieldProblem.fileType => text.errorFileType,
    FieldProblem.fileTooLarge => text.errorFileTooLarge,
    FieldProblem.pdfInvalid => text.errorPdfInvalid,
    FieldProblem.pdfNoText => text.errorPdfNoText,
    FieldProblem.pdfEncrypted => text.errorPdfEncrypted,
  };

  String? _error(AppLocalizations text, Field field) {
    final problem = _problems[field];
    return problem == null ? null : _problemText(text, problem);
  }

  /// Editing a field clears its error.
  void _clear(Field field) {
    if (_problems.containsKey(field)) setState(() => _problems = {..._problems}..remove(field));
  }

  @override
  Widget build(BuildContext context) {
    final text = AppLocalizations.of(context);
    return PopScope(
      canPop: !_hasInput || _submitting,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) _confirmLeave();
      },
      child: Scaffold(
        appBar: AppBar(
          title: Text(text.newAnalysisTitle),
          actions: [
            TextButton(
              onPressed: _resumes == null || _submitting ? null : _fillSample,
              style: TextButton.styleFrom(foregroundColor: Tokens.onBrand),
              child: Text(text.fillSample, style: AppText.button.copyWith(color: Tokens.onBrand)),
            ),
            const SizedBox(width: 8),
          ],
        ),
        body: SafeArea(top: false, child: ReadableWidth(child: _body(text))),
      ),
    );
  }

  Widget _body(AppLocalizations text) {
    if (_resumes == null) {
      return ListView(
        padding: const EdgeInsets.only(bottom: 32),
        children: [
          BandOverlap(
            overlap: 40,
            child: Padding(
              padding: screenPadding,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  if (_loadFailed)
                    ProblemPanel(
                      title: text.loadErrorTitle,
                      body: text.loadErrorBody,
                      actionLabel: text.tryAgain,
                      onAction: () {
                        setState(() => _loadFailed = false);
                        _load(fillSample: widget.fillWithSample);
                      },
                    )
                  else ...[
                    // Blank sheets in the final layout while the saved CVs load.
                    const PaperSheet(child: SizedBox(height: 180)),
                    const SizedBox(height: 16),
                    const PaperSheet(child: SizedBox(height: 260)),
                  ],
                ],
              ),
            ),
          ),
        ],
      );
    }
    return ListView(
      padding: const EdgeInsets.only(bottom: 40),
      children: [
        BandOverlap(
          overlap: 40,
          header: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(text.newAnalysisIntro, style: AppText.bodySmall.copyWith(color: Tokens.onBrandSoft)),
              if (_sampleFilled) ...[
                const SizedBox(height: 12),
                Semantics(liveRegion: true, child: SampleNotice(text.sampleFilled)),
              ],
            ],
          ),
          child: Padding(padding: screenPadding, child: _resumeSheet(text)),
        ),
        const SizedBox(height: 16),
        Padding(padding: screenPadding, child: _postingSheet(text)),
        Padding(
          padding: screenPadding,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              if (_formProblem != null) ...[
                const SizedBox(height: 20),
                FormAlert(
                  _formProblem == FormProblem.unavailable ? text.errorStartUnavailable : text.errorStartGeneric,
                ),
              ],
              const SizedBox(height: 20),
              FilledButton(
                onPressed: _submitting ? null : _submit,
                child: Text(_submitting ? text.submittingAnalysis : text.submitAnalysis),
              ),
              const SizedBox(height: 8),
              Text(text.submitNote, style: AppText.meta),
            ],
          ),
        ),
      ],
    );
  }

  Widget _resumeSheet(AppLocalizations text) {
    final resumes = _resumes!;
    final counts = analysesPerResume(_analyses);
    final addingNew = _choice == _newResume;
    final reduceMotion = MediaQuery.disableAnimationsOf(context);
    return PaperSheet(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Semantics(header: true, child: Text(text.resumeSheetTitle, style: AppText.title)),
          const SizedBox(height: 12),
          if (resumes.isNotEmpty) ...[
            Text(text.resumeLegend, style: AppText.bodySmall),
            const SizedBox(height: 6),
            RadioGroup<String>(
              groupValue: _choice,
              onChanged: (value) => setState(() => _choice = value ?? _newResume),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  for (final resume in resumes)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 2),
                      child: resume.id == _confirmingDeleteId
                          ? DeleteConfirmBand(
                              title: resume.title,
                              analysisCount: counts[resume.id] ?? 0,
                              deleting: _deleting,
                              failed: _deleteFailed,
                              onConfirm: () => _deleteResume(resume.id),
                              onCancel: () => setState(() {
                                _confirmingDeleteId = null;
                                _deleteFailed = false;
                              }),
                            )
                          : SavedResumeRow(
                              resume: resume,
                              selected: _choice == resume.id,
                              onSelect: () => setState(() => _choice = resume.id),
                              onDelete: () => setState(() {
                                _confirmingDeleteId = resume.id;
                                _deleteFailed = false;
                              }),
                            ),
                    ),
                  Material(
                    color: addingNew ? Tokens.accentTint : Colors.transparent,
                    borderRadius: const BorderRadius.all(Radius.circular(10)),
                    child: InkWell(
                      onTap: () => setState(() => _choice = _newResume),
                      borderRadius: const BorderRadius.all(Radius.circular(10)),
                      child: Row(
                        children: [
                          const Radio<String>(value: _newResume),
                          Text(text.resumeAddNew, style: AppText.fieldLabel),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ] else
            Text(text.resumeAddFirst, style: AppText.fieldLabel),
          // The new-CV fields settle in under their choice (design system: "Reveal").
          AnimatedSize(
            duration: reduceMotion ? Duration.zero : const Duration(milliseconds: 200),
            curve: const Cubic(0.23, 1, 0.32, 1),
            alignment: Alignment.topCenter,
            child: addingNew ? _newResumeFields(text) : const SizedBox(width: double.infinity),
          ),
        ],
      ),
    );
  }

  Widget _newResumeFields(AppLocalizations text) => Padding(
    padding: const EdgeInsets.only(top: 16),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        LabeledField(
          label: text.resumeNameLabel,
          controller: _resumeTitle,
          focusNode: _focus[Field.resumeTitle],
          hint: text.resumeNameHint,
          error: _error(text, Field.resumeTitle),
          textInputAction: TextInputAction.next,
          onChanged: (_) => _clear(Field.resumeTitle),
        ),
        const SizedBox(height: 16),
        Text(text.resumeSourceLegend, style: AppText.fieldLabel),
        const SizedBox(height: 6),
        SegmentedButton<ResumeSource>(
          segments: [
            ButtonSegment(value: ResumeSource.paste, label: Text(text.resumePaste)),
            ButtonSegment(value: ResumeSource.upload, label: Text(text.resumeUpload)),
          ],
          selected: {_source},
          showSelectedIcon: false,
          onSelectionChanged: (selection) => setState(() => _source = selection.first),
          style: SegmentedButton.styleFrom(
            backgroundColor: Tokens.desk,
            foregroundColor: Tokens.inkSoft,
            selectedBackgroundColor: Tokens.accentTint,
            selectedForegroundColor: Tokens.accentHover,
            side: const BorderSide(color: Tokens.rule),
            textStyle: AppText.button,
            shape: const RoundedRectangleBorder(borderRadius: BorderRadius.all(Radius.circular(10))),
          ),
        ),
        const SizedBox(height: 16),
        if (_source == ResumeSource.paste)
          _documentField(
            text,
            label: text.resumeTextLabel,
            controller: _resumeText,
            field: Field.resumeText,
            placeholder: text.resumeTextPlaceholder,
          )
        else
          PdfPicker(
            file: _file,
            focusNode: _focus[Field.resumeFile],
            error: _error(text, Field.resumeFile),
            onPick: _pickPdf,
          ),
      ],
    ),
  );

  Widget _postingSheet(AppLocalizations text) => PaperSheet(
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Semantics(header: true, child: Text(text.postingSheetTitle, style: AppText.title)),
        const SizedBox(height: 12),
        LabeledField(
          label: text.postingTitleLabel,
          controller: _jobTitle,
          focusNode: _focus[Field.jobTitle],
          error: _error(text, Field.jobTitle),
          textInputAction: TextInputAction.next,
          onChanged: (_) => _clear(Field.jobTitle),
        ),
        const SizedBox(height: 16),
        LabeledField(
          label: text.postingCompanyLabel,
          optionalNote: text.optional,
          controller: _company,
          textInputAction: TextInputAction.next,
        ),
        const SizedBox(height: 16),
        _documentField(
          text,
          label: text.postingTextLabel,
          controller: _jobText,
          field: Field.jobText,
          placeholder: text.postingTextPlaceholder,
        ),
      ],
    ),
  );

  /// A long text field with its character count; past the limit the count turns amber and says what is read.
  Widget _documentField(
    AppLocalizations text, {
    required String label,
    required TextEditingController controller,
    required Field field,
    required String placeholder,
  }) {
    final numbers = NumberFormat.decimalPattern(Localizations.localeOf(context).toLanguageTag());
    return ValueListenableBuilder<TextEditingValue>(
      valueListenable: controller,
      builder: (context, value, _) {
        final count = value.text.length;
        final over = count > maxDocumentChars;
        final color = over ? Tokens.partial : Tokens.mute;
        final max = numbers.format(maxDocumentChars);
        return LabeledField(
          label: label,
          controller: controller,
          focusNode: _focus[field],
          placeholder: placeholder,
          multiline: true,
          error: _error(text, field),
          onChanged: (_) => _clear(field),
          below: Padding(
            padding: const EdgeInsets.only(top: 6),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: over
                      ? Text(text.overLimit(max), style: AppText.meta.copyWith(color: color))
                      : const SizedBox(),
                ),
                Text(
                  text.characterCount(numbers.format(count), max),
                  style: AppText.meta.copyWith(
                    fontSize: 13,
                    color: color,
                    fontFeatures: const [FontFeature.tabularFigures()],
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}
