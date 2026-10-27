// Sign-in and registration on one paper slip (design system: "Auth Slip"), with the sample result one tap away
// for a reviewer who has no account. A successful sign-in lets the app's gate open the analyses list.

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
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(16, 40, 16, 32),
          child: Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 400),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  PaperSheet(
                    padding: const EdgeInsets.fromLTRB(24, 28, 24, 20),
                    child: AutofillGroup(child: _slip(text, expired)),
                  ),
                  const SizedBox(height: 16),
                  Wrap(
                    crossAxisAlignment: WrapCrossAlignment.center,
                    spacing: 6,
                    children: [
                      Text(text.authSamplePrompt, style: AppText.meta),
                      TextAction(
                        label: text.authSampleLink,
                        onPressed: () =>
                            Navigator.of(context)
                                .push(MaterialPageRoute<void>(builder: (_) => const SampleAnalysisScreen())),
                      ),
                    ],
                  ),
                ],
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
        Semantics(
          header: true,
          child: Text(_isRegister ? text.registerTitle : text.signInTitle, style: AppText.titleSection),
        ),
        const SizedBox(height: 20),
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
              color: Tokens.ink,
              inline: true,
              onPressed: _submitting ? null : _switchMode,
            ),
          ],
        ),
      ],
    );
  }
}
