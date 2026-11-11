// Links shared into the app from another app's share sheet (a job in the LinkedIn or Kariyer.net app). The Android
// side passes the shared text over a method channel; this side picks the first web address out of it and keeps it
// until a signed-in screen takes it to open New analysis.

import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';

/// Shares often wrap the link in a sentence ("Bu ilana göz at: https://…"); the address is the part to read.
String? firstLink(String? sharedText) {
  final match = RegExp(r'https?://[^\s<>"]+').firstMatch(sharedText ?? '');
  // A link at the end of a sentence can carry its full stop or a closing bracket.
  return match?.group(0)?.replaceFirst(RegExp(r'[.,;:!?)\]]+$'), '');
}

class SharedLinks extends ChangeNotifier {
  SharedLinks([this._channel = const MethodChannel('cv_assistant/share')]) {
    _channel.setMethodCallHandler(_onCall);
  }

  final MethodChannel _channel;
  String? _pending;

  /// A link waiting to be opened; a screen that opens it calls [take].
  String? get pending => _pending;

  /// Picks up the share that started the app, if it was started from a share sheet.
  Future<void> start() async {
    try {
      _accept(await _channel.invokeMethod<String>('takeInitialText'));
    } on MissingPluginException {
      // No platform side (tests, other platforms): nothing was shared.
    }
  }

  String? take() {
    final link = _pending;
    _pending = null;
    return link;
  }

  Future<void> _onCall(MethodCall call) async {
    if (call.method == 'shared') _accept(call.arguments as String?);
  }

  void _accept(String? sharedText) {
    final link = firstLink(sharedText);
    if (link == null) return;
    _pending = link;
    notifyListeners();
  }
}
