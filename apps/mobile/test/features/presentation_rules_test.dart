// Unit tests for the pure presentation rules ported from the web client: form validation and API error mapping,
// the default CV, result grouping and quote highlighting, auth errors, and Turkish-aware label caps.

import 'package:cv_assistant/core/api/api_client.dart';
import 'package:cv_assistant/core/api/models.dart';
import 'package:cv_assistant/features/analysis/result_view_model.dart';
import 'package:cv_assistant/features/auth/auth_errors.dart';
import 'package:cv_assistant/features/new_analysis/new_analysis_model.dart';
import 'package:flutter_test/flutter_test.dart';

NewAnalysisDraft draft({
  String? resumeId,
  ResumeSource source = ResumeSource.paste,
  String resumeTitle = '',
  String resumeText = '',
  PickedCvFile? file,
  String jobTitle = '',
  String jobText = '',
}) => NewAnalysisDraft(
  resumeId: resumeId,
  resumeSource: source,
  resumeTitle: resumeTitle,
  resumeText: resumeText,
  resumeFile: file,
  jobTitle: jobTitle,
  company: '',
  jobText: jobText,
);

RequirementMatch requirement(String id, MatchStatus status) => RequirementMatch(
  id: id,
  text: 'Requirement $id',
  category: 'technical_skill',
  importance: Importance.mustHave,
  status: status,
  reasoning: '',
  evidence: const [],
);

void main() {
  group('new analysis', () {
    test('a new CV needs a name and text, and the posting a title and text, in screen order', () {
      final problems = validateDraft(draft());
      expect(problems.keys, [Field.resumeTitle, Field.resumeText, Field.jobTitle, Field.jobText]);
      expect(problems[Field.resumeText], FieldProblem.resumeTextMissing);
    });

    test('a saved CV only needs the posting; short text is named as too short', () {
      final problems = validateDraft(draft(resumeId: 'r1', jobTitle: 'Intern', jobText: 'Too short'));
      expect(problems, {Field.jobText: FieldProblem.tooShort});
    });

    test('a PDF must be a .pdf of at most 5 MB', () {
      expect(checkUpload(null), FieldProblem.fileMissing);
      expect(checkUpload(const PickedCvFile(name: 'cv.doc', bytes: [1])), FieldProblem.fileType);
      expect(checkUpload(const PickedCvFile(name: 'CV.docx', bytes: [1])), isNull);
      expect(
        checkUpload(PickedCvFile(name: 'cv.PDF', bytes: List.filled(maxUploadBytes + 1, 0))),
        FieldProblem.fileTooLarge,
      );
      expect(checkUpload(const PickedCvFile(name: 'cv.pdf', bytes: [1])), isNull);
    });

    test('API failures land on the field of the step that failed', () {
      final encrypted = submitFailureFor(SubmitStep.resumeUpload, const ApiException(422, 'pdf_encrypted', ''));
      expect((encrypted.field, encrypted.fieldProblem), (Field.resumeFile, FieldProblem.pdfEncrypted));
      final posting = submitFailureFor(SubmitStep.jobDescription, const ApiException(422, 'validation_failed', ''));
      expect((posting.field, posting.fieldProblem), (Field.jobText, FieldProblem.tooShort));
      expect(
        submitFailureFor(SubmitStep.analysis, const ApiException(503, 'x', '')).formProblem,
        FormProblem.unavailable,
      );
      expect(
        submitFailureFor(SubmitStep.analysis, const ApiException(429, 'rate_limited', '')).formProblem,
        FormProblem.rateLimited,
      );
      expect(
        submitFailureFor(SubmitStep.analysis, const ApiException(0, 'network_error', '')).formProblem,
        FormProblem.unavailable,
      );
      expect(submitFailureFor(SubmitStep.analysis, const ApiException(422, 'x', '')).formProblem, FormProblem.generic);
    });
  });

  group('fill from a link', () {
    test('maps each API code to its message and anything unexpected to a general one', () {
      expect(linkProblemFor(const ApiException(502, 'link_blocked', '')), LinkProblem.blocked);
      expect(linkProblemFor(const ApiException(422, 'link_no_posting', '')), LinkProblem.noPosting);
      expect(linkProblemFor(const ApiException(422, 'validation_failed', '')), LinkProblem.invalid);
      expect(linkProblemFor(const ApiException(429, 'rate_limited', '')), LinkProblem.tooMany);
      expect(linkProblemFor(const ApiException(0, 'network_error', '')), LinkProblem.unavailable);
    });

    test('names the site by its host without www', () {
      expect(siteName('https://www.kariyer.net/is-ilani/x-1'), 'kariyer.net');
      expect(siteName('tr.linkedin.com/jobs/view/1'), 'tr.linkedin.com');
      expect(siteName('not a link'), isNull);
    });
  });

  group('result', () {
    test('the quoted words are split out case-insensitively', () {
      final segments = splitByQuote('Built REST APIs with FastAPI', 'rest apis');
      expect(segments.map((s) => (s.text, s.highlighted)), [
        ('Built ', false),
        ('REST APIs', true),
        (' with FastAPI', false),
      ]);
      expect(splitByQuote('Text', 'missing').single.highlighted, isFalse);
    });

    test('evidence keeps the order in which CV sections first appear', () {
      const evidence = [
        CandidateEvidence(id: 'e1', text: 'a', section: 'Experience', skills: []),
        CandidateEvidence(id: 'e2', text: 'b', section: 'Skills', skills: []),
        CandidateEvidence(id: 'e3', text: 'c', section: 'Experience', skills: []),
        CandidateEvidence(id: 'e4', text: 'd', section: ' ', skills: []),
      ];
      final sections = groupEvidenceBySection(evidence);
      expect(sections.map((s) => s.section), ['Experience', 'Skills', null]);
      expect(sections.first.items.map((e) => e.id), ['e1', 'e3']);
    });

    test('a fix opens its first unmet requirement', () {
      final requirements = [requirement('r1', MatchStatus.matched), requirement('r2', MatchStatus.partial)];
      const fix = Suggestion(
        title: '',
        detail: '',
        target: SuggestionTarget.cvSection,
        priority: Priority.high,
        relatedRequirementIds: ['r1', 'r2', 'r9'],
      );
      expect(requirementForFix(fix, requirements)!.id, 'r2');
    });

    test('fixes are ordered high, medium, low', () {
      Suggestion fix(Priority priority) => Suggestion(
        title: priority.name,
        detail: '',
        target: SuggestionTarget.skill,
        priority: priority,
        relatedRequirementIds: const [],
      );
      final sorted = sortSuggestionsByPriority([fix(Priority.low), fix(Priority.high), fix(Priority.medium)]);
      expect(sorted.map((s) => s.priority), [Priority.high, Priority.medium, Priority.low]);
    });
  });

  test('auth failures map to what the form says', () {
    expect(authProblemFor(const ApiException(401, 'invalid_credentials', '')), AuthProblem.invalidCredentials);
    expect(authProblemFor(const ApiException(409, 'email_taken', '')), AuthProblem.emailTaken);
    expect(authProblemFor(const ApiException(422, 'password_too_long', '')), AuthProblem.passwordTooLong);
    expect(authProblemFor(const ApiException(429, 'rate_limited', '')), AuthProblem.tooManyAttempts);
    expect(authProblemFor(const ApiException(0, 'network_error', '')), AuthProblem.unavailable);
    expect(looksLikeEmail('ayse@example.com'), isTrue);
    expect(looksLikeEmail('ayse@'), isFalse);
  });

  test('a supporting line marks the quote, or the whole line when the quote is not in it', () {
    expect(splitForHighlight('Python, FastAPI, pytest', 'pytest').map((s) => (s.text, s.highlighted)), [
      ('Python, FastAPI, ', false),
      ('pytest', true),
    ]);
    expect(splitForHighlight('Python, FastAPI', 'Django').map((s) => (s.text, s.highlighted)), [
      ('Python, FastAPI', true),
    ]);
  });

  test('score segments put matched first and draw must-haves twice as wide', () {
    final niceMissing = RequirementMatch(
      id: 'r3',
      text: 'Kubernetes',
      category: 'tool',
      importance: Importance.niceToHave,
      status: MatchStatus.missing,
      reasoning: '',
      evidence: const [],
    );
    final segments = scoreSegments([
      niceMissing,
      requirement('r1', MatchStatus.partial),
      requirement('r2', MatchStatus.matched),
    ]);
    expect(segments.map((s) => (s.requirement.id, s.width)), [('r2', 2), ('r1', 2), ('r3', 1)]);
  });
}
