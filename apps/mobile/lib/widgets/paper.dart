// Cards and the brand band (design system: "Cards On Ground", "Brand Band"): white cards with 14dp corners, a teal
// hairline edge and the one soft shadow sit on the pale teal ground; the deep teal band carries a screen's title and
// runs on behind the top of its first card.

import 'package:flutter/widgets.dart';

import '../core/theme/tokens.dart';

/// Side padding of every screen's content.
const screenPadding = EdgeInsets.symmetric(horizontal: 16);

const cardRadius = BorderRadius.all(Radius.circular(14));

const sheetShadow = [
  BoxShadow(color: Color(0x0F103430), offset: Offset(0, 1), blurRadius: 2),
  BoxShadow(color: Color(0x38103430), offset: Offset(0, 12), blurRadius: 32, spreadRadius: -14),
];

class PaperSheet extends StatelessWidget {
  const PaperSheet({super.key, required this.child, this.padding = const EdgeInsets.all(20)});

  final Widget child;
  final EdgeInsetsGeometry padding;

  @override
  Widget build(BuildContext context) => DecoratedBox(
    decoration: BoxDecoration(
      color: Tokens.paper,
      borderRadius: cardRadius,
      border: Border.all(color: Tokens.rule),
      boxShadow: sheetShadow,
    ),
    child: ClipRRect(
      borderRadius: cardRadius,
      child: Padding(padding: padding, child: child),
    ),
  );
}

/// The brand band: an optional header on deep teal (it continues the app bar), then [child] whose top [overlap]
/// dp sit on the band too, so the first card lifts off the teal like the web's summary card.
class BandOverlap extends StatelessWidget {
  const BandOverlap({super.key, this.header, required this.child, this.overlap = 56});

  final Widget? header;
  final Widget child;
  final double overlap;

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.stretch,
    children: [
      if (header != null)
        ColoredBox(
          color: Tokens.brand,
          child: Padding(padding: const EdgeInsets.fromLTRB(16, 4, 16, 20), child: header),
        ),
      Stack(
        children: [
          Positioned(
            top: 0,
            left: 0,
            right: 0,
            height: overlap,
            child: const ColoredBox(color: Tokens.brand),
          ),
          Padding(
            padding: EdgeInsets.only(top: header == null ? 12 : 0),
            child: child,
          ),
        ],
      ),
    ],
  );
}

/// Keeps content at a phone-like reading width on tablets and in landscape, centred on the ground.
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

/// A 1px hairline between items inside a card.
class Rule extends StatelessWidget {
  const Rule({super.key});

  @override
  Widget build(BuildContext context) => Container(height: 1, color: Tokens.rule);
}
