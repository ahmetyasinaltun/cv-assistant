// First screen: checks the stored session with the API and offers a retry when the server is unreachable.
// Once the session is known, the app's gate replaces this screen with sign-in or the analyses list.

import 'package:flutter/material.dart';

import '../../core/api/api_client.dart';
import '../../core/session/session_controller.dart';
import '../../core/theme/app_text.dart';
import '../../core/theme/tokens.dart';
import '../../l10n/app_localizations.dart';

class StartupScreen extends StatefulWidget {
  const StartupScreen({super.key, required this.session});

  final SessionController session;

  @override
  State<StartupScreen> createState() => _StartupScreenState();
}

class _StartupScreenState extends State<StartupScreen> {
  bool _unreachable = false;

  @override
  void initState() {
    super.initState();
    _restore();
  }

  Future<void> _restore() async {
    setState(() => _unreachable = false);
    try {
      await widget.session.restore();
    } on ApiException {
      // Offline or a server error: the stored token is kept and the user can retry.
      // (An expired token is handled inside restore() and ends signed out.)
      if (mounted) setState(() => _unreachable = true);
    }
  }

  @override
  Widget build(BuildContext context) {
    final text = AppLocalizations.of(context);
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (!_unreachable) const CircularProgressIndicator(color: Tokens.accent, strokeWidth: 2.5),
                const SizedBox(height: 16),
                Semantics(
                  liveRegion: true,
                  child: Text(
                    _unreachable ? text.serverUnreachable : text.startupChecking,
                    textAlign: TextAlign.center,
                    style: AppText.body,
                  ),
                ),
                if (_unreachable) ...[
                  const SizedBox(height: 16),
                  FilledButton(onPressed: _restore, child: Text(text.tryAgain)),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}
