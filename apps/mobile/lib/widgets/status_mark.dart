// The mark that carries a requirement's state by form, not colour (design system: "Status Mark"): a filled graphite
// disc is matched, a dashed amber ring is partial, a struck red square is missing. Its size carries importance.

import 'dart:ui' show PathMetric;

import 'package:flutter/widgets.dart';

import '../core/api/models.dart';
import '../core/theme/tokens.dart';

class StatusMark extends StatelessWidget {
  const StatusMark({super.key, required this.status, this.importance = Importance.mustHave});

  final MatchStatus status;
  final Importance importance;

  @override
  Widget build(BuildContext context) {
    final size = importance == Importance.mustHave ? 12.0 : 9.0;
    return ExcludeSemantics(
      child: CustomPaint(size: Size.square(size), painter: _MarkPainter(status, Tokens.marker)),
    );
  }
}

/// The struck square alone, leading form errors and failed states so they read without colour.
class StruckMark extends StatelessWidget {
  const StruckMark({super.key, this.size = 10, this.color = Tokens.marker});

  final double size;
  final Color color;

  @override
  Widget build(BuildContext context) => ExcludeSemantics(
    child: CustomPaint(size: Size.square(size), painter: _MarkPainter(MatchStatus.missing, color)),
  );
}

class _MarkPainter extends CustomPainter {
  _MarkPainter(this.status, this.missingColor);

  final MatchStatus status;
  final Color missingColor;

  @override
  void paint(Canvas canvas, Size size) {
    final scale = size.width / 12;
    final center = size.center(Offset.zero);
    switch (status) {
      case MatchStatus.matched:
        canvas.drawCircle(center, size.width / 2, Paint()..color = Tokens.shell);
      case MatchStatus.partial:
        final stroke = 2 * scale;
        final ring = Path()..addOval(Rect.fromCircle(center: center, radius: size.width / 2 - stroke / 2));
        final paint = Paint()
          ..color = Tokens.partial
          ..style = PaintingStyle.stroke
          ..strokeWidth = stroke;
        for (final metric in ring.computeMetrics()) {
          _drawDashed(canvas, metric, paint, dash: 3.1 * scale, gap: 2.15 * scale);
        }
      case MatchStatus.missing:
        final stroke = 1.5 * scale;
        final paint = Paint()
          ..color = missingColor
          ..style = PaintingStyle.stroke
          ..strokeWidth = stroke;
        final frame = (Offset.zero & size).deflate(stroke / 2);
        canvas.drawRRect(RRect.fromRectAndRadius(frame, Radius.circular(scale)), paint);
        canvas.drawLine(frame.bottomLeft, frame.topRight, paint);
    }
  }

  static void _drawDashed(Canvas canvas, PathMetric metric, Paint paint, {required double dash, required double gap}) {
    for (var distance = 0.0; distance < metric.length; distance += dash + gap) {
      canvas.drawPath(metric.extractPath(distance, distance + dash), paint);
    }
  }

  @override
  bool shouldRepaint(_MarkPainter oldDelegate) =>
      oldDelegate.status != status || oldDelegate.missingColor != missingColor;
}
