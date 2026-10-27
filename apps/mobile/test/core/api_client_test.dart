// Unit tests for the HTTP layer: bearer token, UTF-8 decoding, and the API error envelope as exceptions.

import 'package:career_assistant/core/api/api_client.dart';
import 'package:flutter_test/flutter_test.dart';

import 'fake_api.dart';

void main() {
  test('sends the bearer token and reads Turkish text as UTF-8', () async {
    final fake = FakeApi()..on('GET /me', 200, userJson(language: 'tr'));
    final api = fake.build()..token = 'token-1';

    final user = await api.me();

    expect(fake.requests.single.headers['Authorization'], 'Bearer token-1');
    expect(user.fullName, 'Ayşe Yılmaz');
    expect(user.preferredLanguage, 'tr');
  });

  test('turns the error envelope into an ApiException with the stable code', () async {
    final fake = FakeApi()..on('POST /auth/login', 401, FakeApi.error('invalid_credentials'));

    await expectLater(
      fake.build().login('ayse@example.com', 'wrong'),
      throwsA(isA<ApiException>()
          .having((e) => e.statusCode, 'statusCode', 401)
          .having((e) => e.code, 'code', 'invalid_credentials')
          .having((e) => e.isUnauthorized, 'isUnauthorized', true)),
    );
  });

  test('reports an unreachable server as a network error', () async {
    final fake = FakeApi()..offline = true;

    await expectLater(
      fake.build().me(),
      throwsA(isA<ApiException>().having((e) => e.isNetworkError, 'isNetworkError', true)),
    );
  });

  test('sends JSON bodies with the content type', () async {
    final fake = FakeApi()..on('PATCH /me', 200, userJson(language: 'tr'));

    await fake.build().updatePreferredLanguage('tr');

    final request = fake.requests.single;
    expect(request.headers['Content-Type'], startsWith('application/json'));
    expect(request.body, '{"preferred_language":"tr"}');
  });
}
