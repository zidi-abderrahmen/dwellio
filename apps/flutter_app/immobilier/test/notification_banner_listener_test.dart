import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:immobilier/screens/shell/notification_banner_listener.dart';

void main() {
  testWidgets('skips history, deduplicates, and allows dismiss or open', (
    tester,
  ) async {
    final controller = StreamController<List<Map<String, dynamic>>>();
    addTearDown(controller.close);
    var opened = false;

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: NotificationBannerListener(
            notifications: controller.stream,
            onOpen: () => opened = true,
          ),
        ),
      ),
    );

    final oldNotification = _notification(
      id: 'old',
      title: 'Old notification',
      body: 'Loaded from history',
    );
    controller.add([oldNotification]);
    await tester.pumpAndSettle();
    expect(find.text('Old notification'), findsNothing);

    final newNotification = _notification(
      id: 'new',
      title: 'New notification',
      body: 'A new message preview',
    );
    controller.add([oldNotification, newNotification]);
    await tester.pumpAndSettle();

    expect(find.text('New notification'), findsOneWidget);
    expect(find.text('A new message preview'), findsOneWidget);
    expect(find.text('Open'), findsOneWidget);
    expect(
      tester.widget<SnackBar>(find.byType(SnackBar)).duration,
      const Duration(seconds: 8),
    );

    controller.add([oldNotification, newNotification]);
    await tester.pump();
    await tester.tap(find.byTooltip('Dismiss notification'));
    await tester.pumpAndSettle();
    expect(find.byType(SnackBar), findsNothing);

    controller.add([
      oldNotification,
      newNotification,
      _notification(
        id: 'newer',
        title: 'Another notification',
        body: 'Another preview',
      ),
    ]);
    await tester.pumpAndSettle();
    await tester.tap(find.text('Open'));
    expect(opened, isTrue);
  });
}

Map<String, dynamic> _notification({
  required String id,
  required String title,
  required String body,
}) {
  return {'id': id, 'title': title, 'body': body};
}
