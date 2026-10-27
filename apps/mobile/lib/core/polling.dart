// Repeats a refresh while an analysis runs on the server, and pauses while the app is in the background so a
// phone in a pocket does not keep calling the API.

import 'dart:async';

import 'package:flutter/widgets.dart';

class Poller {
  Poller({required this.onTick, this.interval = const Duration(seconds: 3)});

  final Future<void> Function() onTick;
  final Duration interval;

  Timer? _timer;
  AppLifecycleListener? _lifecycle;
  bool _wanted = false;
  bool _foreground = true;
  bool _ticking = false;

  /// Polls while [active] is true; call after every refresh with whether something still runs.
  void update({required bool active}) {
    _wanted = active;
    _lifecycle ??= AppLifecycleListener(
      onResume: () {
        _foreground = true;
        _sync();
        if (_wanted) _tick();
      },
      onHide: () {
        _foreground = false;
        _sync();
      },
    );
    _sync();
  }

  void _sync() {
    final run = _wanted && _foreground;
    if (run && _timer == null) {
      _timer = Timer.periodic(interval, (_) => _tick());
    } else if (!run) {
      _timer?.cancel();
      _timer = null;
    }
  }

  Future<void> _tick() async {
    if (_ticking) return;
    _ticking = true;
    try {
      await onTick();
    } finally {
      _ticking = false;
    }
  }

  void dispose() {
    _timer?.cancel();
    _lifecycle?.dispose();
  }
}
