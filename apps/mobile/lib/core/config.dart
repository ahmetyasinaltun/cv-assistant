// Build-time configuration: where the shared API lives. Override with --dart-define=API_BASE_URL=...

/// The Android emulator reaches the development machine's localhost at 10.0.2.2.
const apiBaseUrl = String.fromEnvironment(
  'API_BASE_URL',
  defaultValue: 'http://10.0.2.2:8000',
);
