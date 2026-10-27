// Unit tests for the session rules: restoring a stored token, signing in and out, and the language rule
// shared with the web client (the account remembers the last language the user chose).

import 'dart:convert';

import 'package:career_assistant/core/api/api_client.dart';
import 'package:career_assistant/core/session/session_controller.dart';
import 'package:flutter_test/flutter_test.dart';

import 'fake_api.dart';

SessionController controller(FakeApi fake, MemoryTokenStore tokens, {String device = 'en'}) =>
    SessionController(api: fake.build(), tokens: tokens, deviceLanguage: device);

void main() {
  test('without a stored token the user is signed out and the device language is used', () async {
    final session = controller(FakeApi(), MemoryTokenStore(), device: 'tr');

    await session.restore();

    expect(session.status, SessionStatus.signedOut);
    expect(session.language, 'tr');
  });

  test('an unsupported device language falls back to English', () {
    expect(controller(FakeApi(), MemoryTokenStore(), device: 'de').language, 'en');
  });

  test('a valid stored token signs the user in and opens the account language', () async {
    final fake = FakeApi()..on('GET /me', 200, userJson(language: 'tr'));
    final session = controller(fake, MemoryTokenStore('token-1'), device: 'en');

    await session.restore();

    expect(session.status, SessionStatus.signedIn);
    expect(session.language, 'tr');
  });

  test('an expired stored token is forgotten', () async {
    final fake = FakeApi()..on('GET /me', 401, FakeApi.error('invalid_token'));
    final tokens = MemoryTokenStore('expired');
    final session = controller(fake, tokens);

    await session.restore();

    expect(session.status, SessionStatus.signedOut);
    expect(tokens.token, isNull);
  });

  test('an unreachable server keeps the token so the app can retry', () async {
    final fake = FakeApi()..offline = true;
    final tokens = MemoryTokenStore('token-1');
    final session = controller(fake, tokens);

    await expectLater(session.restore(), throwsA(isA<ApiException>()));

    expect(session.status, SessionStatus.unknown);
    expect(tokens.token, 'token-1');
  });

  test('signing in stores the token and restores the account language', () async {
    final fake = FakeApi()..on('POST /auth/login', 200, tokenJson(language: 'tr'));
    final tokens = MemoryTokenStore();
    final session = controller(fake, tokens, device: 'en');

    await session.signIn('ayse@example.com', 'correct-horse-battery');

    expect(tokens.token, 'token-1');
    expect(session.status, SessionStatus.signedIn);
    expect(session.language, 'tr');
  });

  test('registering starts the account in the language the app shows', () async {
    final fake = FakeApi()..on('POST /auth/register', 201, tokenJson(language: 'tr'));
    final session = controller(fake, MemoryTokenStore(), device: 'tr');

    await session.register('Ayşe Yılmaz', 'ayse@example.com', 'correct-horse-battery');

    final body = jsonDecode(fake.requests.single.body) as Map<String, dynamic>;
    expect(body['preferred_language'], 'tr');
  });

  test('a signed-in language change is saved on the account', () async {
    final fake = FakeApi()
      ..on('GET /me', 200, userJson(language: 'en'))
      ..on('PATCH /me', 200, userJson(language: 'tr'));
    final session = controller(fake, MemoryTokenStore('token-1'));
    await session.restore();

    await session.changeLanguage('tr');

    expect(session.language, 'tr');
    expect(fake.requests.last.method, 'PATCH');
    expect(session.user!.preferredLanguage, 'tr');
  });

  test('a signed-out language change stays on the device', () async {
    final fake = FakeApi();
    final session = controller(fake, MemoryTokenStore());
    await session.restore();

    await session.changeLanguage('tr');

    expect(session.language, 'tr');
    expect(fake.requests, isEmpty);
  });

  test('signing out forgets the token', () async {
    final fake = FakeApi()..on('POST /auth/login', 200, tokenJson());
    final tokens = MemoryTokenStore();
    final session = controller(fake, tokens);
    await session.signIn('ayse@example.com', 'correct-horse-battery');

    await session.signOut();

    expect(session.status, SessionStatus.signedOut);
    expect(tokens.token, isNull);
  });
}
