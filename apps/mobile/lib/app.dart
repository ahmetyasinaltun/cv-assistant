// Root widget: the design-system theme, the two app languages, and a gate that shows the screen for the session:
// start-up check, sign-in, or the analyses list as home.

import 'package:flutter/material.dart';

import 'app_scope.dart';
import 'core/api/career_api.dart';
import 'core/session/session_controller.dart';
import 'core/share/shared_links.dart';
import 'core/theme/app_theme.dart';
import 'features/analyses/analyses_screen.dart';
import 'features/auth/auth_screen.dart';
import 'features/auth/verify_email_screen.dart';
import 'features/startup/startup_screen.dart';
import 'l10n/app_localizations.dart';

class CvAssistantApp extends StatefulWidget {
  const CvAssistantApp({super.key, required this.api, required this.session, this.links});

  final CareerApi api;
  final SessionController session;
  final SharedLinks? links;

  @override
  State<CvAssistantApp> createState() => _CvAssistantAppState();
}

class _CvAssistantAppState extends State<CvAssistantApp> {
  final _navigatorKey = GlobalKey<NavigatorState>();
  late SessionStatus _lastStatus = widget.session.status;

  @override
  void initState() {
    super.initState();
    widget.session.addListener(_onSessionChanged);
  }

  @override
  void dispose() {
    widget.session.removeListener(_onSessionChanged);
    super.dispose();
  }

  void _onSessionChanged() {
    final status = widget.session.status;
    // Signing out (or an expired token) closes every open screen, so no private data stays on the stack.
    if (_lastStatus == SessionStatus.signedIn && status == SessionStatus.signedOut) {
      _navigatorKey.currentState?.popUntil((route) => route.isFirst);
    }
    _lastStatus = status;
  }

  @override
  Widget build(BuildContext context) {
    final session = widget.session;
    return AppScope(
      api: widget.api,
      session: session,
      links: widget.links,
      child: ListenableBuilder(
        listenable: session,
        builder: (context, _) => MaterialApp(
          navigatorKey: _navigatorKey,
          debugShowCheckedModeBanner: false,
          onGenerateTitle: (context) => AppLocalizations.of(context).appTitle,
          theme: buildAppTheme(),
          // The session decides the language (the account's language once signed in), not only the device.
          locale: Locale(session.language),
          supportedLocales: AppLocalizations.supportedLocales,
          localizationsDelegates: AppLocalizations.localizationsDelegates,
          home: switch (session.status) {
            SessionStatus.unknown => StartupScreen(session: session),
            SessionStatus.signedOut => const AuthScreen(),
            // AI actions need a verified address, so an unverified account starts at the code screen.
            SessionStatus.signedIn =>
              session.user?.emailVerified == false ? const VerifyEmailScreen() : const AnalysesScreen(),
          },
        ),
      ),
    );
  }
}
