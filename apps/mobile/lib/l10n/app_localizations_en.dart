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
  String get serverUnreachable => 'The service can’t be reached right now. Check your connection and try again.';

  @override
  String get tryAgain => 'Try again';

  @override
  String get cancel => 'Cancel';

  @override
  String get language => 'Language';

  @override
  String get languageEnglish => 'English';

  @override
  String get languageTurkish => 'Türkçe';

  @override
  String get account => 'Account';

  @override
  String get signOut => 'Sign out';

  @override
  String get loadErrorTitle => 'This screen could not be loaded';

  @override
  String get loadErrorBody => 'The service may be unreachable for a moment. Nothing you saved is lost.';

  @override
  String get authEmail => 'Email';

  @override
  String get authPassword => 'Password';

  @override
  String get authFullName => 'Full name';

  @override
  String get signInTitle => 'Sign in';

  @override
  String get signInSubmit => 'Sign in';

  @override
  String get signInSubmitting => 'Signing in…';

  @override
  String get signInSwitchPrompt => 'No account yet?';

  @override
  String get signInSwitchLink => 'Create one';

  @override
  String get registerTitle => 'Create an account';

  @override
  String get registerSubmit => 'Create account';

  @override
  String get registerSubmitting => 'Creating account…';

  @override
  String get registerPasswordHint => 'At least 8 characters.';

  @override
  String get registerSwitchPrompt => 'Already have an account?';

  @override
  String get registerSwitchLink => 'Sign in';

  @override
  String get appTagline => 'See how your CV matches a job posting, with the evidence behind every judgement.';

  @override
  String get authSamplePrompt => 'Want to see a result first?';

  @override
  String get authSampleLink => 'Open the sample analysis';

  @override
  String get authNameMissing => 'Enter your name.';

  @override
  String get authEmailMissing => 'Enter your email address.';

  @override
  String get authEmailInvalid => 'Enter a valid email address.';

  @override
  String get authPasswordMissing => 'Enter your password.';

  @override
  String get authPasswordShort => 'Use at least 8 characters.';

  @override
  String get authErrorInvalidCredentials =>
      'This email and password do not match an account. Check them and try again.';

  @override
  String get authErrorEmailTaken => 'An account with this email already exists. Sign in instead, or use another email.';

  @override
  String get authErrorPasswordTooLong => 'This password is too long. Choose a shorter one.';

  @override
  String get authErrorTooManyAttempts => 'Too many failed attempts for this email. Wait 15 minutes and try again.';

  @override
  String get authErrorInvalidInput =>
      'Check the fields: a valid email address and a password of at least 8 characters.';

  @override
  String get authErrorUnavailable => 'The service is not reachable right now. Try again in a minute.';

  @override
  String get authErrorGeneric => 'Something went wrong. Try again.';

  @override
  String get showPassword => 'Show password';

  @override
  String get hidePassword => 'Hide password';

  @override
  String get languageNotSaved =>
      'The language changed on this phone, but it could not be saved to your account. Try again later.';

  @override
  String get sessionExpired => 'Your session has ended. Sign in again to continue.';

  @override
  String get historyTitle => 'Analyses';

  @override
  String get historyNewAnalysis => 'New analysis';

  @override
  String get historyStatusPending => 'Queued';

  @override
  String get historyStatusRunning => 'Analyzing';

  @override
  String get historyStatusFailed => 'Could not complete';

  @override
  String get historyEmptyTitle => 'No analyses yet';

  @override
  String get historyEmptyBody =>
      'Add your CV and a job posting to see which requirements your CV supports and what to change before you apply.';

  @override
  String get historyEmptyTryPrompt => 'Want to see it work first?';

  @override
  String get historyEmptyTryLink => 'Try it with the sample CV and posting';

  @override
  String get historyEmptySamplePrompt => 'Prefer to read a finished one?';

  @override
  String get historyEmptySampleLink => 'Open the sample analysis';

  @override
  String get newAnalysisTitle => 'New analysis';

  @override
  String get newAnalysisIntro =>
      'Pick a CV, paste the job posting and start. An analysis usually takes a minute or two.';

  @override
  String get fillSample => 'Fill with the sample';

  @override
  String get sampleFilled =>
      'Filled with a fictional sample CV and job posting. Start the analysis to see a live result.';

  @override
  String characterCount(String count, String max) {
    return '$count / $max characters';
  }

  @override
  String overLimit(String max) {
    return 'Only the first $max characters are analyzed.';
  }

  @override
  String get resumeSheetTitle => 'CV';

  @override
  String get resumeLegend => 'Which CV should be compared?';

  @override
  String get resumeSourcePdf => 'PDF';

  @override
  String get resumeSourceText => 'Pasted text';

  @override
  String resumeCharacters(int count) {
    final intl.NumberFormat countNumberFormat = intl.NumberFormat.decimalPattern(localeName);
    final String countString = countNumberFormat.format(count);

    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$countString characters',
      one: '1 character',
    );
    return '$_temp0';
  }

  @override
  String get resumeAddNew => 'Add a new CV';

  @override
  String get resumeAddFirst => 'Add your CV';

  @override
  String get resumeNameLabel => 'CV name';

  @override
  String get resumeNameHint => 'Only you see this name, for example “CV, October 2026”.';

  @override
  String get resumeSourceLegend => 'How do you want to add it?';

  @override
  String get resumePaste => 'Paste text';

  @override
  String get resumeUpload => 'Upload PDF';

  @override
  String get resumeTextLabel => 'CV text';

  @override
  String get resumeTextPlaceholder => 'Paste the full text of your CV…';

  @override
  String get resumeChooseFile => 'Choose a PDF';

  @override
  String get resumeFileHint => 'PDF up to 5 MB, with selectable text (not a scan).';

  @override
  String get resumeReplaceFile => 'Choose another file';

  @override
  String get resumeDelete => 'Delete';

  @override
  String resumeDeleteConfirm(String title) {
    return 'Delete “$title”?';
  }

  @override
  String resumeDeleteConsequence(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'The $count analyses made with this CV are deleted too.',
      one: 'The analysis made with this CV is deleted too.',
      zero: 'No analyses use this CV.',
    );
    return '$_temp0';
  }

  @override
  String get resumeDeleteButton => 'Delete CV';

  @override
  String get resumeDeleting => 'Deleting…';

  @override
  String get resumeDeleteFailed => 'The CV could not be deleted. Try again.';

  @override
  String get postingSheetTitle => 'Job posting';

  @override
  String get postingTitleLabel => 'Job title';

  @override
  String get postingCompanyLabel => 'Company';

  @override
  String get optional => 'optional';

  @override
  String get postingTextLabel => 'Posting text';

  @override
  String get postingTextPlaceholder => 'Paste the full job posting, including the requirements…';

  @override
  String get submitAnalysis => 'Start analysis';

  @override
  String get submittingAnalysis => 'Starting…';

  @override
  String get submitNote => 'You can leave this screen while it runs; the result is saved under Analyses.';

  @override
  String get discardTitle => 'Discard what you entered?';

  @override
  String get discardBody => 'The CV and posting text you entered will be lost.';

  @override
  String get discardConfirm => 'Discard';

  @override
  String get discardCancel => 'Keep editing';

  @override
  String get errorResumeTitleMissing => 'Give this CV a name.';

  @override
  String get errorResumeTextMissing => 'Paste the text of your CV.';

  @override
  String get errorJobTitleMissing => 'Add the job title.';

  @override
  String get errorJobTextMissing => 'Paste the text of the job posting.';

  @override
  String get errorTooShort => 'Add more text: at least 50 characters are needed for an analysis.';

  @override
  String get errorFileMissing => 'Choose a PDF file.';

  @override
  String get errorFileType => 'Only PDF files can be uploaded.';

  @override
  String get errorFileTooLarge => 'This file is larger than 5 MB.';

  @override
  String get errorPdfInvalid => 'This PDF could not be read. Try another file, or paste the text instead.';

  @override
  String get errorPdfNoText => 'This PDF has no selectable text (it may be a scan). Paste the text instead.';

  @override
  String get errorPdfEncrypted => 'This PDF is password-protected. Remove the password or paste the text instead.';

  @override
  String get errorStartUnavailable =>
      'The service is not reachable right now. Your text is still here; try again in a minute.';

  @override
  String get errorStartRateLimited =>
      'You have reached the limit of 20 analyses a day. Your text is still here; try again later.';

  @override
  String get errorStartGeneric => 'The analysis could not be started. Your text is still here; try again.';

  @override
  String get analysisTitle => 'Analysis';

  @override
  String get sampleNotice => 'Sample analysis with a fictional CV and job posting.';

  @override
  String comparedWith(String resume) {
    return 'Compared with $resume';
  }

  @override
  String get fitStrong => 'Strong fit';

  @override
  String get fitModerate => 'Moderate fit';

  @override
  String get fitWeak => 'Weak fit';

  @override
  String get howScored => 'How is this scored?';

  @override
  String get limitationsTitle => 'What this analysis cannot know';

  @override
  String get statusMatched => 'Matched';

  @override
  String get statusPartial => 'Partial';

  @override
  String get statusMissing => 'Missing';

  @override
  String statusCountMatched(int count) {
    return '$count matched';
  }

  @override
  String statusCountPartial(int count) {
    return '$count partial';
  }

  @override
  String statusCountMissing(int count) {
    return '$count missing';
  }

  @override
  String get importanceMustHave => 'Must-have';

  @override
  String get importanceNiceToHave => 'Nice-to-have';

  @override
  String get requirementsTitle => 'Requirements';

  @override
  String get requirementsEmpty =>
      'No requirements could be extracted from this job posting. Check that the full posting text was provided, then run the analysis again.';

  @override
  String sheetLines(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count lines read from this CV',
      one: '1 line read from this CV',
    );
    return '$_temp0';
  }

  @override
  String get sheetEmpty => 'No evidence statements could be extracted from this CV.';

  @override
  String missingNote(String requirement) {
    return 'Nothing in this CV supports “$requirement”.';
  }

  @override
  String get otherSection => 'Other';

  @override
  String scoreLabel(int score) {
    return 'Score: $score out of 100';
  }

  @override
  String get summaryTitle => 'In short';

  @override
  String requirementCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count requirements',
      one: '1 requirement',
    );
    return '$_temp0';
  }

  @override
  String get breakdownCaption => 'What the score is made of';

  @override
  String get breakdownNote => 'Wide pieces are must-haves; they count twice in the score.';

  @override
  String fixesCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(count, locale: localeName, other: '$count suggestions', one: '1 suggestion');
    return '$_temp0';
  }

  @override
  String get showInCv => 'Show in the CV';

  @override
  String get fixesTitle => 'What to fix';

  @override
  String get fixesEmpty => 'No changes are suggested for this posting.';

  @override
  String get priorityHigh => 'High';

  @override
  String get priorityMedium => 'Medium';

  @override
  String get priorityLow => 'Low';

  @override
  String get targetSkill => 'Skill';

  @override
  String get targetCvSection => 'CV section';

  @override
  String get targetProject => 'Project';

  @override
  String get targetInterviewTopic => 'Interview topic';

  @override
  String get questionsTitle => 'Interview questions';

  @override
  String get questionsIntro => 'Questions an interviewer is likely to ask, based on this posting and the gaps above.';

  @override
  String get questionsGenerate => 'Generate interview questions';

  @override
  String get questionsGenerating => 'Writing questions…';

  @override
  String get questionsError =>
      'The questions could not be generated. The AI service may be busy; try again in a minute.';

  @override
  String get questionsWhy => 'Why this question';

  @override
  String get questionsEmpty => 'No questions were returned for this posting.';

  @override
  String get categoryTechnical => 'Technical';

  @override
  String get categoryBehavioral => 'Behavioral';

  @override
  String get categoryProject => 'Project';

  @override
  String get categoryGap => 'Gap';

  @override
  String get progressPending => 'Queued';

  @override
  String get progressRunning => 'Analyzing';

  @override
  String get progressTitle => 'Comparing your CV with this posting';

  @override
  String get progressBody =>
      'Requirements are extracted from the posting, matched against your CV and checked for evidence. This usually takes a minute or two, longer when the free AI service is busy. The screen updates on its own.';

  @override
  String get failedTitle => 'This analysis could not be completed';

  @override
  String get failedBody =>
      'The AI service did not answer in time or returned an invalid result. Your CV and the posting are saved, so you can run the analysis again.';

  @override
  String get failedRetry => 'Run the analysis again';

  @override
  String get failedNewAnalysis => 'Start a new analysis';

  @override
  String get failedStarting => 'Starting…';

  @override
  String get reasonAiQuotaExhausted =>
      'The free AI quota is used up for now. It renews daily, so try again later; your CV and the posting are saved.';

  @override
  String get reasonNoRequirements =>
      'No requirements could be found in the job posting. Check that the full posting text was pasted, then start a new analysis.';

  @override
  String get reasonNoEvidence =>
      'No usable statements could be read from the CV. Check the CV text, then start a new analysis.';
}
