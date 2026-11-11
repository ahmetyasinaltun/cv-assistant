// Unit tests for parsing the API contract, including a completed analysis with its result and questions.

import 'package:cv_assistant/core/api/models.dart';
import 'package:flutter_test/flutter_test.dart';

Map<String, dynamic> analysisJson({String status = 'completed', Object? result}) => {
  'id': 'a1',
  'status': status,
  'output_language': 'tr',
  'resume_id': 'r1',
  'job_description_id': 'j1',
  'resume_title': 'CV',
  'job_title': 'Stajyer Veri Analisti',
  'company': null,
  'score': 77,
  'fit_level': 'strong',
  'created_at': '2026-10-27T10:00:00Z',
  'completed_at': '2026-10-27T10:00:35Z',
  'result': result,
  'interview_questions': [
    {
      'question': 'SQL sorgularını nasıl yazdın?',
      'category': 'project',
      'rationale': 'Stajındaki SQL deneyimini anlatman beklenir.',
      'related_requirement_ids': ['r2'],
    },
  ],
  'error_code': null,
  'error_message': null,
};

const resultJson = {
  'overall': {
    'score': 77,
    'fit_level': 'strong',
    'summary': 'SQL ve Python şartlarını karşılıyorsun.',
    'score_explanation': 'Her şart eşleşti (1), kısmi (0,5) ya da eksik (0) sayılır.',
    'limitations': ['Deneyimin derinliği CV’den anlaşılmıyor.'],
  },
  'requirements': [
    {
      'id': 'r2',
      'text': 'SQL ile veri sorgulama deneyimi',
      'category': 'technical_skill',
      'importance': 'must_have',
      'status': 'matched',
      'reasoning': 'Stajında SQL sorgularıyla veri çektiğini belirtiyorsun.',
      'evidence': [
        {'evidence_id': 'e2', 'quote': 'Depo sevkiyat verilerini SQL sorgularıyla çekip', 'similarity': 0.66},
      ],
    },
  ],
  'candidate_evidence': [
    {
      'id': 'e2',
      'text': 'Depo sevkiyat verilerini SQL sorgularıyla çekip',
      'section': 'Deneyim',
      'skills': ['SQL'],
    },
  ],
  'suggestions': [
    {
      'title': 'Power BI öğren',
      'detail': 'Küçük bir pano projesi yap.',
      'target': 'project',
      'priority': 'medium',
      'related_requirement_ids': ['r5'],
    },
  ],
};

void main() {
  test('parses a completed analysis with its result and interview questions', () {
    final detail = AnalysisDetail.fromJson(analysisJson(result: resultJson));

    expect(detail.summary.outputLanguage, 'tr');
    expect(detail.summary.status, AnalysisStatus.completed);
    expect(detail.summary.isInProgress, isFalse);
    expect(detail.result!.overall.fitLevel, FitLevel.strong);
    final requirement = detail.result!.requirements.single;
    expect(requirement.status, MatchStatus.matched);
    expect(requirement.importance, Importance.mustHave);
    expect(requirement.evidence.single.similarity, closeTo(0.66, 1e-9));
    expect(detail.result!.suggestions.single.priority, Priority.medium);
    expect(detail.interviewQuestions!.single.category, QuestionCategory.project);
  });

  test('parses a running analysis without a result', () {
    final detail = AnalysisDetail.fromJson(
      analysisJson(status: 'running')
        ..['score'] = null
        ..['fit_level'] = null
        ..['completed_at'] = null
        ..['interview_questions'] = null,
    );

    expect(detail.summary.isInProgress, isTrue);
    expect(detail.summary.fitLevel, isNull);
    expect(detail.result, isNull);
    expect(detail.interviewQuestions, isNull);
  });

  test('fails loudly on a status the app does not know', () {
    expect(() => AnalysisSummary.fromJson(analysisJson(status: 'archived')), throwsArgumentError);
  });
}
