import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:intl/intl.dart' as intl;

import 'app_localizations_en.dart';
import 'app_localizations_tr.dart';

// ignore_for_file: type=lint

/// Callers can lookup localized strings with an instance of AppLocalizations
/// returned by `AppLocalizations.of(context)`.
///
/// Applications need to include `AppLocalizations.delegate()` in their app's
/// `localizationDelegates` list, and the locales they support in the app's
/// `supportedLocales` list. For example:
///
/// ```dart
/// import 'l10n/app_localizations.dart';
///
/// return MaterialApp(
///   localizationsDelegates: AppLocalizations.localizationsDelegates,
///   supportedLocales: AppLocalizations.supportedLocales,
///   home: MyApplicationHome(),
/// );
/// ```
///
/// ## Update pubspec.yaml
///
/// Please make sure to update your pubspec.yaml to include the following
/// packages:
///
/// ```yaml
/// dependencies:
///   # Internationalization support.
///   flutter_localizations:
///     sdk: flutter
///   intl: any # Use the pinned version from flutter_localizations
///
///   # Rest of dependencies
/// ```
///
/// ## iOS Applications
///
/// iOS applications define key application metadata, including supported
/// locales, in an Info.plist file that is built into the application bundle.
/// To configure the locales supported by your app, you’ll need to edit this
/// file.
///
/// First, open your project’s ios/Runner.xcworkspace Xcode workspace file.
/// Then, in the Project Navigator, open the Info.plist file under the Runner
/// project’s Runner folder.
///
/// Next, select the Information Property List item, select Add Item from the
/// Editor menu, then select Localizations from the pop-up menu.
///
/// Select and expand the newly-created Localizations item then, for each
/// locale your application supports, add a new item and select the locale
/// you wish to add from the pop-up menu in the Value field. This list should
/// be consistent with the languages listed in the AppLocalizations.supportedLocales
/// property.
abstract class AppLocalizations {
  AppLocalizations(String locale) : localeName = intl.Intl.canonicalizedLocale(locale.toString());

  final String localeName;

  static AppLocalizations of(BuildContext context) {
    return Localizations.of<AppLocalizations>(context, AppLocalizations)!;
  }

  static const LocalizationsDelegate<AppLocalizations> delegate = _AppLocalizationsDelegate();

  /// A list of this localizations delegate along with the default localizations
  /// delegates.
  ///
  /// Returns a list of localizations delegates containing this delegate along with
  /// GlobalMaterialLocalizations.delegate, GlobalCupertinoLocalizations.delegate,
  /// and GlobalWidgetsLocalizations.delegate.
  ///
  /// Additional delegates can be added by appending to this list in
  /// MaterialApp. This list does not have to be used at all if a custom list
  /// of delegates is preferred or required.
  static const List<LocalizationsDelegate<dynamic>> localizationsDelegates = <LocalizationsDelegate<dynamic>>[
    delegate,
    GlobalMaterialLocalizations.delegate,
    GlobalCupertinoLocalizations.delegate,
    GlobalWidgetsLocalizations.delegate,
  ];

  /// A list of this localizations delegate's supported locales.
  static const List<Locale> supportedLocales = <Locale>[Locale('en'), Locale('tr')];

  /// No description provided for @appTitle.
  ///
  /// In en, this message translates to:
  /// **'AI Career Assistant'**
  String get appTitle;

  /// No description provided for @startupChecking.
  ///
  /// In en, this message translates to:
  /// **'Checking your session…'**
  String get startupChecking;

  /// No description provided for @serverUnreachable.
  ///
  /// In en, this message translates to:
  /// **'The service can’t be reached right now. Check your connection and try again.'**
  String get serverUnreachable;

  /// No description provided for @tryAgain.
  ///
  /// In en, this message translates to:
  /// **'Try again'**
  String get tryAgain;

  /// No description provided for @cancel.
  ///
  /// In en, this message translates to:
  /// **'Cancel'**
  String get cancel;

  /// No description provided for @language.
  ///
  /// In en, this message translates to:
  /// **'Language'**
  String get language;

  /// No description provided for @languageEnglish.
  ///
  /// In en, this message translates to:
  /// **'English'**
  String get languageEnglish;

  /// No description provided for @languageTurkish.
  ///
  /// In en, this message translates to:
  /// **'Türkçe'**
  String get languageTurkish;

  /// No description provided for @account.
  ///
  /// In en, this message translates to:
  /// **'Account'**
  String get account;

  /// No description provided for @signOut.
  ///
  /// In en, this message translates to:
  /// **'Sign out'**
  String get signOut;

  /// No description provided for @loadErrorTitle.
  ///
  /// In en, this message translates to:
  /// **'This screen could not be loaded'**
  String get loadErrorTitle;

  /// No description provided for @loadErrorBody.
  ///
  /// In en, this message translates to:
  /// **'The service may be unreachable for a moment. Nothing you saved is lost.'**
  String get loadErrorBody;

  /// No description provided for @authEmail.
  ///
  /// In en, this message translates to:
  /// **'Email'**
  String get authEmail;

  /// No description provided for @authPassword.
  ///
  /// In en, this message translates to:
  /// **'Password'**
  String get authPassword;

  /// No description provided for @authFullName.
  ///
  /// In en, this message translates to:
  /// **'Full name'**
  String get authFullName;

  /// No description provided for @signInTitle.
  ///
  /// In en, this message translates to:
  /// **'Sign in'**
  String get signInTitle;

  /// No description provided for @signInSubmit.
  ///
  /// In en, this message translates to:
  /// **'Sign in'**
  String get signInSubmit;

  /// No description provided for @signInSubmitting.
  ///
  /// In en, this message translates to:
  /// **'Signing in…'**
  String get signInSubmitting;

  /// No description provided for @signInSwitchPrompt.
  ///
  /// In en, this message translates to:
  /// **'No account yet?'**
  String get signInSwitchPrompt;

  /// No description provided for @signInSwitchLink.
  ///
  /// In en, this message translates to:
  /// **'Create one'**
  String get signInSwitchLink;

  /// No description provided for @registerTitle.
  ///
  /// In en, this message translates to:
  /// **'Create an account'**
  String get registerTitle;

  /// No description provided for @registerSubmit.
  ///
  /// In en, this message translates to:
  /// **'Create account'**
  String get registerSubmit;

  /// No description provided for @registerSubmitting.
  ///
  /// In en, this message translates to:
  /// **'Creating account…'**
  String get registerSubmitting;

  /// No description provided for @registerPasswordHint.
  ///
  /// In en, this message translates to:
  /// **'At least 8 characters.'**
  String get registerPasswordHint;

  /// No description provided for @registerSwitchPrompt.
  ///
  /// In en, this message translates to:
  /// **'Already have an account?'**
  String get registerSwitchPrompt;

  /// No description provided for @registerSwitchLink.
  ///
  /// In en, this message translates to:
  /// **'Sign in'**
  String get registerSwitchLink;

  /// No description provided for @authSamplePrompt.
  ///
  /// In en, this message translates to:
  /// **'Want to see a result first?'**
  String get authSamplePrompt;

  /// No description provided for @authSampleLink.
  ///
  /// In en, this message translates to:
  /// **'Open the sample analysis'**
  String get authSampleLink;

  /// No description provided for @authNameMissing.
  ///
  /// In en, this message translates to:
  /// **'Enter your name.'**
  String get authNameMissing;

  /// No description provided for @authEmailMissing.
  ///
  /// In en, this message translates to:
  /// **'Enter your email address.'**
  String get authEmailMissing;

  /// No description provided for @authEmailInvalid.
  ///
  /// In en, this message translates to:
  /// **'Enter a valid email address.'**
  String get authEmailInvalid;

  /// No description provided for @authPasswordMissing.
  ///
  /// In en, this message translates to:
  /// **'Enter your password.'**
  String get authPasswordMissing;

  /// No description provided for @authPasswordShort.
  ///
  /// In en, this message translates to:
  /// **'Use at least 8 characters.'**
  String get authPasswordShort;

  /// No description provided for @authErrorInvalidCredentials.
  ///
  /// In en, this message translates to:
  /// **'This email and password do not match an account. Check them and try again.'**
  String get authErrorInvalidCredentials;

  /// No description provided for @authErrorEmailTaken.
  ///
  /// In en, this message translates to:
  /// **'An account with this email already exists. Sign in instead, or use another email.'**
  String get authErrorEmailTaken;

  /// No description provided for @authErrorInvalidInput.
  ///
  /// In en, this message translates to:
  /// **'Check the fields: a valid email address and a password of at least 8 characters.'**
  String get authErrorInvalidInput;

  /// No description provided for @authErrorUnavailable.
  ///
  /// In en, this message translates to:
  /// **'The service is not reachable right now. Try again in a minute.'**
  String get authErrorUnavailable;

  /// No description provided for @authErrorGeneric.
  ///
  /// In en, this message translates to:
  /// **'Something went wrong. Try again.'**
  String get authErrorGeneric;

  /// No description provided for @showPassword.
  ///
  /// In en, this message translates to:
  /// **'Show password'**
  String get showPassword;

  /// No description provided for @hidePassword.
  ///
  /// In en, this message translates to:
  /// **'Hide password'**
  String get hidePassword;

  /// No description provided for @languageNotSaved.
  ///
  /// In en, this message translates to:
  /// **'The language changed on this phone, but it could not be saved to your account. Try again later.'**
  String get languageNotSaved;

  /// No description provided for @sessionExpired.
  ///
  /// In en, this message translates to:
  /// **'Your session has ended. Sign in again to continue.'**
  String get sessionExpired;

  /// No description provided for @historyTitle.
  ///
  /// In en, this message translates to:
  /// **'Analyses'**
  String get historyTitle;

  /// No description provided for @historyNewAnalysis.
  ///
  /// In en, this message translates to:
  /// **'New analysis'**
  String get historyNewAnalysis;

  /// No description provided for @historyStatusPending.
  ///
  /// In en, this message translates to:
  /// **'Queued'**
  String get historyStatusPending;

  /// No description provided for @historyStatusRunning.
  ///
  /// In en, this message translates to:
  /// **'Analyzing'**
  String get historyStatusRunning;

  /// No description provided for @historyStatusFailed.
  ///
  /// In en, this message translates to:
  /// **'Could not complete'**
  String get historyStatusFailed;

  /// No description provided for @historyEmptyTitle.
  ///
  /// In en, this message translates to:
  /// **'No analyses yet'**
  String get historyEmptyTitle;

  /// No description provided for @historyEmptyBody.
  ///
  /// In en, this message translates to:
  /// **'Add your CV and a job posting to see which requirements your CV supports and what to change before you apply.'**
  String get historyEmptyBody;

  /// No description provided for @historyEmptyTryPrompt.
  ///
  /// In en, this message translates to:
  /// **'Want to see it work first?'**
  String get historyEmptyTryPrompt;

  /// No description provided for @historyEmptyTryLink.
  ///
  /// In en, this message translates to:
  /// **'Try it with the sample CV and posting'**
  String get historyEmptyTryLink;

  /// No description provided for @historyEmptySamplePrompt.
  ///
  /// In en, this message translates to:
  /// **'Prefer to read a finished one?'**
  String get historyEmptySamplePrompt;

  /// No description provided for @historyEmptySampleLink.
  ///
  /// In en, this message translates to:
  /// **'Open the sample analysis'**
  String get historyEmptySampleLink;

  /// No description provided for @newAnalysisTitle.
  ///
  /// In en, this message translates to:
  /// **'New analysis'**
  String get newAnalysisTitle;

  /// No description provided for @newAnalysisIntro.
  ///
  /// In en, this message translates to:
  /// **'Pick a CV, paste the job posting and start. An analysis usually takes a minute or two.'**
  String get newAnalysisIntro;

  /// No description provided for @fillSample.
  ///
  /// In en, this message translates to:
  /// **'Fill with the sample'**
  String get fillSample;

  /// No description provided for @sampleFilled.
  ///
  /// In en, this message translates to:
  /// **'Filled with a fictional sample CV and job posting. Start the analysis to see a live result.'**
  String get sampleFilled;

  /// No description provided for @characterCount.
  ///
  /// In en, this message translates to:
  /// **'{count} / {max} characters'**
  String characterCount(String count, String max);

  /// No description provided for @overLimit.
  ///
  /// In en, this message translates to:
  /// **'Only the first {max} characters are analyzed.'**
  String overLimit(String max);

  /// No description provided for @resumeSheetTitle.
  ///
  /// In en, this message translates to:
  /// **'CV'**
  String get resumeSheetTitle;

  /// No description provided for @resumeLegend.
  ///
  /// In en, this message translates to:
  /// **'Which CV should be compared?'**
  String get resumeLegend;

  /// No description provided for @resumeSourcePdf.
  ///
  /// In en, this message translates to:
  /// **'PDF'**
  String get resumeSourcePdf;

  /// No description provided for @resumeSourceText.
  ///
  /// In en, this message translates to:
  /// **'Pasted text'**
  String get resumeSourceText;

  /// No description provided for @resumeCharacters.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{1 character} other{{count} characters}}'**
  String resumeCharacters(int count);

  /// No description provided for @resumeAddNew.
  ///
  /// In en, this message translates to:
  /// **'Add a new CV'**
  String get resumeAddNew;

  /// No description provided for @resumeAddFirst.
  ///
  /// In en, this message translates to:
  /// **'Add your CV'**
  String get resumeAddFirst;

  /// No description provided for @resumeNameLabel.
  ///
  /// In en, this message translates to:
  /// **'CV name'**
  String get resumeNameLabel;

  /// No description provided for @resumeNameHint.
  ///
  /// In en, this message translates to:
  /// **'Only you see this name, for example “CV, October 2026”.'**
  String get resumeNameHint;

  /// No description provided for @resumeSourceLegend.
  ///
  /// In en, this message translates to:
  /// **'How do you want to add it?'**
  String get resumeSourceLegend;

  /// No description provided for @resumePaste.
  ///
  /// In en, this message translates to:
  /// **'Paste text'**
  String get resumePaste;

  /// No description provided for @resumeUpload.
  ///
  /// In en, this message translates to:
  /// **'Upload PDF'**
  String get resumeUpload;

  /// No description provided for @resumeTextLabel.
  ///
  /// In en, this message translates to:
  /// **'CV text'**
  String get resumeTextLabel;

  /// No description provided for @resumeTextPlaceholder.
  ///
  /// In en, this message translates to:
  /// **'Paste the full text of your CV…'**
  String get resumeTextPlaceholder;

  /// No description provided for @resumeChooseFile.
  ///
  /// In en, this message translates to:
  /// **'Choose a PDF'**
  String get resumeChooseFile;

  /// No description provided for @resumeFileHint.
  ///
  /// In en, this message translates to:
  /// **'PDF up to 5 MB, with selectable text (not a scan).'**
  String get resumeFileHint;

  /// No description provided for @resumeReplaceFile.
  ///
  /// In en, this message translates to:
  /// **'Choose another file'**
  String get resumeReplaceFile;

  /// No description provided for @resumeDelete.
  ///
  /// In en, this message translates to:
  /// **'Delete'**
  String get resumeDelete;

  /// No description provided for @resumeDeleteConfirm.
  ///
  /// In en, this message translates to:
  /// **'Delete “{title}”?'**
  String resumeDeleteConfirm(String title);

  /// No description provided for @resumeDeleteConsequence.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =0{No analyses use this CV.} =1{The analysis made with this CV is deleted too.} other{The {count} analyses made with this CV are deleted too.}}'**
  String resumeDeleteConsequence(int count);

  /// No description provided for @resumeDeleteButton.
  ///
  /// In en, this message translates to:
  /// **'Delete CV'**
  String get resumeDeleteButton;

  /// No description provided for @resumeDeleting.
  ///
  /// In en, this message translates to:
  /// **'Deleting…'**
  String get resumeDeleting;

  /// No description provided for @resumeDeleteFailed.
  ///
  /// In en, this message translates to:
  /// **'The CV could not be deleted. Try again.'**
  String get resumeDeleteFailed;

  /// No description provided for @postingSheetTitle.
  ///
  /// In en, this message translates to:
  /// **'Job posting'**
  String get postingSheetTitle;

  /// No description provided for @postingTitleLabel.
  ///
  /// In en, this message translates to:
  /// **'Job title'**
  String get postingTitleLabel;

  /// No description provided for @postingCompanyLabel.
  ///
  /// In en, this message translates to:
  /// **'Company'**
  String get postingCompanyLabel;

  /// No description provided for @optional.
  ///
  /// In en, this message translates to:
  /// **'optional'**
  String get optional;

  /// No description provided for @postingTextLabel.
  ///
  /// In en, this message translates to:
  /// **'Posting text'**
  String get postingTextLabel;

  /// No description provided for @postingTextPlaceholder.
  ///
  /// In en, this message translates to:
  /// **'Paste the full job posting, including the requirements…'**
  String get postingTextPlaceholder;

  /// No description provided for @submitAnalysis.
  ///
  /// In en, this message translates to:
  /// **'Start analysis'**
  String get submitAnalysis;

  /// No description provided for @submittingAnalysis.
  ///
  /// In en, this message translates to:
  /// **'Starting…'**
  String get submittingAnalysis;

  /// No description provided for @submitNote.
  ///
  /// In en, this message translates to:
  /// **'You can leave this screen while it runs; the result is saved under Analyses.'**
  String get submitNote;

  /// No description provided for @discardTitle.
  ///
  /// In en, this message translates to:
  /// **'Discard what you entered?'**
  String get discardTitle;

  /// No description provided for @discardBody.
  ///
  /// In en, this message translates to:
  /// **'The CV and posting text you entered will be lost.'**
  String get discardBody;

  /// No description provided for @discardConfirm.
  ///
  /// In en, this message translates to:
  /// **'Discard'**
  String get discardConfirm;

  /// No description provided for @discardCancel.
  ///
  /// In en, this message translates to:
  /// **'Keep editing'**
  String get discardCancel;

  /// No description provided for @errorResumeTitleMissing.
  ///
  /// In en, this message translates to:
  /// **'Give this CV a name.'**
  String get errorResumeTitleMissing;

  /// No description provided for @errorResumeTextMissing.
  ///
  /// In en, this message translates to:
  /// **'Paste the text of your CV.'**
  String get errorResumeTextMissing;

  /// No description provided for @errorJobTitleMissing.
  ///
  /// In en, this message translates to:
  /// **'Add the job title.'**
  String get errorJobTitleMissing;

  /// No description provided for @errorJobTextMissing.
  ///
  /// In en, this message translates to:
  /// **'Paste the text of the job posting.'**
  String get errorJobTextMissing;

  /// No description provided for @errorTooShort.
  ///
  /// In en, this message translates to:
  /// **'Add more text: at least 50 characters are needed for an analysis.'**
  String get errorTooShort;

  /// No description provided for @errorFileMissing.
  ///
  /// In en, this message translates to:
  /// **'Choose a PDF file.'**
  String get errorFileMissing;

  /// No description provided for @errorFileType.
  ///
  /// In en, this message translates to:
  /// **'Only PDF files can be uploaded.'**
  String get errorFileType;

  /// No description provided for @errorFileTooLarge.
  ///
  /// In en, this message translates to:
  /// **'This file is larger than 5 MB.'**
  String get errorFileTooLarge;

  /// No description provided for @errorPdfInvalid.
  ///
  /// In en, this message translates to:
  /// **'This PDF could not be read. Try another file, or paste the text instead.'**
  String get errorPdfInvalid;

  /// No description provided for @errorPdfNoText.
  ///
  /// In en, this message translates to:
  /// **'This PDF has no selectable text (it may be a scan). Paste the text instead.'**
  String get errorPdfNoText;

  /// No description provided for @errorPdfEncrypted.
  ///
  /// In en, this message translates to:
  /// **'This PDF is password-protected. Remove the password or paste the text instead.'**
  String get errorPdfEncrypted;

  /// No description provided for @errorStartUnavailable.
  ///
  /// In en, this message translates to:
  /// **'The service is not reachable right now. Your text is still here; try again in a minute.'**
  String get errorStartUnavailable;

  /// No description provided for @errorStartGeneric.
  ///
  /// In en, this message translates to:
  /// **'The analysis could not be started. Your text is still here; try again.'**
  String get errorStartGeneric;

  /// No description provided for @analysisTitle.
  ///
  /// In en, this message translates to:
  /// **'Analysis'**
  String get analysisTitle;

  /// No description provided for @sampleNotice.
  ///
  /// In en, this message translates to:
  /// **'Sample analysis with a fictional CV and job posting.'**
  String get sampleNotice;

  /// No description provided for @comparedWith.
  ///
  /// In en, this message translates to:
  /// **'Compared with {resume}'**
  String comparedWith(String resume);

  /// No description provided for @fitStrong.
  ///
  /// In en, this message translates to:
  /// **'Strong fit'**
  String get fitStrong;

  /// No description provided for @fitModerate.
  ///
  /// In en, this message translates to:
  /// **'Moderate fit'**
  String get fitModerate;

  /// No description provided for @fitWeak.
  ///
  /// In en, this message translates to:
  /// **'Weak fit'**
  String get fitWeak;

  /// No description provided for @howScored.
  ///
  /// In en, this message translates to:
  /// **'How is this scored?'**
  String get howScored;

  /// No description provided for @limitationsTitle.
  ///
  /// In en, this message translates to:
  /// **'What this analysis cannot know'**
  String get limitationsTitle;

  /// No description provided for @statusMatched.
  ///
  /// In en, this message translates to:
  /// **'Matched'**
  String get statusMatched;

  /// No description provided for @statusPartial.
  ///
  /// In en, this message translates to:
  /// **'Partial'**
  String get statusPartial;

  /// No description provided for @statusMissing.
  ///
  /// In en, this message translates to:
  /// **'Missing'**
  String get statusMissing;

  /// No description provided for @statusCountMatched.
  ///
  /// In en, this message translates to:
  /// **'{count} matched'**
  String statusCountMatched(int count);

  /// No description provided for @statusCountPartial.
  ///
  /// In en, this message translates to:
  /// **'{count} partial'**
  String statusCountPartial(int count);

  /// No description provided for @statusCountMissing.
  ///
  /// In en, this message translates to:
  /// **'{count} missing'**
  String statusCountMissing(int count);

  /// No description provided for @importanceMustHave.
  ///
  /// In en, this message translates to:
  /// **'Must-have'**
  String get importanceMustHave;

  /// No description provided for @importanceNiceToHave.
  ///
  /// In en, this message translates to:
  /// **'Nice-to-have'**
  String get importanceNiceToHave;

  /// No description provided for @requirementsTitle.
  ///
  /// In en, this message translates to:
  /// **'Requirements'**
  String get requirementsTitle;

  /// No description provided for @requirementsEmpty.
  ///
  /// In en, this message translates to:
  /// **'No requirements could be extracted from this job posting. Check that the full posting text was provided, then run the analysis again.'**
  String get requirementsEmpty;

  /// No description provided for @sheetLines.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{1 line read from this CV} other{{count} lines read from this CV}}'**
  String sheetLines(int count);

  /// No description provided for @sheetEmpty.
  ///
  /// In en, this message translates to:
  /// **'No evidence statements could be extracted from this CV.'**
  String get sheetEmpty;

  /// No description provided for @missingNote.
  ///
  /// In en, this message translates to:
  /// **'Nothing in this CV supports “{requirement}”.'**
  String missingNote(String requirement);

  /// No description provided for @otherSection.
  ///
  /// In en, this message translates to:
  /// **'Other'**
  String get otherSection;

  /// No description provided for @showInCv.
  ///
  /// In en, this message translates to:
  /// **'Show in the CV'**
  String get showInCv;

  /// No description provided for @fixesTitle.
  ///
  /// In en, this message translates to:
  /// **'What to fix'**
  String get fixesTitle;

  /// No description provided for @fixesEmpty.
  ///
  /// In en, this message translates to:
  /// **'No changes are suggested for this posting.'**
  String get fixesEmpty;

  /// No description provided for @priorityHigh.
  ///
  /// In en, this message translates to:
  /// **'High'**
  String get priorityHigh;

  /// No description provided for @priorityMedium.
  ///
  /// In en, this message translates to:
  /// **'Medium'**
  String get priorityMedium;

  /// No description provided for @priorityLow.
  ///
  /// In en, this message translates to:
  /// **'Low'**
  String get priorityLow;

  /// No description provided for @targetSkill.
  ///
  /// In en, this message translates to:
  /// **'Skill'**
  String get targetSkill;

  /// No description provided for @targetCvSection.
  ///
  /// In en, this message translates to:
  /// **'CV section'**
  String get targetCvSection;

  /// No description provided for @targetProject.
  ///
  /// In en, this message translates to:
  /// **'Project'**
  String get targetProject;

  /// No description provided for @targetInterviewTopic.
  ///
  /// In en, this message translates to:
  /// **'Interview topic'**
  String get targetInterviewTopic;

  /// No description provided for @questionsTitle.
  ///
  /// In en, this message translates to:
  /// **'Interview questions'**
  String get questionsTitle;

  /// No description provided for @questionsIntro.
  ///
  /// In en, this message translates to:
  /// **'Questions an interviewer is likely to ask, based on this posting and the gaps above.'**
  String get questionsIntro;

  /// No description provided for @questionsGenerate.
  ///
  /// In en, this message translates to:
  /// **'Generate interview questions'**
  String get questionsGenerate;

  /// No description provided for @questionsGenerating.
  ///
  /// In en, this message translates to:
  /// **'Writing questions…'**
  String get questionsGenerating;

  /// No description provided for @questionsError.
  ///
  /// In en, this message translates to:
  /// **'The questions could not be generated. The AI service may be busy; try again in a minute.'**
  String get questionsError;

  /// No description provided for @questionsWhy.
  ///
  /// In en, this message translates to:
  /// **'Why this question'**
  String get questionsWhy;

  /// No description provided for @questionsEmpty.
  ///
  /// In en, this message translates to:
  /// **'No questions were returned for this posting.'**
  String get questionsEmpty;

  /// No description provided for @categoryTechnical.
  ///
  /// In en, this message translates to:
  /// **'Technical'**
  String get categoryTechnical;

  /// No description provided for @categoryBehavioral.
  ///
  /// In en, this message translates to:
  /// **'Behavioral'**
  String get categoryBehavioral;

  /// No description provided for @categoryProject.
  ///
  /// In en, this message translates to:
  /// **'Project'**
  String get categoryProject;

  /// No description provided for @categoryGap.
  ///
  /// In en, this message translates to:
  /// **'Gap'**
  String get categoryGap;

  /// No description provided for @progressPending.
  ///
  /// In en, this message translates to:
  /// **'Queued'**
  String get progressPending;

  /// No description provided for @progressRunning.
  ///
  /// In en, this message translates to:
  /// **'Analyzing'**
  String get progressRunning;

  /// No description provided for @progressTitle.
  ///
  /// In en, this message translates to:
  /// **'Comparing your CV with this posting'**
  String get progressTitle;

  /// No description provided for @progressBody.
  ///
  /// In en, this message translates to:
  /// **'Requirements are extracted from the posting, matched against your CV and checked for evidence. This usually takes a minute or two, longer when the free AI service is busy. The screen updates on its own.'**
  String get progressBody;

  /// No description provided for @failedTitle.
  ///
  /// In en, this message translates to:
  /// **'This analysis could not be completed'**
  String get failedTitle;

  /// No description provided for @failedBody.
  ///
  /// In en, this message translates to:
  /// **'The AI service did not answer in time or returned an invalid result. Your CV and the posting are saved, so you can run the analysis again.'**
  String get failedBody;

  /// No description provided for @failedRetry.
  ///
  /// In en, this message translates to:
  /// **'Run the analysis again'**
  String get failedRetry;

  /// No description provided for @failedNewAnalysis.
  ///
  /// In en, this message translates to:
  /// **'Start a new analysis'**
  String get failedNewAnalysis;

  /// No description provided for @failedStarting.
  ///
  /// In en, this message translates to:
  /// **'Starting…'**
  String get failedStarting;

  /// No description provided for @reasonAiQuotaExhausted.
  ///
  /// In en, this message translates to:
  /// **'The free AI quota is used up for now. It renews daily, so try again later; your CV and the posting are saved.'**
  String get reasonAiQuotaExhausted;

  /// No description provided for @reasonNoRequirements.
  ///
  /// In en, this message translates to:
  /// **'No requirements could be found in the job posting. Check that the full posting text was pasted, then start a new analysis.'**
  String get reasonNoRequirements;

  /// No description provided for @reasonNoEvidence.
  ///
  /// In en, this message translates to:
  /// **'No usable statements could be read from the CV. Check the CV text, then start a new analysis.'**
  String get reasonNoEvidence;
}

class _AppLocalizationsDelegate extends LocalizationsDelegate<AppLocalizations> {
  const _AppLocalizationsDelegate();

  @override
  Future<AppLocalizations> load(Locale locale) {
    return SynchronousFuture<AppLocalizations>(lookupAppLocalizations(locale));
  }

  @override
  bool isSupported(Locale locale) => <String>['en', 'tr'].contains(locale.languageCode);

  @override
  bool shouldReload(_AppLocalizationsDelegate old) => false;
}

AppLocalizations lookupAppLocalizations(Locale locale) {
  // Lookup logic when only language code is specified.
  switch (locale.languageCode) {
    case 'en':
      return AppLocalizationsEn();
    case 'tr':
      return AppLocalizationsTr();
  }

  throw FlutterError(
    'AppLocalizations.delegate failed to load unsupported locale "$locale". This is likely '
    'an issue with the localizations generation tool. Please file an issue '
    'on GitHub with a reproducible sample app and the gen-l10n configuration '
    'that was used.',
  );
}
