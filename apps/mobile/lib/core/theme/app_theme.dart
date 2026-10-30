// Material 3 theme built from the design-system tokens: a deep teal app bar that continues into the brand band, white
// cards on a pale teal ground, teal actions, rounded 10dp controls, Archivo for every role and predictive Back.

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'app_text.dart';
import 'tokens.dart';

const controlRadius = BorderRadius.all(Radius.circular(10));

ThemeData buildAppTheme() {
  const scheme = ColorScheme(
    brightness: Brightness.light,
    primary: Tokens.accent,
    onPrimary: Tokens.paper,
    secondary: Tokens.accentHover,
    onSecondary: Tokens.paper,
    error: Tokens.marker,
    onError: Tokens.paper,
    surface: Tokens.paper,
    onSurface: Tokens.ink,
    onSurfaceVariant: Tokens.mute,
    surfaceContainerLowest: Tokens.paper,
    surfaceContainerLow: Tokens.paper,
    surfaceContainer: Tokens.desk,
    surfaceContainerHigh: Tokens.deskDeep,
    outline: Tokens.fieldEdge,
    outlineVariant: Tokens.rule,
    inverseSurface: Tokens.ink,
    onInverseSurface: Tokens.paper,
  );
  OutlineInputBorder edge(Color color, [double width = 1]) => OutlineInputBorder(
    borderRadius: controlRadius,
    borderSide: BorderSide(color: color, width: width),
  );

  return ThemeData(
    colorScheme: scheme,
    useMaterial3: true,
    fontFamily: 'Archivo',
    scaffoldBackgroundColor: Tokens.desk,
    splashFactory: InkRipple.splashFactory,
    textTheme: TextTheme(
      headlineSmall: AppText.headline,
      titleLarge: AppText.titleSection,
      titleMedium: AppText.title,
      bodyLarge: AppText.body,
      bodyMedium: AppText.bodySmall.copyWith(color: Tokens.ink),
      bodySmall: AppText.meta,
      labelLarge: AppText.button,
      labelMedium: AppText.fieldLabel,
      labelSmall: AppText.chip,
    ),
    textSelectionTheme: const TextSelectionThemeData(
      cursorColor: Tokens.accent,
      selectionColor: Tokens.accentTint,
      selectionHandleColor: Tokens.accent,
    ),
    appBarTheme: AppBarTheme(
      backgroundColor: Tokens.brand,
      foregroundColor: Tokens.onBrand,
      elevation: 0,
      scrolledUnderElevation: 0,
      titleTextStyle: AppText.barProduct,
      // Light status-bar icons on the deep teal.
      systemOverlayStyle: SystemUiOverlayStyle.light.copyWith(statusBarColor: Tokens.brand),
    ),
    dividerTheme: const DividerThemeData(color: Tokens.rule, thickness: 1, space: 1),
    progressIndicatorTheme: const ProgressIndicatorThemeData(
      color: Tokens.accent,
      linearTrackColor: Tokens.deskDeep,
      circularTrackColor: Tokens.deskDeep,
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: Tokens.accent,
        foregroundColor: Tokens.paper,
        disabledBackgroundColor: Tokens.accent.withValues(alpha: 0.6),
        disabledForegroundColor: Tokens.paper,
        textStyle: AppText.button,
        // 48dp keeps Android's touch-target minimum (44px on the web).
        minimumSize: const Size(64, 48),
        padding: const EdgeInsets.symmetric(horizontal: 18),
        shape: const RoundedRectangleBorder(borderRadius: controlRadius),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: Tokens.onBrand,
        side: BorderSide(color: Tokens.onBrand.withValues(alpha: 0.45)),
        textStyle: AppText.button,
        minimumSize: const Size(64, 48),
        padding: const EdgeInsets.symmetric(horizontal: 18),
        shape: const RoundedRectangleBorder(borderRadius: controlRadius),
      ),
    ),
    textButtonTheme: TextButtonThemeData(
      style: TextButton.styleFrom(
        foregroundColor: Tokens.accentHover,
        textStyle: AppText.meta.copyWith(fontWeight: FontWeight.w500, decoration: TextDecoration.underline),
        minimumSize: const Size(48, 48),
        padding: const EdgeInsets.symmetric(horizontal: 8),
        shape: const RoundedRectangleBorder(borderRadius: BorderRadius.all(Radius.circular(6))),
      ),
    ),
    floatingActionButtonTheme: FloatingActionButtonThemeData(
      backgroundColor: Tokens.accent,
      foregroundColor: Tokens.paper,
      extendedTextStyle: AppText.button,
      elevation: 3,
      highlightElevation: 5,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.all(Radius.circular(16))),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: Tokens.paper,
      isDense: false,
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
      hintStyle: AppText.body.copyWith(color: Tokens.mute),
      border: edge(Tokens.fieldEdge),
      enabledBorder: edge(Tokens.fieldEdge),
      focusedBorder: edge(Tokens.accent, 2),
      errorBorder: edge(Tokens.marker),
      focusedErrorBorder: edge(Tokens.marker, 2),
      // Field errors are drawn by FieldError (missing icon + sentence), so the built-in error line stays empty.
      errorStyle: const TextStyle(height: 0, fontSize: 0),
    ),
    bottomSheetTheme: const BottomSheetThemeData(
      backgroundColor: Tokens.paper,
      surfaceTintColor: Colors.transparent,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      showDragHandle: true,
      dragHandleColor: Tokens.rule,
    ),
    snackBarTheme: SnackBarThemeData(
      backgroundColor: Tokens.ink,
      contentTextStyle: AppText.bodySmall.copyWith(color: Tokens.paper),
      behavior: SnackBarBehavior.floating,
      shape: const RoundedRectangleBorder(borderRadius: controlRadius),
    ),
    popupMenuTheme: PopupMenuThemeData(
      color: Tokens.paper,
      surfaceTintColor: Colors.transparent,
      textStyle: AppText.bodySmall.copyWith(color: Tokens.ink),
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.all(Radius.circular(12))),
    ),
    radioTheme: const RadioThemeData(fillColor: WidgetStatePropertyAll(Tokens.accent)),
    pageTransitionsTheme: const PageTransitionsTheme(
      builders: {TargetPlatform.android: PredictiveBackPageTransitionsBuilder()},
    ),
  );
}
