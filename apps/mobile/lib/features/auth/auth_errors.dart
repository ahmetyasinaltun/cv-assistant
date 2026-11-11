// Maps API failures during sign-in and registration to the problem the auth form shows (twin of auth-errors.ts).

import '../../core/api/api_client.dart';

enum AuthProblem {
  invalidCredentials,
  emailTaken,
  passwordTooLong,
  tooManyAttempts,
  tooManyAccounts,
  invalidInput,
  unavailable,
  generic,
}

AuthProblem authProblemFor(ApiException error, {bool register = false}) {
  if (error.code == 'invalid_credentials') return AuthProblem.invalidCredentials;
  if (error.code == 'email_taken') return AuthProblem.emailTaken;
  if (error.code == 'password_too_long') return AuthProblem.passwordTooLong;
  // Sign-in is limited per email (wrong passwords), registration per network (accounts a day).
  if (error.code == 'rate_limited') return register ? AuthProblem.tooManyAccounts : AuthProblem.tooManyAttempts;
  if (error.statusCode == 422) return AuthProblem.invalidInput;
  if (error.isNetworkError || error.statusCode >= 500) return AuthProblem.unavailable;
  return AuthProblem.generic;
}

/// A deliberately loose check: it only catches typos before a round trip; the API validates for real.
bool looksLikeEmail(String value) => RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$').hasMatch(value.trim());

enum VerifyProblem {
  codeFormat,
  codeInvalid,
  codeExpired,
  tooManyAttempts,
  tooSoon,
  emailUnavailable,
  unavailable,
  generic,
}

VerifyProblem verifyProblemFor(ApiException error) {
  if (error.code == 'code_invalid') return VerifyProblem.codeInvalid;
  if (error.code == 'code_expired') return VerifyProblem.codeExpired;
  if (error.code == 'too_many_attempts') return VerifyProblem.tooManyAttempts;
  if (error.code == 'email_unavailable') return VerifyProblem.emailUnavailable;
  if (error.statusCode == 429) return VerifyProblem.tooSoon;
  if (error.statusCode == 422) return VerifyProblem.codeFormat;
  if (error.isNetworkError || error.statusCode >= 500) return VerifyProblem.unavailable;
  return VerifyProblem.generic;
}

/// Digits only, whatever the email app copied around them ("123 456", "Code: 123456").
String normalizeCode(String value) => value.replaceAll(RegExp(r'\D'), '');

bool isCompleteCode(String value) => RegExp(r'^\d{6}$').hasMatch(value);
