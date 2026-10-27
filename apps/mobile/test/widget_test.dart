// Widget tests for the app start: session check, the retry offered when the server is unreachable,
// and the interface switching to the account's language after the session is restored.

import 'package:career_assistant/app.dart';
import 'package:career_assistant/core/session/session_controller.dart';
import 'package:flutter_test/flutter_test.dart';

import 'core/fake_api.dart';

void main() {
  testWidgets('offers a retry when the server is unreachable, then restores the session', (tester) async {
    final fake = FakeApi()
      ..offline = true
      ..on('GET /me', 200, userJson(language: 'en'));
    final session = SessionController(
      api: fake.build(),
      tokens: MemoryTokenStore('token-1'),
      deviceLanguage: 'en',
    );

    await tester.pumpWidget(CareerAssistantApp(session: session));
    await tester.pumpAndSettle();
    expect(find.text('Try again'), findsOneWidget);

    fake.offline = false;
    await tester.tap(find.text('Try again'));
    await tester.pumpAndSettle();
    expect(find.textContaining('Signed in as Ayşe Yılmaz'), findsOneWidget);
  });

  testWidgets('opens in the account language even on an English device', (tester) async {
    final fake = FakeApi()..on('GET /me', 200, userJson(language: 'tr'));
    final session = SessionController(
      api: fake.build(),
      tokens: MemoryTokenStore('token-1'),
      deviceLanguage: 'en',
    );

    await tester.pumpWidget(CareerAssistantApp(session: session));
    await tester.pumpAndSettle();

    expect(find.textContaining('Ayşe Yılmaz olarak giriş yapıldı'), findsOneWidget);
  });
}
