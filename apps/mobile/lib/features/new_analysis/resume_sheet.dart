// Parts of the CV sheet on New analysis: a saved-CV row, the in-place delete confirmation that states what goes
// with the CV on a red tint, and the PDF picker drawn as the dashed "place a file here" box (design system: "File Drop").

import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../core/api/models.dart';
import '../../core/theme/app_text.dart';
import '../../core/theme/tokens.dart';
import '../../l10n/app_localizations.dart';
import '../../widgets/form_parts.dart';
import 'new_analysis_model.dart';

class SavedResumeRow extends StatelessWidget {
  const SavedResumeRow({
    super.key,
    required this.resume,
    required this.selected,
    required this.onSelect,
    required this.onDelete,
  });

  final ResumeSummary resume;
  final bool selected;
  final VoidCallback onSelect;
  final VoidCallback onDelete;

  @override
  Widget build(BuildContext context) {
    final text = AppLocalizations.of(context);
    final language = Localizations.localeOf(context).toLanguageTag();
    final source = resume.sourceType == 'pdf' ? text.resumeSourcePdf : text.resumeSourceText;
    final created = resume.createdAt.toLocal();
    final sameYear = created.year == DateTime.now().year;
    final date = (sameYear ? DateFormat.MMMd(language) : DateFormat.yMMMd(language)).format(created);
    return Material(
      color: selected ? Tokens.accentTint : Colors.transparent,
      borderRadius: const BorderRadius.all(Radius.circular(10)),
      child: InkWell(
        onTap: onSelect,
        borderRadius: const BorderRadius.all(Radius.circular(10)),
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 4),
          child: Row(
            children: [
              Radio<String>(value: resume.id),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(resume.title, style: AppText.fieldLabel, maxLines: 1, overflow: TextOverflow.ellipsis),
                    Text('$source · ${text.resumeCharacters(resume.characterCount)} · $date', style: AppText.meta),
                  ],
                ),
              ),
              TextAction(label: text.resumeDelete, onPressed: onDelete),
              const SizedBox(width: 8),
            ],
          ),
        ),
      ),
    );
  }
}

class DeleteConfirmBand extends StatelessWidget {
  const DeleteConfirmBand({
    super.key,
    required this.title,
    required this.analysisCount,
    required this.deleting,
    required this.failed,
    required this.onConfirm,
    required this.onCancel,
  });

  final String title;
  final int analysisCount;
  final bool deleting;
  final bool failed;
  final VoidCallback onConfirm;
  final VoidCallback onCancel;

  @override
  Widget build(BuildContext context) {
    final text = AppLocalizations.of(context);
    return Container(
      padding: const EdgeInsets.fromLTRB(12, 12, 12, 8),
      decoration: const BoxDecoration(color: Tokens.markerTint, borderRadius: BorderRadius.all(Radius.circular(10))),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Semantics(liveRegion: true, child: Text(text.resumeDeleteConfirm(title), style: AppText.fieldLabel)),
          const SizedBox(height: 4),
          Text(text.resumeDeleteConsequence(analysisCount), style: AppText.meta.copyWith(color: Tokens.inkSoft)),
          if (failed) ...[const SizedBox(height: 8), FormAlert(text.resumeDeleteFailed)],
          const SizedBox(height: 10),
          Row(
            children: [
              FilledButton(
                autofocus: true,
                style: FilledButton.styleFrom(backgroundColor: Tokens.marker),
                onPressed: deleting ? null : onConfirm,
                child: Text(deleting ? text.resumeDeleting : text.resumeDeleteButton),
              ),
              const SizedBox(width: 16),
              TextAction(label: text.cancel, onPressed: deleting ? null : onCancel),
            ],
          ),
        ],
      ),
    );
  }
}

class PdfPicker extends StatelessWidget {
  const PdfPicker({super.key, required this.file, required this.error, required this.onPick, this.focusNode});

  final PickedPdf? file;
  final String? error;
  final VoidCallback onPick;
  final FocusNode? focusNode;

  @override
  Widget build(BuildContext context) {
    final text = AppLocalizations.of(context);
    final edge = error != null ? Tokens.marker : Tokens.fieldEdge;
    final picked = file;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        CustomPaint(
          painter: _DashedBorder(edge),
          child: InkWell(
            focusNode: focusNode,
            onTap: onPick,
            borderRadius: const BorderRadius.all(Radius.circular(10)),
            child: ConstrainedBox(
              constraints: const BoxConstraints(minHeight: 112),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Center(
                  child: picked == null
                      ? Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(Icons.upload_file_outlined, size: 22, color: Tokens.accent),
                            const SizedBox(width: 8),
                            Text(
                              text.resumeChooseFile,
                              style: AppText.bodySmall.copyWith(
                                color: Tokens.accentHover,
                                fontWeight: FontWeight.w600,
                                decoration: TextDecoration.underline,
                                decorationColor: Tokens.accent.withValues(alpha: 0.35),
                              ),
                            ),
                          ],
                        )
                      : Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              picked.name,
                              style: AppText.body.copyWith(fontWeight: FontWeight.w500),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                            const SizedBox(height: 2),
                            Text('${_megabytes(picked.bytes.length)} · ${text.resumeReplaceFile}', style: AppText.meta),
                          ],
                        ),
                ),
              ),
            ),
          ),
        ),
        if (error == null)
          Padding(
            padding: const EdgeInsets.only(top: 6),
            child: Text(text.resumeFileHint, style: AppText.meta),
          ),
        if (error != null) FieldError(error!),
      ],
    );
  }

  static String _megabytes(int bytes) => '${(bytes / (1024 * 1024)).toStringAsFixed(1)} MB';
}

/// The only dashed border in the system: it says "place a file here", which a solid printed box does not.
class _DashedBorder extends CustomPainter {
  _DashedBorder(this.color);

  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1;
    final outline = Path()
      ..addRRect(RRect.fromRectAndRadius((Offset.zero & size).deflate(0.5), const Radius.circular(10)));
    for (final metric in outline.computeMetrics()) {
      for (var distance = 0.0; distance < metric.length; distance += 9) {
        canvas.drawPath(metric.extractPath(distance, distance + 5), paint);
      }
    }
  }

  @override
  bool shouldRepaint(_DashedBorder oldDelegate) => oldDelegate.color != color;
}
