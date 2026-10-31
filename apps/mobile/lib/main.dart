// Entry point: wires the shared API client, secure token storage, the session and shared links, then starts the app.

import 'dart:ui' show PlatformDispatcher;

import 'package:flutter/widgets.dart';

import 'app.dart';
import 'core/api/api_client.dart';
import 'core/api/career_api.dart';
import 'core/config.dart';
import 'core/session/session_controller.dart';
import 'core/session/token_store.dart';
import 'core/share/shared_links.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  final api = CareerApi(ApiClient(baseUrl: apiBaseUrl));
  final session = SessionController(
    api: api,
    tokens: SecureTokenStore(),
    deviceLanguage: PlatformDispatcher.instance.locale.languageCode,
  );
  final links = SharedLinks()..start();
  runApp(CareerAssistantApp(api: api, session: session, links: links));
}
