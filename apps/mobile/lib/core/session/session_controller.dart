// Holds who is signed in and which language the app shows, and applies the language rule shared with the
// web client: the account remembers the last language the user chose, and signing in restores it.

import 'package:flutter/foundation.dart';

import '../api/api_client.dart';
import '../api/career_api.dart';
import '../api/models.dart';
import 'languages.dart';
import 'token_store.dart';

enum SessionStatus {
  /// The stored token has not been checked with the API yet (start-up, or the server was unreachable).
  unknown,
  signedOut,
  signedIn,
}

class SessionController extends ChangeNotifier {
  SessionController({required this._api, required this._tokens, required String deviceLanguage})
    : _language = supportedLanguageOr(deviceLanguage);

  final CareerApi _api;
  final TokenStore _tokens;

  SessionStatus _status = SessionStatus.unknown;
  User? _user;
  String _language;
  bool _sessionExpired = false;

  SessionStatus get status => _status;
  User? get user => _user;

  /// True when the API rejected the token mid-session, until the user signs in again.
  bool get sessionExpired => _sessionExpired;

  /// Language of the interface and of new analyses.
  String get language => _language;

  /// Checks a stored token with the API before the user counts as signed in. A network failure is
  /// rethrown and the token kept, so the app can offer a retry instead of signing the user out.
  Future<void> restore() async {
    final token = await _tokens.read();
    if (token == null) return _becomeSignedOut();
    _api.token = token;
    try {
      _becomeSignedIn(await _api.me());
    } on ApiException catch (error) {
      if (!error.isUnauthorized) rethrow;
      await _forgetToken();
      _becomeSignedOut();
    }
  }

  Future<void> signIn(String email, String password) async {
    final session = await _api.login(email, password);
    await _keepToken(session.accessToken);
    _becomeSignedIn(session.user);
  }

  /// The account starts in the language the app is showing.
  Future<void> register(String fullName, String email, String password) async {
    final session = await _api.register(
      fullName: fullName,
      email: email,
      password: password,
      preferredLanguage: _language,
    );
    await _keepToken(session.accessToken);
    _becomeSignedIn(session.user);
  }

  /// Confirms the emailed code; the app's gate then opens the analyses list.
  Future<void> confirmEmail(String code) async {
    _user = await _api.confirmEmail(code);
    notifyListeners();
  }

  Future<void> sendVerificationCode() => _api.sendVerificationCode();

  Future<void> signOut() async {
    await _forgetToken();
    _becomeSignedOut();
  }

  /// Called when any API call answers 401: the stored token no longer works, so the user signs in again.
  Future<void> expire() async {
    if (_status != SessionStatus.signedIn) return;
    _sessionExpired = true;
    await signOut();
  }

  /// Switches the app language at once; a signed-in user's choice is also saved on the account.
  /// An expired session signs the user out; other save failures are rethrown for the screen to report.
  Future<void> changeLanguage(String code) async {
    if (!supportedLanguages.contains(code) || code == _language) return;
    _language = code;
    notifyListeners();
    if (_status != SessionStatus.signedIn) return;
    try {
      _user = await _api.updatePreferredLanguage(code);
    } on ApiException catch (error) {
      if (!error.isUnauthorized) rethrow;
      await expire();
    }
  }

  Future<void> _keepToken(String token) async {
    await _tokens.write(token);
    _api.token = token;
  }

  Future<void> _forgetToken() async {
    await _tokens.clear();
    _api.token = null;
  }

  void _becomeSignedIn(User user) {
    _user = user;
    _status = SessionStatus.signedIn;
    _sessionExpired = false;
    _language = supportedLanguageOr(user.preferredLanguage);
    notifyListeners();
  }

  void _becomeSignedOut() {
    _user = null;
    _status = SessionStatus.signedOut;
    notifyListeners();
  }
}
