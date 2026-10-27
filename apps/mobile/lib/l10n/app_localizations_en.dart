// ignore: unused_import
import 'package:intl/intl.dart' as intl;

import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for English (`en`).
class AppLocalizationsEn extends AppLocalizations {
  AppLocalizationsEn([String locale = 'en']) : super(locale);

  @override
  String get appTitle => 'AI Career Assistant';

  @override
  String get startupChecking => 'Checking your session…';

  @override
  String get serverUnreachable =>
      'The service can’t be reached right now. Check your connection and try again.';

  @override
  String get tryAgain => 'Try again';

  @override
  String signedInAs(String name) {
    return 'Signed in as $name';
  }

  @override
  String get signedOut => 'Not signed in';

  @override
  String get screensComing => 'The mobile screens are being designed next.';
}
