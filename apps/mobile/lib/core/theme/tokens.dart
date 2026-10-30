// Colour tokens of the teal design system, copied from the web's globals.css so web and mobile read
// as one product. Change a value there first, then here.

import 'package:flutter/painting.dart';

abstract final class Tokens {
  /// Deep teal: the app bar, the brand band at the top of a screen and the app icon.
  static const brand = Color(0xFF0C4A46);
  static const onBrand = Color(0xFFFFFFFF);

  /// Secondary text on the brand band.
  static const onBrandSoft = Color(0xFFB5DBD4);

  /// Working teal: primary actions, links, the score, the current place and focus.
  static const accent = Color(0xFF0F766D);
  static const accentHover = Color(0xFF0B5E57);

  /// Teal wash: selected rows, the medium-priority chip and the sample notice.
  static const accentTint = Color(0xFFE0F2EF);

  /// Pale teal ground every card sits on, and its pressed shade.
  static const desk = Color(0xFFEDF4F2);
  static const deskDeep = Color(0xFFE1EBE8);

  static const paper = Color(0xFFFFFFFF);
  static const ink = Color(0xFF102321);
  static const inkSoft = Color(0xFF384D49);

  /// Teal grey: counts, captions, dates and placeholders.
  static const mute = Color(0xFF586C68);

  /// Teal hairline: the 1px edge of every card and the dividers inside cards.
  static const rule = Color(0xFFD6E4E0);

  /// The 1px edge of form controls: 3.3:1 on white, above the 3:1 a control boundary needs.
  static const fieldEdge = Color(0xFF7F938E);

  /// Status triplets (text tone, tint, mark). The icon's form carries the state; colour reinforces it.
  static const ok = Color(0xFF13733A);
  static const okTint = Color(0xFFE2F3E7);
  static const okMark = Color(0xFF1E9A4B);
  static const partial = Color(0xFF925400);
  static const partialTint = Color(0xFFFCEFD4);
  static const partialMark = Color(0xFFD08A0B);

  /// Red: missing requirements and errors only.
  static const marker = Color(0xFFB42318);
  static const markerTint = Color(0xFFFDE6E3);
  static const markerMark = Color(0xFFD92D20);
  static const markerHover = Color(0xFF8F1C13);
}
