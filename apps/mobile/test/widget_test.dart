// Widget tests for the main flows against a scripted fake API: start-up retry, the account language, sign-in errors,
// the analyses list states, the sample result (fixes first, CV sheet with a circled line) and form validation.

import 'package:career_assistant/app.dart';
import 'package:career_assistant/core/session/session_controller.dart';
import 'package:career_assistant/features/analysis/sample_analysis_screen.dart';
import 'package:career_assistant/widgets/grease_pencil_loop.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'core/fake_api.dart';

Map<String, Object?> summaryJson(String id, String status, {int? score, String? fit}) => {
  'id': id,
  'status': status,
  'output_language': 'en',
  'resume_id': 'r1',
  'job_description_id': 'j$id',
  'resume_title': 'CV, October 2026',
  'job_title': 'Job $id',
  'company': 'Acme',
  'score': score,
  'fit_level': fit,
  'created_at': '2026-10-27T10:00:00Z',
  'completed_at': null,
};

Future<FakeApi> pumpApp(WidgetTester tester, FakeApi fake, {String? token, String device = 'en'}) async {
  final api = fake.build();
  final session = SessionController(api: api, tokens: MemoryTokenStore(token), deviceLanguage: device);
  await tester.pumpWidget(CareerAssistantApp(api: api, session: session));
  await tester.pumpAndSettle();
  return fake;
}

/// Unmounts the app so screens that poll cancel their timers before the test ends.
Future<void> unmount(WidgetTester tester) => tester.pumpWidget(const SizedBox());

void main() {
  testWidgets('offers a retry when the server is unreachable, then opens the analyses list', (tester) async {
    final fake = FakeApi()
      ..offline = true
      ..on('GET /me', 200, userJson())
      ..on('GET /analyses', 200, []);
    await pumpApp(tester, fake, token: 'token-1');
    expect(find.text('Try again'), findsOneWidget);

    fake.offline = false;
    await tester.tap(find.text('Try again'));
    await tester.pumpAndSettle();
    expect(find.text('No analyses yet'), findsOneWidget);
    expect(find.text('New analysis'), findsOneWidget);
    await unmount(tester);
  });

  testWidgets('opens in the account language even on an English device', (tester) async {
    final fake = FakeApi()
      ..on('GET /me', 200, userJson(language: 'tr'))
      ..on('GET /analyses', 200, []);
    await pumpApp(tester, fake, token: 'token-1');

    expect(find.text('Analizler'), findsOneWidget);
    expect(find.text('Henüz analiz yok'), findsOneWidget);
    await unmount(tester);
  });

  testWidgets('a wrong password keeps the email and explains the problem', (tester) async {
    final fake = FakeApi()..on('POST /auth/login', 401, FakeApi.error('invalid_credentials'));
    await pumpApp(tester, fake);

    await tester.enterText(find.byType(TextField).at(0), 'ayse@example.com');
    await tester.enterText(find.byType(TextField).at(1), 'wrong-password');
    await tester.tap(find.widgetWithText(FilledButton, 'Sign in'));
    await tester.pumpAndSettle();

    expect(find.textContaining('do not match an account'), findsOneWidget);
    expect(find.text('ayse@example.com'), findsOneWidget);
  });

  testWidgets('empty sign-in fields are named before any request', (tester) async {
    final fake = await pumpApp(tester, FakeApi());

    await tester.tap(find.widgetWithText(FilledButton, 'Sign in'));
    await tester.pumpAndSettle();

    expect(find.text('Enter your email address.'), findsOneWidget);
    expect(find.text('Enter your password.'), findsOneWidget);
    expect(fake.requests, isEmpty);
  });

  testWidgets('the list shows a score, a running label and a failure', (tester) async {
    final fake = FakeApi()
      ..on('GET /me', 200, userJson())
      ..on('GET /analyses', 200, [
        summaryJson('1', 'completed', score: 77, fit: 'strong'),
        summaryJson('2', 'running'),
        summaryJson('3', 'failed'),
      ]);
    await pumpApp(tester, fake, token: 'token-1');

    expect(find.text('Strong fit'), findsOneWidget);
    expect(find.text('77'), findsOneWidget);
    expect(find.text('ANALYZING'), findsOneWidget);
    expect(find.text('Could not complete'), findsOneWidget);
    await unmount(tester);
  });

  testWidgets('the sample puts fixes first and a fix opens the CV with its lines circled', (tester) async {
    await pumpApp(tester, FakeApi());
    await tester.tap(find.text('Open the sample analysis'));
    await tester.pumpAndSettle();

    final fixes = tester.getTopLeft(find.text('What to fix')).dy;
    final requirements = tester.getTopLeft(find.text('Requirements')).dy;
    expect(fixes, lessThan(requirements));

    final showInCv = find.text('Show in the CV').first;
    await tester.ensureVisible(showInCv);
    await tester.pumpAndSettle();
    await tester.tap(showInCv);
    await tester.pumpAndSettle();
    expect(find.byType(CircledLine), findsWidgets);
    expect(find.byType(SampleAnalysisScreen), findsOneWidget);
  });

  testWidgets('starting an empty new analysis names each missing field', (tester) async {
    final fake = FakeApi()
      ..on('GET /me', 200, userJson())
      ..on('GET /analyses', 200, [])
      ..on('GET /resumes', 200, []);
    await pumpApp(tester, fake, token: 'token-1');
    await tester.tap(find.text('New analysis'));
    await tester.pumpAndSettle();

    final start = find.widgetWithText(FilledButton, 'Start analysis');
    // The screen's own list; the multiline fields are scrollables too.
    await tester.scrollUntilVisible(start, 200, scrollable: find.byType(Scrollable).first);
    await tester.tap(start);
    await tester.pumpAndSettle();

    expect(find.text('Give this CV a name.'), findsOneWidget);
    expect(find.text('Paste the text of your CV.'), findsOneWidget);
    expect(find.text('Add the job title.'), findsOneWidget);
    expect(find.text('Paste the text of the job posting.'), findsOneWidget);
    expect(fake.requests.where((request) => request.method == 'POST'), isEmpty);
    await unmount(tester);
  });
}
