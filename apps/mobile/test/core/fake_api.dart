// Test helpers: an in-memory token store and a scripted fake of the API built on package:http's MockClient.

import 'dart:convert';

import 'package:cv_assistant/core/api/api_client.dart';
import 'package:cv_assistant/core/api/career_api.dart';
import 'package:cv_assistant/core/session/token_store.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

class MemoryTokenStore implements TokenStore {
  MemoryTokenStore([this.token]);

  String? token;

  @override
  Future<String?> read() async => token;

  @override
  Future<void> write(String value) async => token = value;

  @override
  Future<void> clear() async => token = null;
}

/// Answers "METHOD /path" with a status and JSON body, and records every request it received.
class FakeApi {
  final Map<String, (int, Object?)> routes = {};
  final List<http.Request> requests = [];
  bool offline = false;

  void on(String route, int status, [Object? body]) => routes[route] = (status, body);

  CareerApi build() => CareerApi(
    ApiClient(
      baseUrl: 'http://api.test',
      httpClient: MockClient((request) async {
        requests.add(request);
        if (offline) throw http.ClientException('Connection refused');
        final route = '${request.method} ${request.url.path}';
        final (status, body) = routes[route] ?? (404, _error('not_found'));
        // No charset on purpose: the real API sends application/json without one.
        return http.Response.bytes(
          body == null ? [] : utf8.encode(jsonEncode(body)),
          status,
          headers: {'content-type': 'application/json'},
        );
      }),
    ),
  );

  static Map<String, Object> _error(String code) => {
    'error': {'code': code, 'message': code},
  };

  static Map<String, Object> error(String code) => _error(code);
}

Map<String, Object?> userJson({String language = 'en'}) => {
  'id': 'u1',
  'email': 'ayse@example.com',
  'full_name': 'Ayşe Yılmaz',
  'preferred_language': language,
  'created_at': '2026-10-27T10:00:00Z',
};

Map<String, Object?> tokenJson({String language = 'en'}) => {
  'access_token': 'token-1',
  'token_type': 'bearer',
  'user': userJson(language: language),
};
