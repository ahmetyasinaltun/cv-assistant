// Gives every screen the shared API client and the session without threading them through each constructor.

import 'package:flutter/widgets.dart';

import 'core/api/api_client.dart';
import 'core/api/career_api.dart';
import 'core/session/session_controller.dart';

class AppScope extends InheritedWidget {
  const AppScope({super.key, required this.api, required this.session, required super.child});

  final CareerApi api;
  final SessionController session;

  static AppScope of(BuildContext context) {
    final scope = context.getInheritedWidgetOfExactType<AppScope>();
    assert(scope != null, 'AppScope is missing above this widget');
    return scope!;
  }

  /// Runs an API call; a 401 ends the session (the gate then shows sign-in) and is rethrown to stop the caller.
  static Future<T> call<T>(BuildContext context, Future<T> Function(CareerApi api) request) async {
    final scope = of(context);
    try {
      return await request(scope.api);
    } on ApiException catch (error) {
      if (error.isUnauthorized) await scope.session.expire();
      rethrow;
    }
  }

  @override
  bool updateShouldNotify(AppScope oldWidget) => api != oldWidget.api || session != oldWidget.session;
}
