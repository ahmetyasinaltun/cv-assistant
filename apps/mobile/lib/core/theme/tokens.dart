// Colour tokens of the "editor's contact sheet" design system, copied from the web's globals.css so web and mobile read
// as one product. Change a value there first, then here.

import 'package:flutter/painting.dart';

abstract final class Tokens {
  /// Darkroom Graphite: the top bar, primary buttons, body ink and the filled "matched" disc.
  static const shell = Color(0xFF1C1B19);
  static const shellRaised = Color(0xFF2A2926);
  static const shellText = Color(0xFFF2F1EE);
  static const shellMute = Color(0xFFB4B2AC);

  /// Light-Table Grey: the desk every sheet sits on.
  static const desk = Color(0xFFECECE9);
  static const deskDeep = Color(0xFFE1E0DC);

  /// Print White: the CV sheet and other paper objects.
  static const paper = Color(0xFFFFFFFF);
  static const ink = Color(0xFF1C1B19);
  static const inkSoft = Color(0xFF3D3B37);

  /// Pencil Grey: metadata, hints and the 1px edge of form controls.
  static const mute = Color(0xFF5F5D58);
  static const rule = Color(0xFFD6D5D1);

  /// China-Marker Red: only where the editor acted (circled, missing, high priority, failed, current).
  static const marker = Color(0xFFB73128);
  static const markerTint = Color(0xFFF7DCD8);

  /// Edge-Print Orange: CV line ids and the running label. It names, it never judges.
  static const edge = Color(0xFFA3500F);

  /// Darkroom Amber: the partial state and medium priority.
  static const partial = Color(0xFF8A6405);
}
