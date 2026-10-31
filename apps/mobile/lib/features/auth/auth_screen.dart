// Sign-in and registration: the brand band says what the product does and offers the sample result to a reviewer
// who has no account; the form sits in one card over the band. A successful sign-in lets the app's gate open the list.

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../app_scope.dart';
import '../../core/api/api_client.dart';
import '../../core/theme/app_text.dart';
import '../../core/theme/tokens.dart';
import '../../l10n/app_localizations.dart';
import '../../widgets/account_menu.dart';
import '../../widgets/form_parts.dart';
import '../../widgets/paper.dart';
import '../analysis/sample_analysis_screen.dart';
import 'auth_errors.dart';

enum _Mode { signIn, register }

enum _AuthField { fullName, email, password }

class AuthScreen extends StatefulWidget {
  const AuthScreen({super.key});

  @override
  State<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends State<AuthScreen> {
  _Mode _mode = _Mode.signIn;
  final _fullName = TextEditingController();
  final _email = TextEditingController();
  final _password = TextEditingController();
  final _focus = {for (final field in _AuthField.values) field: FocusNode()};
  Map<_AuthField, String> _fieldErrors = {};
  AuthProblem? _problem;
  bool _submitting = false;
  bool _showPassword = false;

  @override
  void dispose() {
    for (final controller in [_fullName, _email, _password]) {
      controller.dispose();
    }
    for (final node in _focus.values) {
      node.dispose();
    }
    super.dispose();
  }

  bool get _isRegister => _mode == _Mode.register;

  void _switchMode() => setState(() {
    _mode = _isRegister ? _Mode.signIn : _Mode.register;
    _fieldErrors = {};
    _problem = null;
  });

  Map<_AuthField, String> _validate(AppLocalizations text) {
    final email = _email.text.trim();
    return {
      if (_isRegister && _fullName.text.trim().isEmpty) _AuthField.fullName: text.authNameMissing,
      if (email.isEmpty)
        _AuthField.email: text.authEmailMissing
      else if (!looksLikeEmail(email))
        _AuthField.email: text.authEmailInvalid,
      if (_password.text.isEmpty)
        _AuthField.password: text.authPasswordMissing
      else if (_isRegister && _password.text.length < 8)
        _AuthField.password: text.authPasswordShort,
    };
  }

  Future<void> _submit() async {
    final text = AppLocalizations.of(context);
    final errors = _validate(text);
    setState(() {
      _fieldErrors = errors;
      _problem = null;
    });
    if (errors.isNotEmpty) {
      _focus[_AuthField.values.firstWhere(errors.containsKey)]!.requestFocus();
      return;
    }
    setState(() => _submitting = true);
    final session = AppScope.of(context).session;
    try {
      if (_isRegister) {
        await session.register(_fullName.text.trim(), _email.text.trim(), _password.text);
      } else {
        await session.signIn(_email.text.trim(), _password.text);
      }
      TextInput.finishAutofillContext();
    } on ApiException catch (error) {
      if (!mounted) return;
      final problem = authProblemFor(error);
      setState(() {
        _submitting = false;
        if (problem == AuthProblem.emailTaken) {
          _fieldErrors = {_AuthField.email: text.authErrorEmailTaken};
          _focus[_AuthField.email]!.requestFocus();
        } else {
          _problem = problem;
        }
      });
    }
  }

  String _problemText(AppLocalizations text, AuthProblem problem) => switch (problem) {
    AuthProblem.invalidCredentials => text.authErrorInvalidCredentials,
    AuthProblem.emailTaken => text.authErrorEmailTaken,
    AuthProblem.passwordTooLong => text.authErrorPasswordTooLong,
    AuthProblem.tooManyAttempts => text.authErrorTooManyAttempts,
    AuthProblem.invalidInput => text.authErrorInvalidInput,
    AuthProblem.unavailable => text.authErrorUnavailable,
    AuthProblem.generic => text.authErrorGeneric,
  };

  @override
  Widget build(BuildContext context) {
    final text = AppLocalizations.of(context);
    final expired = AppScope.of(context).session.sessionExpired;
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
                  Semantics(
                    header: true,
                    child: Text(_isRegister ? text.registerTitle : text.signInTitle, style: AppText.headline),
                  ),
                  const SizedBox(height: 8),
                  Text(text.appTagline, style: AppText.bodySmall.copyWith(color: Tokens.onBrandSoft)),
                  const SizedBox(height: 16),
                  Text(text.authSamplePrompt, style: AppText.meta.copyWith(color: Tokens.onBrandSoft)),
                  const SizedBox(height: 8),
                  OutlinedButton(
                    onPressed: () =>
                        Navigator.of(context)
                            .push(MaterialPageRoute<void>(builder: (_) => const SampleAnalysisScreen())),
                    child: Text(text.authSampleLink),
                  ),
                ],
              ),
              child: Padding(
                padding: screenPadding,
                child: PaperSheet(
                  padding: const EdgeInsets.fromLTRB(20, 24, 20, 16),
                  child: AutofillGroup(child: _slip(text, expired)),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _slip(AppLocalizations text, bool expired) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (expired && !_isRegister) ...[FormAlert(text.sessionExpired), const SizedBox(height: 16)],
        if (_isRegister) ...[
          LabeledField(
            label: text.authFullName,
            controller: _fullName,
            focusNode: _focus[_AuthField.fullName],
            error: _fieldErrors[_AuthField.fullName],
            textInputAction: TextInputAction.next,
            autofillHints: const [AutofillHints.name],
          ),
          const SizedBox(height: 16),
        ],
        LabeledField(
          label: text.authEmail,
          controller: _email,
          focusNode: _focus[_AuthField.email],
          error: _fieldErrors[_AuthField.email],
          keyboardType: TextInputType.emailAddress,
          textInputAction: TextInputAction.next,
          autofillHints: const [AutofillHints.email],
        ),
        const SizedBox(height: 16),
        LabeledField(
          label: text.authPassword,
          controller: _password,
          focusNode: _focus[_AuthField.password],
          error: _fieldErrors[_AuthField.password],
          hint: _isRegister ? text.registerPasswordHint : null,
          obscure: !_showPassword,
          textInputAction: TextInputAction.done,
          autofillHints: [_isRegister ? AutofillHints.newPassword : AutofillHints.password],
          onSubmitted: (_) => _submit(),
          suffix: IconButton(
            tooltip: _showPassword ? text.hidePassword : text.showPassword,
            icon: Icon(_showPassword ? Icons.visibility_off_outlined : Icons.visibility_outlined, color: Tokens.mute),
            onPressed: () => setState(() => _showPassword = !_showPassword),
          ),
        ),
        if (_problem != null) ...[const SizedBox(height: 16), FormAlert(_problemText(text, _problem!))],
        const SizedBox(height: 20),
        FilledButton(
          onPressed: _submitting ? null : _submit,
          child: Text(
            _submitting
                ? (_isRegister ? text.registerSubmitting : text.signInSubmitting)
                : (_isRegister ? text.registerSubmit : text.signInSubmit),
          ),
        ),
        const SizedBox(height: 20),
        const Rule(),
        const SizedBox(height: 8),
        Wrap(
          crossAxisAlignment: WrapCrossAlignment.center,
          spacing: 6,
          children: [
            Text(_isRegister ? text.registerSwitchPrompt : text.signInSwitchPrompt, style: AppText.bodySmall),
            TextAction(
              label: _isRegister ? text.registerSwitchLink : text.signInSwitchLink,
              inline: true,
              onPressed: _submitting ? null : _switchMode,
            ),
          ],
        ),
      ],
    );
  }
}
