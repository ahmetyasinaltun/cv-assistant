// First screen: checks the stored session with the API and offers a retry when the server is unreachable.
// Until the mobile screens are designed it only states the session; afterwards it routes to them.

import 'package:flutter/material.dart';

import '../../core/api/api_client.dart';
import '../../core/session/session_controller.dart';
import '../../core/theme/tokens.dart';
import '../../l10n/app_localizations.dart';

class StartupScreen extends StatefulWidget {
  const StartupScreen({super.key, required this.session});

  final SessionController session;

  @override
  State<StartupScreen> createState() => _StartupScreenState();
}

class _StartupScreenState extends State<StartupScreen> {
  bool _checking = true;
  bool _unreachable = false;

  @override
  void initState() {
    super.initState();
    _restore();
  }

  Future<void> _restore() async {
    setState(() {
      _checking = true;
      _unreachable = false;
    });
    try {
      await widget.session.restore();
    } on ApiException {
      // Offline or a server error: the stored token is kept and the user can retry.
      // (An expired token is handled inside restore() and ends signed out.)
      _unreachable = true;
    } finally {
      if (mounted) setState(() => _checking = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final text = AppLocalizations.of(context);
    final session = widget.session;
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: switch ((_checking, _unreachable, session.status)) {
              (true, _, _) => _Message(text.startupChecking, busy: true),
              (_, true, _) => _Message(
                  text.serverUnreachable,
                  action: FilledButton(onPressed: _restore, child: Text(text.tryAgain)),
                ),
              (_, _, SessionStatus.signedIn) => _Message(
                  '${text.signedInAs(session.user!.fullName)}\n${text.screensComing}',
                ),
              _ => _Message('${text.signedOut}\n${text.screensComing}'),
            },
          ),
        ),
      ),
    );
  }
}

class _Message extends StatelessWidget {
  const _Message(this.text, {this.busy = false, this.action});

  final String text;
  final bool busy;
  final Widget? action;

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        if (busy) const CircularProgressIndicator(color: Tokens.ink),
        if (busy) const SizedBox(height: 16),
        // A live region, so a screen reader announces the new state.
        Semantics(
          liveRegion: true,
          child: Text(text, textAlign: TextAlign.center, style: const TextStyle(fontSize: 15, height: 1.55)),
        ),
        if (action != null) ...[const SizedBox(height: 16), action!],
      ],
    );
  }
}
