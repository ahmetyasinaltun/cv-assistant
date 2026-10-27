// Typed calls to the shared API resources the mobile app uses; the same endpoints the web client calls.

import 'api_client.dart';
import 'models.dart';

class CareerApi {
  CareerApi(this._client);

  final ApiClient _client;

  /// The bearer token for authenticated calls; null when signed out.
  String? get token => _client.token;
  set token(String? value) => _client.token = value;

  Future<TokenResponse> login(String email, String password) async => TokenResponse.fromJson(
        await _client.post('/auth/login', json: {'email': email, 'password': password}),
      );

  Future<TokenResponse> register({
    required String fullName,
    required String email,
    required String password,
    required String preferredLanguage,
  }) async =>
      TokenResponse.fromJson(
        await _client.post('/auth/register', json: {
          'full_name': fullName,
          'email': email,
          'password': password,
          'preferred_language': preferredLanguage,
        }),
      );

  Future<User> me() async => User.fromJson(await _client.get('/me'));

  Future<User> updatePreferredLanguage(String language) async =>
      User.fromJson(await _client.patch('/me', json: {'preferred_language': language}));

  Future<SampleAnalysisInput> sampleInput() async =>
      SampleAnalysisInput.fromJson(await _client.get('/samples/analysis-input'));

  Future<List<ResumeSummary>> listResumes() async =>
      _parseList(await _client.get('/resumes'), ResumeSummary.fromJson);

  Future<ResumeSummary> createResumeFromText(String title, String text) async =>
      ResumeSummary.fromJson(await _client.post('/resumes', json: {'title': title, 'text': text}));

  Future<ResumeSummary> uploadResume(String title, List<int> pdfBytes, String filename) async =>
      ResumeSummary.fromJson(
        await _client.upload(
          '/resumes/upload',
          fields: {'title': title},
          fileField: 'file',
          bytes: pdfBytes,
          filename: filename,
        ),
      );

  Future<void> deleteResume(String resumeId) => _client.delete('/resumes/${_segment(resumeId)}');

  Future<JobDescriptionSummary> createJobDescription(String title, String? company, String text) async =>
      JobDescriptionSummary.fromJson(
        await _client.post('/job-descriptions', json: {'title': title, 'company': company, 'text': text}),
      );

  Future<List<AnalysisSummary>> listAnalyses() async =>
      _parseList(await _client.get('/analyses'), AnalysisSummary.fromJson);

  Future<AnalysisDetail> getAnalysis(String analysisId) async =>
      AnalysisDetail.fromJson(await _client.get('/analyses/${_segment(analysisId)}'));

  /// [outputLanguage] is the app language, so AI text matches what the user is reading.
  Future<AnalysisSummary> createAnalysis(
    String resumeId,
    String jobDescriptionId,
    String outputLanguage,
  ) async =>
      AnalysisSummary.fromJson(
        await _client.post('/analyses', json: {
          'resume_id': resumeId,
          'job_description_id': jobDescriptionId,
          'output_language': outputLanguage,
        }),
      );

  Future<List<InterviewQuestion>> generateInterviewQuestions(String analysisId) async => _parseList(
        await _client.post('/analyses/${_segment(analysisId)}/interview-questions'),
        InterviewQuestion.fromJson,
      );

  static String _segment(String id) => Uri.encodeComponent(id);

  static List<T> _parseList<T>(Object? body, T Function(Json) parse) =>
      (body as List).map((item) => parse(item as Json)).toList();
}
