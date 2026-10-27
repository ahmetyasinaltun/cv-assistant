// ignore: unused_import
import 'package:intl/intl.dart' as intl;

import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for Turkish (`tr`).
class AppLocalizationsTr extends AppLocalizations {
  AppLocalizationsTr([String locale = 'tr']) : super(locale);

  @override
  String get appTitle => 'AI Kariyer Asistanı';

  @override
  String get startupChecking => 'Oturumun kontrol ediliyor…';

  @override
  String get serverUnreachable =>
      'Servise şu an ulaşılamıyor. Bağlantını kontrol edip tekrar dene.';

  @override
  String get tryAgain => 'Tekrar dene';

  @override
  String signedInAs(String name) {
    return '$name olarak giriş yapıldı';
  }

  @override
  String get signedOut => 'Giriş yapılmadı';

  @override
  String get screensComing => 'Mobil ekranlar sıradaki adımda tasarlanıyor.';
}
