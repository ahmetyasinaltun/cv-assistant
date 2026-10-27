// The editor's grease-pencil loop (design system: signature): a CV line that supports the selected requirement is
// circled in China-Marker Red. Corner radii, bowed edges and tilt come from a seed, so a loop is the same on every
// frame and every visit. Matched loops close by crossing their own start; partial loops stay open and dashed.
// The loop draws on in 260ms on the strong ease-out; with reduced motion it simply appears.

import 'dart:math' as math;
import 'dart:ui' show PathMetric;

import 'package:flutter/widgets.dart';

import '../core/theme/tokens.dart';

const _drawOnDuration = Duration(milliseconds: 260);
const _strongEaseOut = Cubic(0.23, 1, 0.32, 1);
const _handDash = [11.0, 6.0, 7.0, 5.0, 13.0, 6.0, 9.0, 5.0, 6.0, 6.0];

/// Room the loop takes around the text; the line reserves it so the loop never touches its neighbours.
const loopMargin = EdgeInsets.symmetric(horizontal: 10, vertical: 7);

class CircledLine extends StatefulWidget {
  const CircledLine({super.key, required this.seed, required this.open, required this.child});

  /// Stable per requirement and line, e.g. "r4-e2".
  final String seed;

  /// True for a partial match: the loop stays open and dashed.
  final bool open;
  final Widget child;

  @override
  State<CircledLine> createState() => _CircledLineState();
}

class _CircledLineState extends State<CircledLine> with SingleTickerProviderStateMixin {
  late final AnimationController _controller = AnimationController(vsync: this, duration: _drawOnDuration);
  bool _started = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_started) return;
    _started = true;
    if (MediaQuery.disableAnimationsOf(context)) {
      _controller.value = 1;
    } else {
      _controller.forward();
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => AnimatedBuilder(
    animation: _controller,
    child: widget.child,
    builder: (context, child) => CustomPaint(
      foregroundPainter: LoopPainter(
        seed: widget.seed,
        open: widget.open,
        progress: _strongEaseOut.transform(_controller.value),
      ),
      child: child,
    ),
  );
}

class LoopPainter extends CustomPainter {
  LoopPainter({required this.seed, required this.open, required this.progress});

  final String seed;
  final bool open;

  /// 0 = nothing drawn, 1 = the whole loop.
  final double progress;

  @override
  void paint(Canvas canvas, Size size) {
    if (progress <= 0) return;
    final random = math.Random(_stableHash(seed));
    final path = _loopPath(loopMargin.inflateRect(Offset.zero & size), random);
    final ink = Paint()
      ..color = Tokens.marker
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2.4
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round;
    for (final metric in path.computeMetrics()) {
      final visible = metric.length * progress;
      if (open) {
        _drawDashed(canvas, metric, visible, ink);
      } else {
        canvas.drawPath(metric.extractPath(0, visible), ink);
        // A thinner second pass along the top arc, like pencil pressure easing off.
        final pressure = Paint()
          ..color = Tokens.marker.withValues(alpha: 0.6)
          ..style = PaintingStyle.stroke
          ..strokeWidth = 1.1
          ..strokeCap = StrokeCap.round;
        final topArc = math.min(visible, metric.length * 0.28);
        canvas.drawPath(metric.extractPath(0, topArc).shift(const Offset(0.6, -1.4)), pressure);
      }
    }
  }

  Path _loopPath(Rect box, math.Random random) {
    double jitter(double amount) => (random.nextDouble() * 2 - 1) * amount;
    final maxRadius = math.min(box.height / 2, 20.0);
    double radius() => maxRadius * (0.6 + random.nextDouble() * 0.4);
    final topLeft = radius(), topRight = radius(), bottomRight = radius(), bottomLeft = radius();
    final top = box.top, bottom = box.bottom, left = box.left, right = box.right;
    final middle = box.center.dx;
    final start = Offset(left + topLeft + 4 + jitter(3), top + 2 + jitter(1));

    final path = Path()..moveTo(start.dx, start.dy);
    // Long edges bow slightly, the way a hand pulls a marker.
    path.quadraticBezierTo(middle, top - 1 + jitter(3), right - topRight, top + jitter(1.5));
    path.quadraticBezierTo(right, top, right + jitter(1), top + topRight);
    path.quadraticBezierTo(right + 1.5 + jitter(1.5), box.center.dy, right, bottom - bottomRight);
    path.quadraticBezierTo(right, bottom, right - bottomRight, bottom + jitter(1));
    path.quadraticBezierTo(middle, bottom + 1 + jitter(3), left + bottomLeft, bottom + jitter(1));
    path.quadraticBezierTo(left, bottom, left + jitter(1), bottom - bottomLeft);
    if (open) {
      // Partial: the loop stops short of the top-left corner and never closes.
      path.quadraticBezierTo(left - 1, box.center.dy, left + jitter(1), top + topLeft + 6);
    } else {
      path.quadraticBezierTo(left - 1.5 + jitter(1), box.center.dy, left, top + topLeft);
      path.quadraticBezierTo(left, top, left + topLeft, top + jitter(1));
      // Overshoot past the start and cross it, as a quick closing stroke does.
      path.quadraticBezierTo(start.dx + 8, start.dy - 3, start.dx + 18 + jitter(4), start.dy - 4 + jitter(1));
    }
    final tilt = jitter(0.8) * math.pi / 180;
    final center = box.center;
    final rotation = Matrix4.identity()
      ..translateByDouble(center.dx, center.dy, 0, 1)
      ..rotateZ(tilt)
      ..translateByDouble(-center.dx, -center.dy, 0, 1);
    return path.transform(rotation.storage);
  }

  static void _drawDashed(Canvas canvas, PathMetric metric, double visible, Paint paint) {
    var distance = 0.0;
    var index = 0;
    while (distance < visible) {
      final dash = _handDash[index % _handDash.length];
      final gap = _handDash[(index + 1) % _handDash.length];
      canvas.drawPath(metric.extractPath(distance, math.min(distance + dash, visible)), paint);
      distance += dash + gap;
      index += 2;
    }
  }

  /// FNV-1a over the seed's characters: the same seed gives the same loop on every run and device.
  static int _stableHash(String value) {
    var hash = 0x811c9dc5;
    for (final unit in value.codeUnits) {
      hash = ((hash ^ unit) * 0x01000193) & 0xffffffff;
    }
    return hash;
  }

  @override
  bool shouldRepaint(LoopPainter oldDelegate) =>
      oldDelegate.progress != progress || oldDelegate.seed != seed || oldDelegate.open != open;
}
