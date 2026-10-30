// A requirement's match status as an icon whose form carries the state (design system: "Status Mark"): a green disc with
// a check is matched, a white disc with an amber ring and a filled left half is partial, a red disc with a cross is
// missing. The chip names the state in words. Colour only reinforces the form, so both read in greyscale.

import 'package:flutter/widgets.dart';

import '../core/api/models.dart';
import '../core/theme/app_text.dart';
import '../core/theme/tokens.dart';

class StatusMark extends StatelessWidget {
  const StatusMark({super.key, required this.status, this.size = 18});

  final MatchStatus status;
  final double size;

  @override
  Widget build(BuildContext context) => ExcludeSemantics(
    child: CustomPaint(size: Size.square(size), painter: _MarkPainter(status)),
  );
}

class _MarkPainter extends CustomPainter {
  _MarkPainter(this.status);

  final MatchStatus status;

  @override
  void paint(Canvas canvas, Size size) {
    // Drawn on the web's 18-unit grid, scaled to the requested size.
    final unit = size.width / 18;
    final center = size.center(Offset.zero);
    Paint stroke(Color color, double width) => Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = width * unit
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round;
    switch (status) {
      case MatchStatus.matched:
        canvas.drawCircle(center, 9 * unit, Paint()..color = Tokens.okMark);
        final check = Path()
          ..moveTo(5.2 * unit, 9.3 * unit)
          ..lineTo(7.7 * unit, 11.7 * unit)
          ..lineTo(12.9 * unit, 6.4 * unit);
        canvas.drawPath(check, stroke(Tokens.paper, 1.9));
      case MatchStatus.partial:
        canvas.drawCircle(center, 8 * unit, Paint()..color = Tokens.paper);
        canvas.drawCircle(center, 8 * unit, stroke(Tokens.partialMark, 2));
        final half = Path()
          ..moveTo(9 * unit, 3.2 * unit)
          ..arcToPoint(Offset(9 * unit, 14.8 * unit), radius: Radius.circular(5.8 * unit), clockwise: false)
          ..close();
        canvas.drawPath(half, Paint()..color = Tokens.partialMark);
      case MatchStatus.missing:
        canvas.drawCircle(center, 9 * unit, Paint()..color = Tokens.markerMark);
        final cross = stroke(Tokens.paper, 1.9);
        canvas.drawLine(Offset(6.2 * unit, 6.2 * unit), Offset(11.8 * unit, 11.8 * unit), cross);
        canvas.drawLine(Offset(11.8 * unit, 6.2 * unit), Offset(6.2 * unit, 11.8 * unit), cross);
    }
  }

  @override
  bool shouldRepaint(_MarkPainter oldDelegate) => oldDelegate.status != status;
}

/// The status named in a tinted chip: green, amber or red tint with its darker text tone.
class StatusChip extends StatelessWidget {
  const StatusChip({super.key, required this.status, required this.label});

  final MatchStatus status;
  final String label;

  @override
  Widget build(BuildContext context) {
    final (background, foreground) = switch (status) {
      MatchStatus.matched => (Tokens.okTint, Tokens.ok),
      MatchStatus.partial => (Tokens.partialTint, Tokens.partial),
      MatchStatus.missing => (Tokens.markerTint, Tokens.marker),
    };
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(color: background, borderRadius: const BorderRadius.all(Radius.circular(6))),
      child: Text(label, style: AppText.chip.copyWith(color: foreground)),
    );
  }
}
