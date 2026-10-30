// Small shared pieces: the priority chip, a group head inside a card, the sample notice on the brand band, and the
// indeterminate progress sweep.

import 'package:flutter/material.dart';

import '../core/api/models.dart';
import '../core/theme/app_text.dart';
import '../core/theme/tokens.dart';

/// High is filled teal, medium a teal wash, low a ground shade; priority is never red, which means missing.
class PriorityTag extends StatelessWidget {
  const PriorityTag({super.key, required this.priority, required this.label});

  final Priority priority;
  final String label;

  @override
  Widget build(BuildContext context) {
    final (background, foreground) = switch (priority) {
      Priority.high => (Tokens.accent, Tokens.paper),
      Priority.medium => (Tokens.accentTint, Tokens.accentHover),
      Priority.low => (Tokens.deskDeep, Tokens.inkSoft),
    };
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(color: background, borderRadius: const BorderRadius.all(Radius.circular(6))),
      child: Text(
        label,
        style: AppText.chip.copyWith(color: foreground, fontWeight: FontWeight.w700),
      ),
    );
  }
}

/// A group head inside a card with an optional count at the right, in sentence case.
class GroupHead extends StatelessWidget {
  const GroupHead(this.text, {super.key, this.count});

  final String text;
  final int? count;

  @override
  Widget build(BuildContext context) => Row(
    children: [
      Expanded(
        child: Semantics(header: true, child: Text(text, style: AppText.groupHead)),
      ),
      if (count != null) Text('$count', style: AppText.meta.copyWith(fontWeight: FontWeight.w500)),
    ],
  );
}

/// Marks fictional sample content on the brand band, so it is never mistaken for real data.
class SampleNotice extends StatelessWidget {
  const SampleNotice(this.message, {super.key});

  final String message;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
    decoration: BoxDecoration(
      color: Tokens.onBrand.withValues(alpha: 0.12),
      borderRadius: const BorderRadius.all(Radius.circular(6)),
    ),
    child: Text(
      message,
      style: AppText.meta.copyWith(color: Tokens.onBrand, fontWeight: FontWeight.w500),
    ),
  );
}

/// The running analysis: a teal third sweeping a 4dp track, parked when the system asks for less motion.
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
      height: 4,
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
    final track = RRect.fromRectAndRadius(Offset.zero & size, const Radius.circular(2));
    canvas.drawRRect(track, Paint()..color = Tokens.deskDeep);
    final width = size.width / 3;
    final left = -width + (size.width + width) * progress;
    canvas.save();
    canvas.clipRRect(track);
    canvas.drawRect(Rect.fromLTWH(left, 0, width, size.height), Paint()..color = Tokens.accent);
    canvas.restore();
  }

  @override
  bool shouldRepaint(_SweepPainter oldDelegate) => oldDelegate.progress != progress;
}
