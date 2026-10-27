// A print on the desk: square-cornered white paper with the one Sheet shadow (design system, The One Print Rule).
// Only paper objects lift; nothing else in the app gets a shadow.

import 'package:flutter/widgets.dart';

import '../core/theme/tokens.dart';

/// Side padding of every screen's content.
const screenPadding = EdgeInsets.symmetric(horizontal: 16);

const sheetShadow = [
  BoxShadow(color: Color(0x141C1B19), offset: Offset(0, 1), blurRadius: 2),
  BoxShadow(color: Color(0x241C1B19), offset: Offset(0, 12), blurRadius: 32, spreadRadius: -8),
];

class PaperSheet extends StatelessWidget {
  const PaperSheet({super.key, required this.child, this.padding = const EdgeInsets.all(20)});

  final Widget child;
  final EdgeInsetsGeometry padding;

  @override
  Widget build(BuildContext context) => DecoratedBox(
    decoration: const BoxDecoration(color: Tokens.paper, boxShadow: sheetShadow),
    child: Padding(padding: padding, child: child),
  );
}

/// Keeps content at a phone-like reading width on tablets and in landscape, centred on the desk.
class ReadableWidth extends StatelessWidget {
  const ReadableWidth({super.key, required this.child});

  static const maxWidth = 720.0;
  final Widget child;

  @override
  Widget build(BuildContext context) => Center(
    child: ConstrainedBox(
      constraints: const BoxConstraints(maxWidth: maxWidth),
      child: child,
    ),
  );
}

/// A 1px hairline between items, or a 2px graphite rule where the content changes kind.
class Rule extends StatelessWidget {
  const Rule({super.key, this.strong = false});

  final bool strong;

  @override
  Widget build(BuildContext context) => Container(height: strong ? 2 : 1, color: strong ? Tokens.shell : Tokens.rule);
}
