// Email verification: an unverified account starts here after registering or signing in. The emailed code
// unlocks the app (the gate swaps this screen for the analyses list); a new code can be asked for, and a mistyped
// address is fixed by signing out and registering again.

import 'package:flutter/material.dart';

import '../../app_scope.dart';
import '../../core/api/api_client.dart';
import '../../core/theme/app_text.dart';
import '../../core/theme/tokens.dart';
import '../../l10n/app_localizations.dart';
import '../../widgets/account_menu.dart';
import '../../widgets/form_parts.dart';
import '../../widgets/paper.dart';
import 'auth_errors.dart';

class VerifyEmailScreen extends StatefulWidget {
  const VerifyEmailScreen({super.key});

  @override
  State<VerifyEmailScreen> createState() => _VerifyEmailScreenState();
}

class _VerifyEmailScreenState extends State<VerifyEmailScreen> {
  final _code = TextEditingController();
  final _codeFocus = FocusNode();
  VerifyProblem? _codeProblem;
  VerifyProblem? _resendProblem;
  bool _resent = false;
  bool _confirming = false;
  bool _resending = false;

  @override
  void dispose() {
    _code.dispose();
    _codeFocus.dispose();
    super.dispose();
  }

  Future<void> _confirm() async {
    final code = normalizeCode(_code.text);
    if (!isCompleteCode(code)) {
      setState(() => _codeProblem = VerifyProblem.codeFormat);
      _codeFocus.requestFocus();
      return;
    }
    setState(() {
      _confirming = true;
      _codeProblem = null;
    });
    final session = AppScope.of(context).session;
    try {
      await session.confirmEmail(code);
    } on ApiException catch (error) {
      if (error.isUnauthorized) return session.expire();
      if (!mounted) return;
      setState(() {
        _confirming = false;
        _codeProblem = verifyProblemFor(error);
      });
      _codeFocus.requestFocus();
    }
  }

  Future<void> _resend() async {
    setState(() {
      _resending = true;
      _resent = false;
      _resendProblem = null;
    });
    final session = AppScope.of(context).session;
    try {
      await session.sendVerificationCode();
      if (mounted) {
        setState(() {
          _resending = false;
          _resent = true;
        });
      }
    } on ApiException catch (error) {
      if (error.isUnauthorized) return session.expire();
      if (mounted) {
        setState(() {
          _resending = false;
          _resendProblem = verifyProblemFor(error);
        });
      }
    }
  }

  String _problemText(AppLocalizations text, VerifyProblem problem) => switch (problem) {
    VerifyProblem.codeFormat => text.verifyErrorCodeFormat,
    VerifyProblem.codeInvalid => text.verifyErrorCodeInvalid,
    VerifyProblem.codeExpired => text.verifyErrorCodeExpired,
    VerifyProblem.tooManyAttempts => text.verifyErrorTooManyAttempts,
    VerifyProblem.tooSoon => text.verifyErrorTooSoon,
    VerifyProblem.emailUnavailable => text.verifyErrorEmailUnavailable,
    VerifyProblem.unavailable => text.authErrorUnavailable,
    VerifyProblem.generic => text.authErrorGeneric,
  };

  @override
  Widget build(BuildContext context) {
    final text = AppLocalizations.of(context);
    final email = AppScope.of(context).session.user?.email ?? '';
    return Scaffold(
      appBar: AppBar(
        title: Text(text.appTitle, style: AppText.barProduct.copyWith(fontSize: 17)),
        actions: const [AccountMenu()],
      ),
      body: SafeArea(
        top: false,
        child: SingleChildScrollView(
          padding: const EdgeInsets.only(bottom: 32),
          child: ReadableWidth(
            child: BandOverlap(
              header: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Semantics(header: true, child: Text(text.verifyTitle, style: AppText.headline)),
                  const SizedBox(height: 8),
                  Text(text.verifyMeta, style: AppText.bodySmall.copyWith(color: Tokens.onBrandSoft)),
                ],
              ),
              child: Padding(
                padding: screenPadding,
                child: PaperSheet(
                  padding: const EdgeInsets.fromLTRB(20, 24, 20, 16),
                  child: AutofillGroup(child: _sheet(text, email)),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _sheet(AppLocalizations text, String email) {
    final sentence = text.verifySentTo(email);
    final emailAt = email.isEmpty ? -1 : sentence.indexOf(email);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text.rich(
          emailAt < 0
              ? TextSpan(text: sentence)
              : TextSpan(
                  children: [
                    TextSpan(text: sentence.substring(0, emailAt)),
                    TextSpan(
                      text: email,
                      style: const TextStyle(fontWeight: FontWeight.w600, color: Tokens.ink),
                    ),
                    TextSpan(text: sentence.substring(emailAt + email.length)),
                  ],
                ),
          style: AppText.body.copyWith(color: Tokens.inkSoft),
        ),
        const SizedBox(height: 20),
        LabeledField(
          label: text.verifyCodeLabel,
          controller: _code,
          focusNode: _codeFocus,
          error: _codeProblem == null ? null : _problemText(text, _codeProblem!),
          keyboardType: TextInputType.number,
          textInputAction: TextInputAction.done,
          autofillHints: const [AutofillHints.oneTimeCode],
          onSubmitted: (_) => _confirm(),
        ),
        const SizedBox(height: 20),
        FilledButton(
          onPressed: _confirming ? null : _confirm,
          child: Text(_confirming ? text.verifySubmitting : text.verifySubmit),
        ),
        const SizedBox(height: 12),
        OutlinedButton(
          onPressed: _resending ? null : _resend,
          // On the white sheet, not on the band: teal edge and text, as for the posting link's "Fill in".
          style: OutlinedButton.styleFrom(
            foregroundColor: Tokens.accentHover,
            side: BorderSide(color: Tokens.accent.withValues(alpha: 0.55)),
          ),
          child: Text(_resending ? text.verifyResending : text.verifyResend),
        ),
        if (_resent || _resendProblem != null)
          Padding(
            padding: const EdgeInsets.only(top: 8),
            child: Semantics(
              liveRegion: true,
              child: Text(_resent ? text.verifyResent : _problemText(text, _resendProblem!), style: AppText.meta),
            ),
          ),
        const SizedBox(height: 20),
        const Rule(),
        const SizedBox(height: 8),
        Wrap(
          crossAxisAlignment: WrapCrossAlignment.center,
          spacing: 6,
          children: [
            Text(text.verifyWrongAddress, style: AppText.bodySmall),
            TextAction(
              label: text.verifySignOut,
              inline: true,
              onPressed: () => AppScope.of(context).session.signOut(),
            ),
          ],
        ),
      ],
    );
  }
}
