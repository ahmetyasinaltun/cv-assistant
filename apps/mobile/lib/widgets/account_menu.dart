// The top app bar's account menu: the two languages, and for a signed-in user their name and sign-out.
// A signed-in language change is saved on the account (SessionController.changeLanguage).

import 'package:flutter/material.dart';

import '../app_scope.dart';
import '../core/api/api_client.dart';
import '../core/session/session_controller.dart';
import '../core/theme/app_text.dart';
import '../core/theme/tokens.dart';
import '../l10n/app_localizations.dart';

enum _MenuChoice { english, turkish, signOut }

class AccountMenu extends StatelessWidget {
  const AccountMenu({super.key});

  @override
  Widget build(BuildContext context) {
    final text = AppLocalizations.of(context);
    final session = AppScope.of(context).session;
    final signedIn = session.status == SessionStatus.signedIn;
    return PopupMenuButton<_MenuChoice>(
      tooltip: signedIn ? text.account : text.language,
      icon: Icon(signedIn ? Icons.account_circle_outlined : Icons.translate, color: Tokens.onBrand),
      onSelected: (choice) => _select(context, choice),
      itemBuilder: (context) => [
        if (signedIn)
          PopupMenuItem<_MenuChoice>(
            enabled: false,
            child: Text(session.user!.fullName, style: AppText.fieldLabel, overflow: TextOverflow.ellipsis),
          ),
        if (signedIn) const PopupMenuDivider(),
        _languageItem(_MenuChoice.english, 'en', text.languageEnglish, session.language),
        _languageItem(_MenuChoice.turkish, 'tr', text.languageTurkish, session.language),
        if (signedIn) const PopupMenuDivider(),
        if (signedIn) PopupMenuItem(value: _MenuChoice.signOut, child: Text(text.signOut)),
      ],
    );
  }

  PopupMenuItem<_MenuChoice> _languageItem(
    _MenuChoice value,
    String code,
    String label,
    String current,
  ) => PopupMenuItem<_MenuChoice>(
    value: value,
    child: Row(
      children: [
        SizedBox(width: 24, child: code == current ? const Icon(Icons.check, size: 18, color: Tokens.accent) : null),
        const SizedBox(width: 8),
        // Each language name is read in its own language.
        Text.rich(TextSpan(text: label, locale: Locale(code))),
      ],
    ),
  );

  Future<void> _select(BuildContext context, _MenuChoice choice) async {
    final session = AppScope.of(context).session;
    final messenger = ScaffoldMessenger.of(context);
    final notSaved = AppLocalizations.of(context).languageNotSaved;
    try {
      switch (choice) {
        case _MenuChoice.english:
          await session.changeLanguage('en');
        case _MenuChoice.turkish:
          await session.changeLanguage('tr');
        case _MenuChoice.signOut:
          await session.signOut();
      }
    } on ApiException {
      // The language already changed on this device; only saving it on the account failed.
      messenger.showSnackBar(SnackBar(content: Text(notSaved)));
    }
  }
}
