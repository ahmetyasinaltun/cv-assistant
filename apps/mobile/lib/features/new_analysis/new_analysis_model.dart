// Pure rules for the new-analysis screen (the Dart twin of the web's new-analysis-model.ts): limits,
// obvious-mistake checks before a round trip, API error mapping and the default CV. The API stays the authority.

import '../../core/api/api_client.dart';
import '../../core/api/models.dart';

/// Mirrors the API: shorter documents are rejected, longer ones are cut to the limit.
const minDocumentChars = 50;
const maxDocumentChars = 30000;
const maxPdfBytes = 5 * 1024 * 1024;

enum Field { resumeTitle, resumeText, resumeFile, jobTitle, jobText }

enum FieldProblem {
  resumeTitleMissing,
  resumeTextMissing,
  jobTitleMissing,
  jobTextMissing,
  tooShort,
  fileMissing,
  fileType,
  fileTooLarge,
  pdfInvalid,
  pdfNoText,
  pdfEncrypted,
}

enum FormProblem { unavailable, rateLimited, generic }

enum ResumeSource { paste, upload }

class PickedPdf {
  const PickedPdf({required this.name, required this.bytes});

  final String name;
  final List<int> bytes;
}

/// What the form holds when the user presses start. [resumeId] is null for "add a new CV".
class NewAnalysisDraft {
  const NewAnalysisDraft({
    required this.resumeId,
    required this.resumeSource,
    required this.resumeTitle,
    required this.resumeText,
    required this.resumeFile,
    required this.jobTitle,
    required this.company,
    required this.jobText,
  });

  final String? resumeId;
  final ResumeSource resumeSource;
  final String resumeTitle;
  final String resumeText;
  final PickedPdf? resumeFile;
  final String jobTitle;
  final String company;
  final String jobText;
}

FieldProblem? _checkDocument(String text, FieldProblem missing) {
  final trimmed = text.trim();
  if (trimmed.isEmpty) return missing;
  if (trimmed.length < minDocumentChars) return FieldProblem.tooShort;
  return null;
}

FieldProblem? checkPdf(PickedPdf? file) {
  if (file == null) return FieldProblem.fileMissing;
  if (!file.name.toLowerCase().endsWith('.pdf')) return FieldProblem.fileType;
  if (file.bytes.length > maxPdfBytes) return FieldProblem.fileTooLarge;
  return null;
}

/// Field problems in screen order, so the first one can receive focus.
Map<Field, FieldProblem> validateDraft(NewAnalysisDraft draft) {
  final problems = <Field, FieldProblem?>{};
  if (draft.resumeId == null) {
    if (draft.resumeTitle.trim().isEmpty) problems[Field.resumeTitle] = FieldProblem.resumeTitleMissing;
    if (draft.resumeSource == ResumeSource.paste) {
      problems[Field.resumeText] = _checkDocument(draft.resumeText, FieldProblem.resumeTextMissing);
    } else {
      problems[Field.resumeFile] = checkPdf(draft.resumeFile);
    }
  }
  if (draft.jobTitle.trim().isEmpty) problems[Field.jobTitle] = FieldProblem.jobTitleMissing;
  problems[Field.jobText] = _checkDocument(draft.jobText, FieldProblem.jobTextMissing);
  return {
    for (final entry in problems.entries)
      if (entry.value != null) entry.key: entry.value!,
  };
}

/// Which step of starting an analysis failed decides which field an API error belongs to.
enum SubmitStep { resumeText, resumeUpload, jobDescription, analysis }

const _uploadProblems = {
  'file_too_large': FieldProblem.fileTooLarge,
  'unsupported_file_type': FieldProblem.fileType,
  'pdf_invalid': FieldProblem.pdfInvalid,
  'pdf_encrypted': FieldProblem.pdfEncrypted,
  'pdf_no_text': FieldProblem.pdfNoText,
  'document_too_short': FieldProblem.pdfNoText,
};

class SubmitFailure {
  const SubmitFailure({this.field, this.fieldProblem, this.formProblem});

  final Field? field;
  final FieldProblem? fieldProblem;
  final FormProblem? formProblem;
}

SubmitFailure submitFailureFor(SubmitStep step, ApiException error) {
  if (error.statusCode == 429) return const SubmitFailure(formProblem: FormProblem.rateLimited);
  if (error.statusCode == 422) {
    return switch (step) {
      SubmitStep.resumeUpload => SubmitFailure(
        field: Field.resumeFile,
        fieldProblem: _uploadProblems[error.code] ?? FieldProblem.pdfInvalid,
      ),
      SubmitStep.resumeText => const SubmitFailure(field: Field.resumeText, fieldProblem: FieldProblem.tooShort),
      SubmitStep.jobDescription => const SubmitFailure(field: Field.jobText, fieldProblem: FieldProblem.tooShort),
      SubmitStep.analysis => const SubmitFailure(formProblem: FormProblem.generic),
    };
  }
  final unreachable = error.isNetworkError || error.statusCode >= 500;
  return SubmitFailure(formProblem: unreachable ? FormProblem.unavailable : FormProblem.generic);
}

/// Why a fill from a link did not work; each maps to a sentence that names the next step (usually: paste).
enum LinkProblem { missing, invalid, notAllowed, blocked, notFound, unreachable, noPosting, tooMany, unavailable }

const _linkProblems = {
  'link_invalid': LinkProblem.invalid,
  'validation_failed': LinkProblem.invalid,
  'link_not_allowed': LinkProblem.notAllowed,
  'link_blocked': LinkProblem.blocked,
  'link_not_found': LinkProblem.notFound,
  'link_unreachable': LinkProblem.unreachable,
  'link_no_posting': LinkProblem.noPosting,
  'rate_limited': LinkProblem.tooMany,
};

LinkProblem linkProblemFor(ApiException error) => _linkProblems[error.code] ?? LinkProblem.unavailable;

/// "kariyer.net" for messages that name the site; null when the text is not a link.
String? siteName(String link) {
  final trimmed = link.trim();
  if (trimmed.isEmpty || RegExp(r'\s').hasMatch(trimmed)) return null;
  final withScheme = RegExp(r'^[a-z][a-z0-9+.-]*:', caseSensitive: false).hasMatch(trimmed) ? trimmed : 'https://$trimmed';
  final host = Uri.tryParse(withScheme)?.host ?? '';
  return host.isEmpty ? null : host.replaceFirst(RegExp(r'^www\.'), '');
}

/// How many analyses were made with each CV; deleting a CV deletes these too.
Map<String, int> analysesPerResume(List<AnalysisSummary> analyses) {
  final counts = <String, int>{};
  for (final analysis in analyses) {
    counts[analysis.resumeId] = (counts[analysis.resumeId] ?? 0) + 1;
  }
  return counts;
}

/// The CV used most recently (analyses arrive newest first), else the newest saved CV, else a new one (null).
String? defaultResumeChoice(List<AnalysisSummary> analyses, List<ResumeSummary> resumes) {
  final available = {for (final resume in resumes) resume.id};
  for (final analysis in analyses) {
    if (available.contains(analysis.resumeId)) return analysis.resumeId;
  }
  return resumes.isEmpty ? null : resumes.first.id;
}
