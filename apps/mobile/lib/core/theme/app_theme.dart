// Material theme built from the design-system tokens: graphite primary, light-table desk, square paper, no green.

import 'package:flutter/material.dart';

import 'tokens.dart';

ThemeData buildAppTheme() {
  const scheme = ColorScheme(
    brightness: Brightness.light,
    primary: Tokens.shell,
    onPrimary: Tokens.shellText,
    secondary: Tokens.edge,
    onSecondary: Tokens.paper,
    error: Tokens.marker,
    onError: Tokens.paper,
    surface: Tokens.paper,
    onSurface: Tokens.ink,
    onSurfaceVariant: Tokens.mute,
    outline: Tokens.mute,
    outlineVariant: Tokens.rule,
  );
  final base = ThemeData(colorScheme: scheme, useMaterial3: true);
  return base.copyWith(
    scaffoldBackgroundColor: Tokens.desk,
    textSelectionTheme: const TextSelectionThemeData(selectionColor: Tokens.markerTint),
    appBarTheme: const AppBarTheme(
      backgroundColor: Tokens.shell,
      foregroundColor: Tokens.shellText,
      elevation: 0,
    ),
    textTheme: base.textTheme.apply(bodyColor: Tokens.ink, displayColor: Tokens.ink),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: Tokens.shell,
        foregroundColor: Tokens.shellText,
        // Design system: gently squared 6px buttons; 48dp keeps Android's touch-target minimum.
        minimumSize: const Size(64, 48),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
      ),
    ),
  );
}
