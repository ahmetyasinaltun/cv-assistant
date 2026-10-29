// Type roles of the design system set in Archivo. Words use the normal width; ids, counts and scores use the condensed
// width with tabular figures (The Two Widths Rule). Sizes are logical pixels that follow the system font scale.

import 'package:flutter/painting.dart';

import 'tokens.dart';

abstract final class AppText {
  static TextStyle _archivo(
    double size,
    int weight, {
    double height = 1.5,
    double tracking = 0,
    double width = 100,
    Color color = Tokens.ink,
    bool tabular = false,
  }) => TextStyle(
    fontFamily: 'Archivo',
    fontSize: size,
    height: height,
    // The design system gives tracking in em; Flutter wants logical pixels.
    letterSpacing: tracking * size,
    color: color,
    fontWeight: FontWeight.values[weight ~/ 100 - 1],
    fontVariations: [FontVariation.weight(weight.toDouble()), FontVariation.width(width)],
    fontFeatures: tabular ? const [FontFeature.tabularFigures()] : null,
  );

  static final headline = _archivo(26, 600, height: 1.15, tracking: -0.025);
  static final titleSection = _archivo(22, 600, height: 1.25, tracking: -0.02);
  static final title = _archivo(20, 600, height: 1.25, tracking: -0.01);
  static final titleFit = _archivo(19, 600, height: 1.25, tracking: -0.01);
  static final body = _archivo(15, 400, height: 1.55);
  static final bodySheet = _archivo(15, 400, height: 1.6);
  static final bodySmall = _archivo(14, 400, color: Tokens.inkSoft);
  static final question = _archivo(16, 500);
  static final fieldLabel = _archivo(14, 500);
  static final button = _archivo(14, 500);
  static final meta = _archivo(13, 400, color: Tokens.mute);

  /// Uppercase column heads; pass text through [upperFor] so Turkish i becomes İ.
  static final label = _archivo(12, 600, tracking: 0.06, width: 85, color: Tokens.mute);
  static final priorityTag = _archivo(11, 600, tracking: 0.06, width: 85, height: 1.2);

  /// Counts and the character count: condensed, tabular, Edge-Print Orange by default.
  static final edgeNumber = _archivo(12, 600, tracking: 0.02, width: 72, color: Tokens.edge, tabular: true);
  static final score = _archivo(22, 600, height: 1.1, tracking: 0.02, width: 72, tabular: true);
  static final barProduct = _archivo(15, 600, tracking: -0.01, width: 92, color: Tokens.shellText);
}

/// Locale-aware uppercase for interface labels. Dart's toUpperCase maps "i" to "I", which is wrong in
/// Turkish ("tercih" must become "TERCİH"); AI-written text is never passed here.
String upperFor(String languageCode, String text) {
  if (languageCode != 'tr') return text.toUpperCase();
  return text.replaceAll('i', 'İ').replaceAll('ı', 'I').toUpperCase();
}
