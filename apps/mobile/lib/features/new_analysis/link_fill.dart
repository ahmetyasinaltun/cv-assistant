// Top of the posting sheet (design system: "Link Fill"): reads a posting from a pasted link and fills the fields below,
// or says why it could not and points to pasting the text, which sits right under it.

import 'package:flutter/material.dart';

import '../../app_scope.dart';
import '../../core/api/api_client.dart';
import '../../core/api/models.dart';
import '../../core/theme/app_text.dart';
import '../../core/theme/app_theme.dart';
import '../../core/theme/tokens.dart';
import '../../l10n/app_localizations.dart';
import '../../widgets/form_parts.dart';
import '../../widgets/status_mark.dart';
import 'new_analysis_model.dart';

class LinkFill extends StatefulWidget {
  const LinkFill({super.key, required this.onFilled, this.initialLink});

  final ValueChanged<JobDescriptionDraft> onFilled;

  /// Filled in and read at once (a link shared from another app).
  final String? initialLink;

  @override
  State<LinkFill> createState() => _LinkFillState();
}

class _LinkFillState extends State<LinkFill> {
  final _link = TextEditingController();
  bool _filling = false;
  LinkProblem? _problem;
  String _site = '';
  ({String site, bool hasTitle})? _filled;

  @override
  void initState() {
    super.initState();
    final link = widget.initialLink;
    if (link == null) return;
    _link.text = link;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) _fill();
    });
  }

  @override
  void dispose() {
    _link.dispose();
    super.dispose();
  }

  Future<void> _fill() async {
    if (_filling) return;
    final link = _link.text.trim();
    if (link.isEmpty) {
      setState(() {
        _problem = LinkProblem.missing;
        _filled = null;
      });
      return;
    }
    final site = siteName(link) ?? link;
    setState(() => _filling = true);
    try {
      final draft = await AppScope.call(context, (api) => api.importJobDescription(link));
      if (!mounted) return;
      // The keyboard would cover the fields that were just filled; a missing title takes focus again below.
      FocusScope.of(context).unfocus();
      widget.onFilled(draft);
      setState(() {
        _problem = null;
        _filled = (site: siteName(draft.sourceUrl) ?? site, hasTitle: (draft.title ?? '').isNotEmpty);
      });
    } on ApiException catch (error) {
      if (!mounted) return;
      setState(() {
        _problem = linkProblemFor(error);
        _site = site;
        _filled = null;
      });
    } finally {
      if (mounted) setState(() => _filling = false);
    }
  }

  String _message(AppLocalizations text, LinkProblem problem) => switch (problem) {
    LinkProblem.missing => text.linkErrorMissing,
    LinkProblem.invalid => text.linkErrorInvalid,
    LinkProblem.notAllowed => text.linkErrorNotAllowed,
    LinkProblem.blocked => text.linkErrorBlocked(_site),
    LinkProblem.notFound => text.linkErrorNotFound,
    LinkProblem.unreachable => text.linkErrorUnreachable(_site),
    LinkProblem.noPosting => text.linkErrorNoPosting,
    LinkProblem.tooMany => text.linkErrorTooMany,
    LinkProblem.unavailable => text.linkErrorUnavailable,
  };

  @override
  Widget build(BuildContext context) {
    final text = AppLocalizations.of(context);
    final problem = _problem;
    final filled = _filled;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text.rich(
          TextSpan(
            text: text.linkLabel,
            children: [
              TextSpan(
                text: ' (${text.optional})',
                style: AppText.fieldLabel.copyWith(color: Tokens.mute, fontWeight: FontWeight.w400),
              ),
            ],
          ),
          style: AppText.fieldLabel,
        ),
        const SizedBox(height: 6),
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: TextField(
                controller: _link,
                style: AppText.body,
                keyboardType: TextInputType.url,
                textInputAction: TextInputAction.go,
                autocorrect: false,
                enableSuggestions: false,
                onChanged: (_) {
                  if (_problem != null) setState(() => _problem = null);
                },
                // "Go" on the keyboard fills the posting instead of moving on.
                onSubmitted: (_) => _fill(),
                decoration: InputDecoration(
                  hintText: text.linkPlaceholder,
                  // A non-null errorText turns the edge red; the message itself is the FieldError below.
                  errorText: problem == null ? null : '',
                ),
              ),
            ),
            const SizedBox(width: 8),
            OutlinedButton(
              onPressed: _filling ? null : _fill,
              style: OutlinedButton.styleFrom(
                foregroundColor: Tokens.accentHover,
                side: BorderSide(color: Tokens.accent.withValues(alpha: 0.55)),
                minimumSize: const Size(64, 52),
              ),
              child: Text(_filling ? text.linkFilling : text.linkFill),
            ),
          ],
        ),
        if (problem != null)
          FieldError(_message(text, problem))
        else
          Padding(
            padding: const EdgeInsets.only(top: 6),
            child: Text(text.linkHint, style: AppText.meta),
          ),
        const SizedBox(height: 16),
        Row(
          children: [
            const Expanded(child: Divider(color: Tokens.rule, height: 1)),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12),
              child: Text(text.linkDivider, style: AppText.meta.copyWith(fontSize: 13)),
            ),
            const Expanded(child: Divider(color: Tokens.rule, height: 1)),
          ],
        ),
        if (filled != null) ...[
          const SizedBox(height: 16),
          Semantics(
            liveRegion: true,
            child: Container(
              padding: const EdgeInsets.fromLTRB(12, 10, 12, 10),
              decoration: const BoxDecoration(color: Tokens.accentTint, borderRadius: controlRadius),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Padding(
                    padding: EdgeInsets.only(top: 2),
                    child: StatusMark(status: MatchStatus.matched, size: 16),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      filled.hasTitle ? text.linkFilled(filled.site) : text.linkFilledNoTitle(filled.site),
                      style: AppText.bodySmall.copyWith(color: Tokens.accentHover, fontWeight: FontWeight.w500),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ],
    );
  }
}
