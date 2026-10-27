// Material 3 theme built from the design-system tokens: graphite primary, light-table desk, square paper, the printed
// form box for fields, Archivo for every role, and Android's predictive Back transition. No green anywhere.

import 'package:flutter/material.dart';

import 'app_text.dart';
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
    surfaceContainerLowest: Tokens.paper,
    surfaceContainerLow: Tokens.paper,
    surfaceContainer: Tokens.desk,
    surfaceContainerHigh: Tokens.deskDeep,
    outline: Tokens.mute,
    outlineVariant: Tokens.rule,
    inverseSurface: Tokens.shell,
    onInverseSurface: Tokens.shellText,
  );
  const squareFormBox = BorderRadius.all(Radius.circular(6));
  OutlineInputBorder edge(Color color, [double width = 1]) => OutlineInputBorder(
    borderRadius: squareFormBox,
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
      labelSmall: AppText.label,
    ),
    textSelectionTheme: const TextSelectionThemeData(
      cursorColor: Tokens.ink,
      selectionColor: Tokens.markerTint,
      selectionHandleColor: Tokens.ink,
    ),
    appBarTheme: AppBarTheme(
      backgroundColor: Tokens.shell,
      foregroundColor: Tokens.shellText,
      elevation: 0,
      scrolledUnderElevation: 0,
      titleTextStyle: AppText.barProduct.copyWith(fontSize: 17),
    ),
    dividerTheme: const DividerThemeData(color: Tokens.rule, thickness: 1, space: 1),
    progressIndicatorTheme: const ProgressIndicatorThemeData(
      color: Tokens.marker,
      linearTrackColor: Tokens.deskDeep,
      circularTrackColor: Tokens.deskDeep,
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: Tokens.shell,
        foregroundColor: Tokens.shellText,
        disabledBackgroundColor: Tokens.shell.withValues(alpha: 0.6),
        disabledForegroundColor: Tokens.shellText,
        textStyle: AppText.button,
        // Design system: gently squared 6px; 48dp keeps Android's touch-target minimum.
        minimumSize: const Size(64, 48),
        padding: const EdgeInsets.symmetric(horizontal: 16),
        shape: RoundedRectangleBorder(borderRadius: squareFormBox),
      ),
    ),
    textButtonTheme: TextButtonThemeData(
      style: TextButton.styleFrom(
        foregroundColor: Tokens.inkSoft,
        textStyle: AppText.meta.copyWith(decoration: TextDecoration.underline),
        minimumSize: const Size(48, 48),
        padding: const EdgeInsets.symmetric(horizontal: 8),
        shape: const RoundedRectangleBorder(borderRadius: BorderRadius.all(Radius.circular(3))),
      ),
    ),
    floatingActionButtonTheme: FloatingActionButtonThemeData(
      backgroundColor: Tokens.shell,
      foregroundColor: Tokens.shellText,
      extendedTextStyle: AppText.button,
      elevation: 2,
      highlightElevation: 4,
      shape: RoundedRectangleBorder(borderRadius: squareFormBox),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: Tokens.paper,
      isDense: false,
      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
      hintStyle: AppText.body.copyWith(color: Tokens.mute),
      border: edge(Tokens.mute),
      enabledBorder: edge(Tokens.mute),
      focusedBorder: edge(Tokens.ink, 2),
      errorBorder: edge(Tokens.marker),
      focusedErrorBorder: edge(Tokens.marker, 2),
      // Field errors are drawn by FieldError (struck mark + sentence), so the built-in error line stays empty.
      errorStyle: const TextStyle(height: 0, fontSize: 0),
    ),
    bottomSheetTheme: const BottomSheetThemeData(
      backgroundColor: Tokens.paper,
      surfaceTintColor: Colors.transparent,
      // A print sliding up from the desk: square corners like every paper sheet.
      shape: RoundedRectangleBorder(),
      showDragHandle: true,
      dragHandleColor: Tokens.rule,
    ),
    snackBarTheme: SnackBarThemeData(
      backgroundColor: Tokens.shell,
      contentTextStyle: AppText.bodySmall.copyWith(color: Tokens.shellText),
      behavior: SnackBarBehavior.floating,
      shape: RoundedRectangleBorder(borderRadius: squareFormBox),
    ),
    popupMenuTheme: PopupMenuThemeData(
      color: Tokens.paper,
      surfaceTintColor: Colors.transparent,
      textStyle: AppText.bodySmall.copyWith(color: Tokens.ink),
      shape: RoundedRectangleBorder(borderRadius: squareFormBox),
    ),
    radioTheme: const RadioThemeData(fillColor: WidgetStatePropertyAll(Tokens.ink)),
    pageTransitionsTheme: const PageTransitionsTheme(
      builders: {TargetPlatform.android: PredictiveBackPageTransitionsBuilder()},
    ),
  );
}
