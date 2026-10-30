// Type roles of the design system set in Archivo: bold headings, roomy reading text and tabular figures for numbers.
// Sizes are logical pixels that follow the system font scale.

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

  /// The job title on the brand band.
  static final headline = _archivo(28, 700, height: 1.12, tracking: -0.025, color: Tokens.onBrand);
  static final titleSection = _archivo(22, 700, height: 1.25, tracking: -0.015);
  static final title = _archivo(20, 700, height: 1.25, tracking: -0.015);
  static final titleCard = _archivo(17, 600, height: 1.4, tracking: -0.005);
  static final body = _archivo(16, 400, height: 1.55);
  static final bodySheet = _archivo(15.5, 400, height: 1.55);
  static final bodySmall = _archivo(15, 400, color: Tokens.inkSoft);
  static final question = _archivo(16.5, 500);
  static final fieldLabel = _archivo(15, 600);
  static final button = _archivo(15, 600);
  static final meta = _archivo(14, 400, color: Tokens.mute);

  /// Group heads inside a card (must-have, nice-to-have, CV sections), in sentence case.
  static final groupHead = _archivo(14, 600, color: Tokens.inkSoft);

  /// Status, priority and category chips.
  static final chip = _archivo(12.5, 600, height: 1.5);

  /// The score on the summary card and in list rows; always Working Teal.
  static final score = _archivo(52, 700, height: 0.95, tracking: -0.03, color: Tokens.accent, tabular: true);
  static final scoreSmall = _archivo(16, 700, height: 1.2, color: Tokens.accent, tabular: true);

  /// The EN / TR options, the one place the condensed width survives.
  static final localeCode = _archivo(12.5, 600, tracking: 0.06, width: 85);
  static final barProduct = _archivo(17, 700, tracking: -0.01, color: Tokens.onBrand);
}
