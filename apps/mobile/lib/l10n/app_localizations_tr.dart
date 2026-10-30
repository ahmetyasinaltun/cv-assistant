// ignore: unused_import
import 'package:intl/intl.dart' as intl;

import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for Turkish (`tr`).
class AppLocalizationsTr extends AppLocalizations {
  AppLocalizationsTr([String locale = 'tr']) : super(locale);

  @override
  String get appTitle => 'AI Career Assistant';

  @override
  String get startupChecking => 'Oturumun kontrol ediliyor…';

  @override
  String get serverUnreachable => 'Servise şu an ulaşılamıyor. Bağlantını kontrol edip tekrar dene.';

  @override
  String get tryAgain => 'Tekrar dene';

  @override
  String get cancel => 'Vazgeç';

  @override
  String get language => 'Dil';

  @override
  String get languageEnglish => 'English';

  @override
  String get languageTurkish => 'Türkçe';

  @override
  String get account => 'Hesap';

  @override
  String get signOut => 'Çıkış yap';

  @override
  String get loadErrorTitle => 'Bu ekran yüklenemedi';

  @override
  String get loadErrorBody => 'Servise şu an ulaşılamıyor olabilir. Kaydettiğin hiçbir şey kaybolmadı.';

  @override
  String get authEmail => 'E-posta';

  @override
  String get authPassword => 'Şifre';

  @override
  String get authFullName => 'Ad soyad';

  @override
  String get signInTitle => 'Giriş yap';

  @override
  String get signInSubmit => 'Giriş yap';

  @override
  String get signInSubmitting => 'Giriş yapılıyor…';

  @override
  String get signInSwitchPrompt => 'Hesabın yok mu?';

  @override
  String get signInSwitchLink => 'Hesap oluştur';

  @override
  String get registerTitle => 'Hesap oluştur';

  @override
  String get registerSubmit => 'Hesap oluştur';

  @override
  String get registerSubmitting => 'Hesap oluşturuluyor…';

  @override
  String get registerPasswordHint => 'En az 8 karakter.';

  @override
  String get registerSwitchPrompt => 'Zaten hesabın var mı?';

  @override
  String get registerSwitchLink => 'Giriş yap';

  @override
  String get appTagline => 'CV’nin bir iş ilanına ne kadar uyduğunu, her kararın dayandığı kanıtla birlikte gör.';

  @override
  String get authSamplePrompt => 'Önce bir sonuç görmek ister misin?';

  @override
  String get authSampleLink => 'Örnek analizi aç';

  @override
  String get authNameMissing => 'Adını yaz.';

  @override
  String get authEmailMissing => 'E-posta adresini yaz.';

  @override
  String get authEmailInvalid => 'Geçerli bir e-posta adresi yaz.';

  @override
  String get authPasswordMissing => 'Şifreni yaz.';

  @override
  String get authPasswordShort => 'En az 8 karakter kullan.';

  @override
  String get authErrorInvalidCredentials => 'Bu e-posta ve şifreyle eşleşen bir hesap yok. Kontrol edip tekrar dene.';

  @override
  String get authErrorEmailTaken =>
      'Bu e-postayla açılmış bir hesap zaten var. Giriş yap ya da başka bir e-posta kullan.';

  @override
  String get authErrorInvalidInput =>
      'Alanları kontrol et: geçerli bir e-posta adresi ve en az 8 karakterlik bir şifre gerekiyor.';

  @override
  String get authErrorUnavailable => 'Servise şu an ulaşılamıyor. Bir dakika sonra tekrar dene.';

  @override
  String get authErrorGeneric => 'Bir şeyler ters gitti. Tekrar dene.';

  @override
  String get showPassword => 'Şifreyi göster';

  @override
  String get hidePassword => 'Şifreyi gizle';

  @override
  String get languageNotSaved => 'Dil bu telefonda değişti ama hesabına kaydedilemedi. Daha sonra tekrar dene.';

  @override
  String get sessionExpired => 'Oturumun sona erdi. Devam etmek için tekrar giriş yap.';

  @override
  String get historyTitle => 'Analizler';

  @override
  String get historyNewAnalysis => 'Yeni analiz';

  @override
  String get historyStatusPending => 'Sırada';

  @override
  String get historyStatusRunning => 'Analiz ediliyor';

  @override
  String get historyStatusFailed => 'Tamamlanamadı';

  @override
  String get historyEmptyTitle => 'Henüz analiz yok';

  @override
  String get historyEmptyBody =>
      'CV’ni ve bir iş ilanını ekle; CV’nin hangi gereksinimleri karşıladığını ve başvurmadan önce neyi değiştirmen gerektiğini gör.';

  @override
  String get historyEmptyTryPrompt => 'Önce nasıl çalıştığını görmek ister misin?';

  @override
  String get historyEmptyTryLink => 'Örnek CV ve ilanla dene';

  @override
  String get historyEmptySamplePrompt => 'Önce hazır bir sonucu okumak mı istersin?';

  @override
  String get historyEmptySampleLink => 'Örnek analizi aç';

  @override
  String get newAnalysisTitle => 'Yeni analiz';

  @override
  String get newAnalysisIntro =>
      'Bir CV seç, iş ilanını yapıştır ve başlat. Bir analiz genellikle bir iki dakika sürer.';

  @override
  String get fillSample => 'Örnekle doldur';

  @override
  String get sampleFilled =>
      'Kurgusal bir örnek CV ve iş ilanıyla dolduruldu. Canlı bir sonuç görmek için analizi başlat.';

  @override
  String characterCount(String count, String max) {
    return '$count / $max karakter';
  }

  @override
  String overLimit(String max) {
    return 'Yalnızca ilk $max karakter analiz edilir.';
  }

  @override
  String get resumeSheetTitle => 'CV';

  @override
  String get resumeLegend => 'Hangi CV karşılaştırılsın?';

  @override
  String get resumeSourcePdf => 'PDF';

  @override
  String get resumeSourceText => 'Yapıştırılmış metin';

  @override
  String resumeCharacters(int count) {
    final intl.NumberFormat countNumberFormat = intl.NumberFormat.decimalPattern(localeName);
    final String countString = countNumberFormat.format(count);

    String _temp0 = intl.Intl.pluralLogic(count, locale: localeName, other: '$countString karakter');
    return '$_temp0';
  }

  @override
  String get resumeAddNew => 'Yeni CV ekle';

  @override
  String get resumeAddFirst => 'CV’ni ekle';

  @override
  String get resumeNameLabel => 'CV adı';

  @override
  String get resumeNameHint => 'Bu adı yalnızca sen görürsün, örneğin “CV, Ekim 2026”.';

  @override
  String get resumeSourceLegend => 'Nasıl eklemek istersin?';

  @override
  String get resumePaste => 'Metni yapıştır';

  @override
  String get resumeUpload => 'PDF yükle';

  @override
  String get resumeTextLabel => 'CV metni';

  @override
  String get resumeTextPlaceholder => 'CV’nin tam metnini buraya yapıştır…';

  @override
  String get resumeChooseFile => 'PDF seç';

  @override
  String get resumeFileHint => 'En fazla 5 MB, metni seçilebilen bir PDF (taranmış görüntü değil).';

  @override
  String get resumeReplaceFile => 'Başka bir dosya seç';

  @override
  String get resumeDelete => 'Sil';

  @override
  String resumeDeleteConfirm(String title) {
    return '“$title” silinsin mi?';
  }

  @override
  String resumeDeleteConsequence(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'Bu CV ile yapılan $count analiz de silinir.',
      one: 'Bu CV ile yapılan analiz de silinir.',
      zero: 'Bu CV’yi kullanan bir analiz yok.',
    );
    return '$_temp0';
  }

  @override
  String get resumeDeleteButton => 'CV’yi sil';

  @override
  String get resumeDeleting => 'Siliniyor…';

  @override
  String get resumeDeleteFailed => 'CV silinemedi. Tekrar dene.';

  @override
  String get postingSheetTitle => 'İş ilanı';

  @override
  String get postingTitleLabel => 'Pozisyon';

  @override
  String get postingCompanyLabel => 'Şirket';

  @override
  String get optional => 'isteğe bağlı';

  @override
  String get postingTextLabel => 'İlan metni';

  @override
  String get postingTextPlaceholder => 'Gereksinimler dahil, ilanın tam metnini buraya yapıştır…';

  @override
  String get submitAnalysis => 'Analizi başlat';

  @override
  String get submittingAnalysis => 'Başlatılıyor…';

  @override
  String get submitNote => 'Analiz sürerken bu ekrandan ayrılabilirsin; sonuç Analizler altında saklanır.';

  @override
  String get discardTitle => 'Yazdıkların silinsin mi?';

  @override
  String get discardBody => 'Girdiğin CV ve ilan metni kaybolacak.';

  @override
  String get discardConfirm => 'Sil ve çık';

  @override
  String get discardCancel => 'Düzenlemeye devam et';

  @override
  String get errorResumeTitleMissing => 'Bu CV’ye bir ad ver.';

  @override
  String get errorResumeTextMissing => 'CV’nin metnini yapıştır.';

  @override
  String get errorJobTitleMissing => 'Pozisyon adını yaz.';

  @override
  String get errorJobTextMissing => 'İlan metnini yapıştır.';

  @override
  String get errorTooShort => 'Biraz daha metin ekle: analiz için en az 50 karakter gerekiyor.';

  @override
  String get errorFileMissing => 'Bir PDF dosyası seç.';

  @override
  String get errorFileType => 'Yalnızca PDF dosyaları yüklenebilir.';

  @override
  String get errorFileTooLarge => 'Bu dosya 5 MB’tan büyük.';

  @override
  String get errorPdfInvalid => 'Bu PDF okunamadı. Başka bir dosya dene ya da metni yapıştır.';

  @override
  String get errorPdfNoText => 'Bu PDF’te seçilebilir metin yok (taranmış olabilir). Metni yapıştır.';

  @override
  String get errorPdfEncrypted => 'Bu PDF şifreli. Şifreyi kaldır ya da metni yapıştır.';

  @override
  String get errorStartUnavailable => 'Servise şu an ulaşılamıyor. Metnin hâlâ burada; bir dakika sonra tekrar dene.';

  @override
  String get errorStartGeneric => 'Analiz başlatılamadı. Metnin hâlâ burada; tekrar dene.';

  @override
  String get analysisTitle => 'Analiz';

  @override
  String get sampleNotice => 'Kurgusal bir CV ve iş ilanıyla hazırlanmış örnek analiz.';

  @override
  String comparedWith(String resume) {
    return 'Karşılaştırılan CV: $resume';
  }

  @override
  String get fitStrong => 'Güçlü uyum';

  @override
  String get fitModerate => 'Orta uyum';

  @override
  String get fitWeak => 'Zayıf uyum';

  @override
  String get howScored => 'Puan nasıl hesaplanıyor?';

  @override
  String get limitationsTitle => 'Bu analizin bilemeyecekleri';

  @override
  String get statusMatched => 'Karşılandı';

  @override
  String get statusPartial => 'Kısmen';

  @override
  String get statusMissing => 'Eksik';

  @override
  String statusCountMatched(int count) {
    return '$count karşılandı';
  }

  @override
  String statusCountPartial(int count) {
    return '$count kısmen';
  }

  @override
  String statusCountMissing(int count) {
    return '$count eksik';
  }

  @override
  String get importanceMustHave => 'Zorunlu';

  @override
  String get importanceNiceToHave => 'Tercih sebebi';

  @override
  String get requirementsTitle => 'Şartlar';

  @override
  String get requirementsEmpty =>
      'Bu ilandan şart çıkarılamadı. İlan metninin tamamının girildiğini kontrol edip analizi yeniden çalıştır.';

  @override
  String sheetLines(int count) {
    String _temp0 = intl.Intl.pluralLogic(count, locale: localeName, other: 'Bu CV’den okunan $count satır');
    return '$_temp0';
  }

  @override
  String get sheetEmpty => 'Bu CV’den kanıt cümlesi çıkarılamadı.';

  @override
  String missingNote(String requirement) {
    return 'Bu CV’de “$requirement” şartını destekleyen bir şey yok.';
  }

  @override
  String get otherSection => 'Diğer';

  @override
  String scoreLabel(int score) {
    return 'Puan: 100 üzerinden $score';
  }

  @override
  String get summaryTitle => 'Kısaca';

  @override
  String requirementCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(count, locale: localeName, other: '$count şart');
    return '$_temp0';
  }

  @override
  String get breakdownCaption => 'Puanı oluşturan parçalar';

  @override
  String get breakdownNote => 'Geniş parçalar zorunlu şartlar; puanda iki kat sayılırlar.';

  @override
  String fixesCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(count, locale: localeName, other: '$count öneri');
    return '$_temp0';
  }

  @override
  String get showInCv => 'CV’de göster';

  @override
  String get fixesTitle => 'Neyi düzeltmeli';

  @override
  String get fixesEmpty => 'Bu ilan için önerilen bir değişiklik yok.';

  @override
  String get priorityHigh => 'Yüksek';

  @override
  String get priorityMedium => 'Orta';

  @override
  String get priorityLow => 'Düşük';

  @override
  String get targetSkill => 'Beceri';

  @override
  String get targetCvSection => 'CV bölümü';

  @override
  String get targetProject => 'Proje';

  @override
  String get targetInterviewTopic => 'Mülakat konusu';

  @override
  String get questionsTitle => 'Mülakat soruları';

  @override
  String get questionsIntro => 'Bu ilana ve yukarıdaki eksiklere göre mülakatta sorulması muhtemel sorular.';

  @override
  String get questionsGenerate => 'Mülakat sorularını oluştur';

  @override
  String get questionsGenerating => 'Sorular yazılıyor…';

  @override
  String get questionsError =>
      'Sorular oluşturulamadı. Yapay zeka servisi meşgul olabilir; bir dakika sonra tekrar dene.';

  @override
  String get questionsWhy => 'Neden bu soru';

  @override
  String get questionsEmpty => 'Bu ilan için soru dönmedi.';

  @override
  String get categoryTechnical => 'Teknik';

  @override
  String get categoryBehavioral => 'Davranışsal';

  @override
  String get categoryProject => 'Proje';

  @override
  String get categoryGap => 'Eksik alan';

  @override
  String get progressPending => 'Sırada';

  @override
  String get progressRunning => 'Analiz ediliyor';

  @override
  String get progressTitle => 'CV’n bu ilanla karşılaştırılıyor';

  @override
  String get progressBody =>
      'İlandaki şartlar çıkarılıyor, CV’ndeki kanıtlarla eşleştiriliyor ve kontrol ediliyor. Bu genellikle bir iki dakika sürer, ücretsiz yapay zeka servisi yoğunsa daha uzun. Ekran kendiliğinden güncellenir.';

  @override
  String get failedTitle => 'Bu analiz tamamlanamadı';

  @override
  String get failedBody =>
      'Yapay zeka servisi zamanında yanıt vermedi ya da geçersiz bir sonuç döndürdü. CV’n ve ilan kayıtlı; analizi yeniden çalıştırabilirsin.';

  @override
  String get failedRetry => 'Analizi yeniden çalıştır';

  @override
  String get failedNewAnalysis => 'Yeni analiz başlat';

  @override
  String get failedStarting => 'Başlatılıyor…';

  @override
  String get reasonAiQuotaExhausted =>
      'Ücretsiz yapay zeka kotası şimdilik doldu. Kota her gün yenilenir; daha sonra tekrar dene. CV’n ve ilan kayıtlı.';

  @override
  String get reasonNoRequirements =>
      'İş ilanında hiç gereksinim bulunamadı. İlanın tam metninin yapıştırıldığını kontrol et, sonra yeni bir analiz başlat.';

  @override
  String get reasonNoEvidence =>
      'CV’den kullanılabilir bir ifade okunamadı. CV metnini kontrol et, sonra yeni bir analiz başlat.';
}
