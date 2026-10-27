// The languages the product works in, shared with the web client and the API ("en", "tr").

const supportedLanguages = ['en', 'tr'];
const defaultLanguage = 'en';

/// A supported language code for [code] (e.g. the device language "tr"), or English.
String supportedLanguageOr(String? code) =>
    supportedLanguages.contains(code) ? code! : defaultLanguage;
