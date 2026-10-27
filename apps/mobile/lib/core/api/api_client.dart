// Thin HTTP layer over the shared API: JSON in and out, the bearer token, and the API's error envelope
// ({"error": {"code", "message"}}) turned into ApiException. No business rules live here.

import 'dart:async';
import 'dart:convert';

import 'package:http/http.dart' as http;

/// A failed API call. [statusCode] is [networkStatus] when the server could not be reached at all.
class ApiException implements Exception {
  const ApiException(this.statusCode, this.code, this.message);

  static const networkStatus = 0;

  final int statusCode;

  /// Stable machine-readable reason from the API (e.g. "invalid_credentials"); clients map it to text.
  final String code;

  /// The server's English message, for logs only; never shown to users.
  final String message;

  bool get isUnauthorized => statusCode == 401;
  bool get isNetworkError => statusCode == networkStatus;

  @override
  String toString() => 'ApiException($statusCode, $code)';
}

class ApiClient {
  ApiClient({
    required this.baseUrl,
    http.Client? httpClient,
    this.timeout = const Duration(seconds: 30),
  }) : _http = httpClient ?? http.Client();

  final String baseUrl;
  final Duration timeout;
  final http.Client _http;

  /// Sent as `Authorization: Bearer` once the user has signed in.
  String? token;

  Future<dynamic> get(String path) => _send('GET', path);

  Future<dynamic> post(String path, {Object? json}) => _send('POST', path, json: json);

  Future<dynamic> patch(String path, {Object? json}) => _send('PATCH', path, json: json);

  Future<dynamic> delete(String path) => _send('DELETE', path);

  /// Multipart upload, used for PDF CVs.
  Future<dynamic> upload(
    String path, {
    required Map<String, String> fields,
    required String fileField,
    required List<int> bytes,
    required String filename,
  }) {
    final request = http.MultipartRequest('POST', _uri(path))
      ..headers.addAll(_headers())
      ..fields.addAll(fields)
      ..files.add(http.MultipartFile.fromBytes(fileField, bytes, filename: filename));
    return _run(request);
  }

  Future<dynamic> _send(String method, String path, {Object? json}) {
    final request = http.Request(method, _uri(path))..headers.addAll(_headers());
    if (json != null) {
      request.headers['Content-Type'] = 'application/json';
      request.body = jsonEncode(json);
    }
    return _run(request);
  }

  Uri _uri(String path) => Uri.parse('$baseUrl$path');

  Map<String, String> _headers() => {
        'Accept': 'application/json',
        if (token != null) 'Authorization': 'Bearer $token',
      };

  Future<dynamic> _run(http.BaseRequest request) async {
    final http.Response response;
    try {
      response = await http.Response.fromStream(await _http.send(request)).timeout(timeout);
    } on TimeoutException {
      throw const ApiException(ApiException.networkStatus, 'timeout', 'No answer in time.');
    } on http.ClientException catch (error) {
      throw ApiException(ApiException.networkStatus, 'network_error', error.message);
    }
    // FastAPI sends JSON without a charset, which package:http would read as Latin-1; Turkish needs UTF-8.
    final text = utf8.decode(response.bodyBytes);
    final ok = response.statusCode >= 200 && response.statusCode < 300;
    final Object? body;
    try {
      body = text.isEmpty ? null : jsonDecode(text);
    } on FormatException {
      throw ApiException(response.statusCode, 'unexpected_response', 'Response is not JSON.');
    }
    if (ok) return body;
    throw _errorFrom(response.statusCode, body);
  }

  static ApiException _errorFrom(int statusCode, Object? body) {
    if (body is Map && body['error'] is Map) {
      final error = body['error'] as Map;
      return ApiException(
        statusCode,
        error['code'] as String? ?? 'unknown_error',
        error['message'] as String? ?? '',
      );
    }
    return ApiException(statusCode, 'unknown_error', 'Unexpected error response.');
  }
}
