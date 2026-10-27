// Root widget: the design-system theme, the two app languages, and the first screen for the session state.

import 'package:flutter/material.dart';

import 'core/session/session_controller.dart';
import 'core/theme/app_theme.dart';
import 'features/startup/startup_screen.dart';
import 'l10n/app_localizations.dart';

class CareerAssistantApp extends StatelessWidget {
  const CareerAssistantApp({super.key, required this.session});

  final SessionController session;

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: session,
      builder: (context, _) => MaterialApp(
        onGenerateTitle: (context) => AppLocalizations.of(context).appTitle,
        theme: buildAppTheme(),
        // The session decides the language (the account's language once signed in), not only the device.
        locale: Locale(session.language),
        supportedLocales: AppLocalizations.supportedLocales,
        localizationsDelegates: AppLocalizations.localizationsDelegates,
        home: StartupScreen(session: session),
      ),
    );
  }
}
