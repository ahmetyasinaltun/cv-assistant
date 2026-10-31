// Widget tests for the main flows against a scripted fake API: start-up retry, the account language, sign-in errors,
// the analyses list states, the sample result (fixes first, CV sheet with highlighted words) and form validation.

import 'package:career_assistant/app.dart';
import 'package:career_assistant/core/session/session_controller.dart';
import 'package:career_assistant/core/theme/tokens.dart';
import 'package:career_assistant/features/analysis/sample_analysis_screen.dart';
import 'package:career_assistant/widgets/paper.dart';
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
    expect(find.text('Analyzing'), findsOneWidget);
    expect(find.text('Could not complete'), findsOneWidget);
    await unmount(tester);
  });

  testWidgets('the sample puts fixes first and a fix opens the CV with its words highlighted', (tester) async {
    await pumpApp(tester, FakeApi());
    await tester.tap(find.text('Open the sample analysis'));
    await tester.pumpAndSettle();

    // The brand band continues the app bar without a gap of page ground between them.
    expect(tester.getTopLeft(find.byType(BandOverlap).first).dy, tester.getBottomLeft(find.byType(AppBar)).dy);

    final fixes = tester.getTopLeft(find.text('What to fix')).dy;
    final requirements = tester.getTopLeft(find.text('Requirements')).dy;
    expect(fixes, lessThan(requirements));

    // The weighted bar draws one visible segment per requirement (an empty box would collapse to zero height).
    final matchedSegments = find.byWidgetPredicate(
      (widget) =>
          widget is DecoratedBox &&
          widget.decoration is BoxDecoration &&
          (widget.decoration as BoxDecoration).color == Tokens.okMark,
    );
    expect(matchedSegments, findsWidgets);
    expect(tester.getSize(matchedSegments.first).height, 14);

    final showInCv = find.text('Show in the CV').first;
    await tester.ensureVisible(showInCv);
    await tester.pumpAndSettle();
    await tester.tap(showInCv);
    await tester.pumpAndSettle();
    // A highlighted CV word is a text span painted with a marker background.
    final highlighted = find.byWidgetPredicate((widget) {
      if (widget is! RichText) return false;
      var found = false;
      widget.text.visitChildren((span) {
        if (span is TextSpan && span.style?.background != null) found = true;
        return !found;
      });
      return found;
    });
    expect(highlighted, findsWidgets);
    expect(find.byType(SampleAnalysisScreen), findsOneWidget);
  });

  testWidgets('a link fills the posting fields, and a refusing site points to pasting', (tester) async {
    final fake = FakeApi()
      ..on('GET /me', 200, userJson())
      ..on('GET /analyses', 200, [])
      ..on('GET /resumes', 200, [])
      ..on('POST /job-descriptions/import', 200, {
        'title': 'Backend Intern',
        'company': 'Acme',
        'text': 'We are looking for a backend intern who writes Python services and their tests.',
        'source_url': 'https://www.linkedin.com/jobs/view/4475250238/',
      });
    await pumpApp(tester, fake, token: 'token-1');
    await tester.tap(find.text('New analysis'));
    await tester.pumpAndSettle();

    final link = find.widgetWithText(TextField, 'https://www.linkedin.com/jobs/view/…');
    final fill = find.widgetWithText(OutlinedButton, 'Fill in');
    await tester.ensureVisible(fill);
    await tester.pumpAndSettle();
    await tester.enterText(link, 'https://lnkd.in/x');
    await tester.tap(fill);
    await tester.pumpAndSettle();

    expect(find.text('Backend Intern'), findsOneWidget);
    expect(find.text('Acme'), findsOneWidget);
    // The note names the page the text came from, not the short link that was pasted.
    expect(find.text('Filled from linkedin.com. Check the job title and the text before you start.'), findsOneWidget);
    expect(fake.requests.where((request) => request.url.path == '/job-descriptions/import'), hasLength(1));

    fake.on('POST /job-descriptions/import', 502, {
      'error': {'code': 'link_blocked', 'message': ''},
    });
    // The hint gives way to the note, so the field is found by what it now holds.
    final filledLink = find.widgetWithText(TextField, 'https://lnkd.in/x');
    await tester.ensureVisible(fill);
    await tester.pumpAndSettle();
    await tester.enterText(filledLink, 'https://www.kariyer.net/is-ilani/x-1');
    await tester.tap(fill);
    await tester.pumpAndSettle();
    expect(
      find.text('This page could not be read: kariyer.net does not allow it. Copy the posting text and paste it below.'),
      findsOneWidget,
    );
    // A refused link leaves the fields as they were.
    expect(find.text('Backend Intern'), findsOneWidget);
    await unmount(tester);
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
