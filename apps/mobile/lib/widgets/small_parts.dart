// Small shared pieces: the priority tag, the label-caps head, and the indeterminate progress sweep.

import 'package:flutter/material.dart';

import '../core/api/models.dart';
import '../core/theme/app_text.dart';
import '../core/theme/tokens.dart';

/// Red for high, amber for medium, Pencil Grey for low: a border in the current colour, no fill.
class PriorityTag extends StatelessWidget {
  const PriorityTag({super.key, required this.priority, required this.label});

  final Priority priority;
  final String label;

  @override
  Widget build(BuildContext context) {
    final color = switch (priority) {
      Priority.high => Tokens.marker,
      Priority.medium => Tokens.partial,
      Priority.low => Tokens.mute,
    };
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
      decoration: BoxDecoration(
        border: Border.all(color: color),
        borderRadius: const BorderRadius.all(Radius.circular(3)),
      ),
      child: Text(
        upperFor(Localizations.localeOf(context).languageCode, label),
        style: AppText.priorityTag.copyWith(color: color),
      ),
    );
  }
}

/// An uppercase column head set in the interface language (The Locale-Owned Caps Rule).
class LabelCaps extends StatelessWidget {
  const LabelCaps(this.text, {super.key, this.color = Tokens.mute});

  final String text;
  final Color color;

  @override
  Widget build(BuildContext context) =>
      Text(upperFor(Localizations.localeOf(context).languageCode, text), style: AppText.label.copyWith(color: color));
}

/// The running analysis: a red third sweeping a 3px track, parked when the system asks for less motion.
class ProgressSweep extends StatefulWidget {
  const ProgressSweep({super.key});

  @override
  State<ProgressSweep> createState() => _ProgressSweepState();
}

class _ProgressSweepState extends State<ProgressSweep> with SingleTickerProviderStateMixin {
  late final AnimationController _controller = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 1400),
  );

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (MediaQuery.disableAnimationsOf(context)) {
      _controller.stop();
      _controller.value = 0.35;
    } else if (!_controller.isAnimating) {
      _controller.repeat();
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => ExcludeSemantics(
    child: SizedBox(
      height: 3,
      child: AnimatedBuilder(
        animation: _controller,
        builder: (context, _) => CustomPaint(painter: _SweepPainter(_controller.value)),
      ),
    ),
  );
}

class _SweepPainter extends CustomPainter {
  _SweepPainter(this.progress);

  final double progress;

  @override
  void paint(Canvas canvas, Size size) {
    final track = RRect.fromRectAndRadius(Offset.zero & size, const Radius.circular(1.5));
    canvas.drawRRect(track, Paint()..color = Tokens.deskDeep);
    final width = size.width / 3;
    final left = -width + (size.width + width) * progress;
    canvas.save();
    canvas.clipRRect(track);
    canvas.drawRect(Rect.fromLTWH(left, 0, width, size.height), Paint()..color = Tokens.marker);
    canvas.restore();
  }

  @override
  bool shouldRepaint(_SweepPainter oldDelegate) => oldDelegate.progress != progress;
}
