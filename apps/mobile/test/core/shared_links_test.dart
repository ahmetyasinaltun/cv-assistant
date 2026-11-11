// Tests for links shared from other apps: picking the address out of a share's text, and the method channel that
// brings the share that started the app and shares that arrive while it runs.

import 'package:cv_assistant/core/share/shared_links.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

const channel = MethodChannel('cv_assistant/share');

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  final messenger = TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger;

  tearDown(() => messenger.setMockMethodCallHandler(channel, null));

  test('the link is picked out of the sentence a share wraps it in', () {
    expect(
      firstLink('Bu ilana göz at: https://www.kariyer.net/is-ilani/kimya-muhendisi-4586269'),
      'https://www.kariyer.net/is-ilani/kimya-muhendisi-4586269',
    );
    expect(
      firstLink('Check out this job (https://www.linkedin.com/jobs/view/4475250238).'),
      'https://www.linkedin.com/jobs/view/4475250238',
    );
    expect(firstLink('No address here'), isNull);
    expect(firstLink(null), isNull);
  });

  test('the share that started the app is waiting once start has run', () async {
    messenger.setMockMethodCallHandler(channel, (call) async {
      expect(call.method, 'takeInitialText');
      return 'https://lnkd.in/p/dExjxyB7';
    });
    final links = SharedLinks();
    await links.start();
    expect(links.pending, 'https://lnkd.in/p/dExjxyB7');
    expect(links.take(), 'https://lnkd.in/p/dExjxyB7');
    expect(links.pending, isNull);
  });

  test('a share while the app runs notifies its listeners', () async {
    final links = SharedLinks();
    var notified = 0;
    links.addListener(() => notified++);
    await messenger.handlePlatformMessage(
      channel.name,
      channel.codec.encodeMethodCall(const MethodCall('shared', 'See https://www.youthall.com/tr/acme/intern_1/')),
      (_) {},
    );
    expect(notified, 1);
    expect(links.pending, 'https://www.youthall.com/tr/acme/intern_1/');
  });

  test('a share without a link is ignored', () async {
    final links = SharedLinks();
    await messenger.handlePlatformMessage(
      channel.name,
      channel.codec.encodeMethodCall(const MethodCall('shared', 'just some text')),
      (_) {},
    );
    expect(links.pending, isNull);
  });
}
