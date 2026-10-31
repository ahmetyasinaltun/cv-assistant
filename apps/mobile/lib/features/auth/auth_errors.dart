// Maps API failures during sign-in and registration to the problem the auth form shows (twin of auth-errors.ts).

import '../../core/api/api_client.dart';

enum AuthProblem { invalidCredentials, emailTaken, passwordTooLong, invalidInput, unavailable, generic }

AuthProblem authProblemFor(ApiException error) {
  if (error.code == 'invalid_credentials') return AuthProblem.invalidCredentials;
  if (error.code == 'email_taken') return AuthProblem.emailTaken;
  if (error.code == 'password_too_long') return AuthProblem.passwordTooLong;
  if (error.statusCode == 422) return AuthProblem.invalidInput;
  if (error.isNetworkError || error.statusCode >= 500) return AuthProblem.unavailable;
  return AuthProblem.generic;
}

/// A deliberately loose check: it only catches typos before a round trip; the API validates for real.
bool looksLikeEmail(String value) => RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$').hasMatch(value.trim());
