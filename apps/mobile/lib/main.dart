// Entry point: wires the shared API client, secure token storage and the session, then starts the app.

import 'dart:ui' show PlatformDispatcher;

import 'package:flutter/widgets.dart';

import 'app.dart';
import 'core/api/api_client.dart';
import 'core/api/career_api.dart';
import 'core/config.dart';
import 'core/session/session_controller.dart';
import 'core/session/token_store.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  final session = SessionController(
    api: CareerApi(ApiClient(baseUrl: apiBaseUrl)),
    tokens: SecureTokenStore(),
    deviceLanguage: PlatformDispatcher.instance.locale.languageCode,
  );
  runApp(CareerAssistantApp(session: session));
}
