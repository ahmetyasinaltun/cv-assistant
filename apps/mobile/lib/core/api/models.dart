// Dart mirror of the API contract defined by the Pydantic schemas in services/api/app/schemas/.
// Parsing is strict: an unknown enum value fails loudly instead of being guessed, because the server
// is the source of truth for statuses and scores.

typedef Json = Map<String, dynamic>;

enum AnalysisStatus { pending, running, completed, failed }

enum MatchStatus { matched, partial, missing }

enum Importance { mustHave, niceToHave }

enum FitLevel { strong, moderate, weak }

enum SuggestionTarget { skill, cvSection, project, interviewTopic }

enum Priority { high, medium, low }

enum QuestionCategory { technical, behavioral, project, gap }

/// Reads an API value such as "must_have" into the enum value named in Dart style (mustHave).
T parseEnum<T extends Enum>(List<T> values, Object? wire) {
  for (final value in values) {
    if (_snakeCase(value.name) == wire) return value;
  }
  throw ArgumentError.value(wire, T.toString(), 'Unknown value');
}

String _snakeCase(String name) =>
    name.replaceAllMapped(RegExp('[A-Z]'), (match) => '_${match[0]!.toLowerCase()}');

DateTime _date(Object? value) => DateTime.parse(value as String);

DateTime? _optionalDate(Object? value) => value == null ? null : _date(value);

List<T> _list<T>(Object? value, T Function(Json) parse) =>
    (value as List? ?? const []).map((item) => parse(item as Json)).toList();

List<String> _strings(Object? value) => (value as List? ?? const []).cast<String>();

class User {
  const User({
    required this.id,
    required this.email,
    required this.fullName,
    required this.preferredLanguage,
  });

  factory User.fromJson(Json json) => User(
        id: json['id'] as String,
        email: json['email'] as String,
        fullName: json['full_name'] as String,
        preferredLanguage: json['preferred_language'] as String,
      );

  final String id;
  final String email;
  final String fullName;

  /// Language code the account remembers ("en" or "tr").
  final String preferredLanguage;
}

class TokenResponse {
  const TokenResponse({required this.accessToken, required this.user});

  factory TokenResponse.fromJson(Json json) => TokenResponse(
        accessToken: json['access_token'] as String,
        user: User.fromJson(json['user'] as Json),
      );

  final String accessToken;
  final User user;
}

class ResumeSummary {
  const ResumeSummary({
    required this.id,
    required this.title,
    required this.sourceType,
    required this.originalFilename,
    required this.characterCount,
    required this.createdAt,
  });

  factory ResumeSummary.fromJson(Json json) => ResumeSummary(
        id: json['id'] as String,
        title: json['title'] as String,
        sourceType: json['source_type'] as String,
        originalFilename: json['original_filename'] as String?,
        characterCount: json['character_count'] as int,
        createdAt: _date(json['created_at']),
      );

  final String id;
  final String title;

  /// "text" (pasted) or "pdf" (uploaded).
  final String sourceType;
  final String? originalFilename;
  final int characterCount;
  final DateTime createdAt;
}

class JobDescriptionSummary {
  const JobDescriptionSummary({required this.id, required this.title, required this.company});

  factory JobDescriptionSummary.fromJson(Json json) => JobDescriptionSummary(
        id: json['id'] as String,
        title: json['title'] as String,
        company: json['company'] as String?,
      );

  final String id;
  final String title;
  final String? company;
}

class EvidenceReference {
  const EvidenceReference({required this.evidenceId, required this.quote, required this.similarity});

  factory EvidenceReference.fromJson(Json json) => EvidenceReference(
        evidenceId: json['evidence_id'] as String,
        quote: json['quote'] as String,
        similarity: (json['similarity'] as num).toDouble(),
      );

  final String evidenceId;
  final String quote;
  final double similarity;
}

class RequirementMatch {
  const RequirementMatch({
    required this.id,
    required this.text,
    required this.category,
    required this.importance,
    required this.status,
    required this.reasoning,
    required this.evidence,
  });

  factory RequirementMatch.fromJson(Json json) => RequirementMatch(
        id: json['id'] as String,
        text: json['text'] as String,
        category: json['category'] as String,
        importance: parseEnum(Importance.values, json['importance']),
        status: parseEnum(MatchStatus.values, json['status']),
        reasoning: json['reasoning'] as String,
        evidence: _list(json['evidence'], EvidenceReference.fromJson),
      );

  final String id;

  /// Requirement wording in the posting's own language.
  final String text;
  final String category;
  final Importance importance;
  final MatchStatus status;

  /// Written in the analysis's output language.
  final String reasoning;
  final List<EvidenceReference> evidence;
}

class CandidateEvidence {
  const CandidateEvidence({
    required this.id,
    required this.text,
    required this.section,
    required this.skills,
  });

  factory CandidateEvidence.fromJson(Json json) => CandidateEvidence(
        id: json['id'] as String,
        text: json['text'] as String,
        section: json['section'] as String?,
        skills: _strings(json['skills']),
      );

  final String id;

  /// A CV line, verbatim, in the CV's own language.
  final String text;
  final String? section;
  final List<String> skills;
}

class Suggestion {
  const Suggestion({
    required this.title,
    required this.detail,
    required this.target,
    required this.priority,
    required this.relatedRequirementIds,
  });

  factory Suggestion.fromJson(Json json) => Suggestion(
        title: json['title'] as String,
        detail: json['detail'] as String,
        target: parseEnum(SuggestionTarget.values, json['target']),
        priority: parseEnum(Priority.values, json['priority']),
        relatedRequirementIds: _strings(json['related_requirement_ids']),
      );

  final String title;
  final String detail;
  final SuggestionTarget target;
  final Priority priority;
  final List<String> relatedRequirementIds;
}

class OverallMatch {
  const OverallMatch({
    required this.score,
    required this.fitLevel,
    required this.summary,
    required this.scoreExplanation,
    required this.limitations,
  });

  factory OverallMatch.fromJson(Json json) => OverallMatch(
        score: json['score'] as int,
        fitLevel: parseEnum(FitLevel.values, json['fit_level']),
        summary: json['summary'] as String,
        scoreExplanation: json['score_explanation'] as String,
        limitations: _strings(json['limitations']),
      );

  final int score;
  final FitLevel fitLevel;
  final String summary;
  final String scoreExplanation;
  final List<String> limitations;
}

class AnalysisResult {
  const AnalysisResult({
    required this.overall,
    required this.requirements,
    required this.candidateEvidence,
    required this.suggestions,
  });

  factory AnalysisResult.fromJson(Json json) => AnalysisResult(
        overall: OverallMatch.fromJson(json['overall'] as Json),
        requirements: _list(json['requirements'], RequirementMatch.fromJson),
        candidateEvidence: _list(json['candidate_evidence'], CandidateEvidence.fromJson),
        suggestions: _list(json['suggestions'], Suggestion.fromJson),
      );

  final OverallMatch overall;
  final List<RequirementMatch> requirements;
  final List<CandidateEvidence> candidateEvidence;
  final List<Suggestion> suggestions;
}

class InterviewQuestion {
  const InterviewQuestion({
    required this.question,
    required this.category,
    required this.rationale,
    required this.relatedRequirementIds,
  });

  factory InterviewQuestion.fromJson(Json json) => InterviewQuestion(
        question: json['question'] as String,
        category: parseEnum(QuestionCategory.values, json['category']),
        rationale: json['rationale'] as String,
        relatedRequirementIds: _strings(json['related_requirement_ids']),
      );

  final String question;
  final QuestionCategory category;
  final String rationale;
  final List<String> relatedRequirementIds;
}

class AnalysisSummary {
  const AnalysisSummary({
    required this.id,
    required this.status,
    required this.outputLanguage,
    required this.resumeId,
    required this.jobDescriptionId,
    required this.resumeTitle,
    required this.jobTitle,
    required this.company,
    required this.score,
    required this.fitLevel,
    required this.createdAt,
    required this.completedAt,
  });

  factory AnalysisSummary.fromJson(Json json) => AnalysisSummary(
        id: json['id'] as String,
        status: parseEnum(AnalysisStatus.values, json['status']),
        outputLanguage: json['output_language'] as String,
        resumeId: json['resume_id'] as String,
        jobDescriptionId: json['job_description_id'] as String,
        resumeTitle: json['resume_title'] as String,
        jobTitle: json['job_title'] as String,
        company: json['company'] as String?,
        score: json['score'] as int?,
        fitLevel: json['fit_level'] == null
            ? null
            : parseEnum(FitLevel.values, json['fit_level']),
        createdAt: _date(json['created_at']),
        completedAt: _optionalDate(json['completed_at']),
      );

  final String id;
  final AnalysisStatus status;

  /// Language of the AI-written text; it can differ from the app language.
  final String outputLanguage;
  final String resumeId;
  final String jobDescriptionId;
  final String resumeTitle;
  final String jobTitle;
  final String? company;
  final int? score;
  final FitLevel? fitLevel;
  final DateTime createdAt;
  final DateTime? completedAt;

  bool get isInProgress => status == AnalysisStatus.pending || status == AnalysisStatus.running;
}

class AnalysisDetail {
  const AnalysisDetail({
    required this.summary,
    required this.result,
    required this.interviewQuestions,
    required this.errorCode,
  });

  factory AnalysisDetail.fromJson(Json json) => AnalysisDetail(
        summary: AnalysisSummary.fromJson(json),
        result: json['result'] == null ? null : AnalysisResult.fromJson(json['result'] as Json),
        interviewQuestions: json['interview_questions'] == null
            ? null
            : _list(json['interview_questions'], InterviewQuestion.fromJson),
        errorCode: json['error_code'] as String?,
      );

  final AnalysisSummary summary;
  final AnalysisResult? result;
  final List<InterviewQuestion>? interviewQuestions;

  /// Stable reason for a failure (e.g. "ai_quota_exhausted"); the app maps it to localized text.
  final String? errorCode;
}

class SampleAnalysisInput {
  const SampleAnalysisInput({
    required this.resumeTitle,
    required this.resumeText,
    required this.jobTitle,
    required this.company,
    required this.jobText,
  });

  factory SampleAnalysisInput.fromJson(Json json) {
    final resume = json['resume'] as Json;
    final job = json['job_description'] as Json;
    return SampleAnalysisInput(
      resumeTitle: resume['title'] as String,
      resumeText: resume['text'] as String,
      jobTitle: job['title'] as String,
      company: job['company'] as String?,
      jobText: job['text'] as String,
    );
  }

  final String resumeTitle;
  final String resumeText;
  final String jobTitle;
  final String? company;
  final String jobText;
}
