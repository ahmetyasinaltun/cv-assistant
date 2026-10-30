// Form fields and their parts (design system: "Form Fields"): a label above, a hint below, and errors led by the missing
// icon so they read without colour. Form-level problems sit in one live region on a red tint.

import 'package:flutter/material.dart';

import '../core/api/models.dart';
import '../core/theme/app_text.dart';
import '../core/theme/app_theme.dart';
import '../core/theme/tokens.dart';
import 'status_mark.dart';

class FieldError extends StatelessWidget {
  const FieldError(this.message, {super.key});

  final String message;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(top: 6),
    child: Semantics(
      liveRegion: true,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Padding(
            padding: EdgeInsets.only(top: 2),
            child: StatusMark(status: MatchStatus.missing, size: 15),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(message, style: AppText.meta.copyWith(color: Tokens.marker)),
          ),
        ],
      ),
    ),
  );
}

/// One sentence for a problem that belongs to the whole form (wrong password, service unreachable).
class FormAlert extends StatelessWidget {
  const FormAlert(this.message, {super.key});

  final String message;

  @override
  Widget build(BuildContext context) => Semantics(
    liveRegion: true,
    child: Container(
      padding: const EdgeInsets.fromLTRB(14, 12, 14, 12),
      decoration: const BoxDecoration(color: Tokens.markerTint, borderRadius: controlRadius),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Padding(
            padding: EdgeInsets.only(top: 2),
            child: StatusMark(status: MatchStatus.missing, size: 17),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Text(message, style: AppText.bodySmall.copyWith(color: Tokens.ink)),
          ),
        ],
      ),
    ),
  );
}

class LabeledField extends StatelessWidget {
  const LabeledField({
    super.key,
    required this.label,
    required this.controller,
    this.focusNode,
    this.optionalNote,
    this.hint,
    this.placeholder,
    this.error,
    this.below,
    this.multiline = false,
    this.obscure = false,
    this.keyboardType,
    this.textInputAction,
    this.autofillHints,
    this.suffix,
    this.onChanged,
    this.onSubmitted,
  });

  final String label;
  final TextEditingController controller;
  final FocusNode? focusNode;
  final String? optionalNote;
  final String? hint;
  final String? placeholder;
  final String? error;

  /// Extra line under the field, such as the character count.
  final Widget? below;
  final bool multiline;
  final bool obscure;
  final TextInputType? keyboardType;
  final TextInputAction? textInputAction;
  final Iterable<String>? autofillHints;
  final Widget? suffix;
  final ValueChanged<String>? onChanged;
  final ValueChanged<String>? onSubmitted;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text.rich(
          TextSpan(
            text: label,
            children: [
              if (optionalNote != null)
                TextSpan(
                  text: ' ($optionalNote)',
                  style: AppText.fieldLabel.copyWith(color: Tokens.mute, fontWeight: FontWeight.w400),
                ),
            ],
          ),
          style: AppText.fieldLabel,
        ),
        const SizedBox(height: 6),
        TextField(
          controller: controller,
          focusNode: focusNode,
          style: multiline ? AppText.bodySheet : AppText.body,
          minLines: multiline ? 8 : 1,
          // A long field grows with its text instead of scrolling inside the page: a drag on it then scrolls
          // the page, which a nested scroll area on a phone would swallow.
          maxLines: multiline ? null : 1,
          obscureText: obscure,
          keyboardType: multiline ? TextInputType.multiline : keyboardType,
          textInputAction: multiline ? TextInputAction.newline : textInputAction,
          autofillHints: autofillHints,
          onChanged: onChanged,
          onSubmitted: onSubmitted,
          decoration: InputDecoration(
            hintText: placeholder,
            // A non-null errorText turns the edge red; the message itself is the FieldError below.
            errorText: error == null ? null : '',
            suffixIcon: suffix,
          ),
        ),
        ?below,
        if (hint != null && error == null)
          Padding(
            padding: const EdgeInsets.only(top: 6),
            child: Text(hint!, style: AppText.meta),
          ),
        if (error != null) FieldError(error!),
      ],
    );
  }
}

/// A secondary action set as an underlined text link, with a 48dp hit area that does not move the layout.
class TextAction extends StatelessWidget {
  const TextAction({
    super.key,
    required this.label,
    required this.onPressed,
    this.color = Tokens.accentHover,
    this.inline = false,
  });

  final String label;
  final VoidCallback? onPressed;
  final Color color;

  /// Inside running text the link takes the text's size (design system: "Inline link"), so both share a baseline.
  final bool inline;

  @override
  Widget build(BuildContext context) => TextButton(
    onPressed: onPressed,
    style: TextButton.styleFrom(
      foregroundColor: color,
      padding: EdgeInsets.zero,
      minimumSize: const Size(48, 48),
      tapTargetSize: MaterialTapTargetSize.padded,
      alignment: AlignmentDirectional.centerStart,
    ),
    child: Text(
      label,
      style: (inline ? AppText.bodySmall : AppText.meta).copyWith(
        color: color,
        fontWeight: FontWeight.w500,
        decoration: TextDecoration.underline,
        decorationColor: color.withValues(alpha: 0.35),
      ),
    ),
  );
}
