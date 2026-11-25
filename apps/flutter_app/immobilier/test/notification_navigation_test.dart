import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:immobilier/core/app_routes.dart';
import 'package:immobilier/providers/auth_providers.dart';
import 'package:immobilier/providers/notification_providers.dart';
import 'package:immobilier/screens/notifications/notifications_screen.dart';
import 'package:immobilier/services/notification_service.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

void main() {
  testWidgets('marks notifications read and opens their matching routes', (
    tester,
  ) async {
    final chatId = 'c0ffee00-0000-4000-8000-000000000001';
    final propertyId = 'f00baa00-0000-4000-8000-000000000002';
    final harness = await _pumpNotifications(tester, [
      _notification(
        id: 'message-notification',
        type: 'new_message',
        title: 'New message',
        data: {'chat_id': chatId},
      ),
      _notification(
        id: 'favorite-notification',
        type: 'favorite_added',
        title: 'Property saved',
        data: {'property_id': propertyId},
      ),
    ]);
    addTearDown(harness.dispose);

    expect(_unreadCount(harness), 2);
    await tester.tap(find.text('New message'));
    await tester.pumpAndSettle();

    expect(find.text('Chat route: $chatId'), findsOneWidget);
    expect(harness.service.markedIds, ['message-notification']);
    expect(_unreadCount(harness), 1);

    harness.router.pop();
    await tester.pumpAndSettle();
    await tester.tap(find.text('Property saved'));
    await tester.pumpAndSettle();

    expect(find.text('Property route: $propertyId'), findsOneWidget);
    expect(harness.service.markedIds, [
      'message-notification',
      'favorite-notification',
    ]);
    expect(_unreadCount(harness), 0);
  });

  testWidgets('does not mark or navigate with invalid destination data', (
    tester,
  ) async {
    final harness = await _pumpNotifications(tester, [
      _notification(
        id: 'invalid-notification',
        type: 'new_message',
        title: 'Invalid message',
        data: {'chat_id': 'not-a-chat-id'},
      ),
    ]);
    addTearDown(harness.dispose);

    await tester.tap(find.text('Invalid message'));
    await tester.pumpAndSettle();

    expect(
      find.text('This notification is missing valid destination information.'),
      findsOneWidget,
    );
    expect(harness.service.markedIds, isEmpty);
    expect(_unreadCount(harness), 1);
    expect(find.text('Invalid message'), findsOneWidget);
  });

  testWidgets('keeps unread state and shows an error when marking fails', (
    tester,
  ) async {
    final chatId = 'c0ffee00-0000-4000-8000-000000000001';
    final harness = await _pumpNotifications(tester, [
      _notification(
        id: 'message-notification',
        type: 'new_message',
        title: 'New message',
        data: {'chat_id': chatId},
      ),
    ], failMarkAsRead: true);
    addTearDown(harness.dispose);

    await tester.tap(find.text('New message'));
    await tester.pumpAndSettle();

    expect(
      find.textContaining('Unable to mark this notification as read'),
      findsOneWidget,
    );
    expect(harness.service.markedIds, ['message-notification']);
    expect(_unreadCount(harness), 1);
    expect(find.text('New message'), findsOneWidget);
    expect(find.text('Chat route: $chatId'), findsNothing);
  });
}

int _unreadCount(_NotificationHarness harness) {
  return harness.container
      .read(notificationFeedProvider('user-1'))
      .unreadCount
      .value;
}

Future<_NotificationHarness> _pumpNotifications(
  WidgetTester tester,
  List<Map<String, dynamic>> notifications, {
  bool failMarkAsRead = false,
}) async {
  final controller = StreamController<List<Map<String, dynamic>>>();
  final service = _FakeNotificationService(
    controller.stream,
    failMarkAsRead: failMarkAsRead,
  );
  final container = ProviderContainer(
    overrides: [
      sessionProvider.overrideWithValue(_session),
      notificationServiceProvider.overrideWithValue(service),
    ],
  );
  final router = GoRouter(
    initialLocation: AppRoutes.notifications,
    routes: [
      GoRoute(
        path: AppRoutes.notifications,
        builder: (context, state) => const NotificationsScreen(),
      ),
      GoRoute(
        path: AppRoutes.chat,
        builder: (context, state) => Scaffold(
          body: Text('Chat route: ${state.pathParameters['chatId']}'),
        ),
      ),
      GoRoute(
        path: AppRoutes.propertyDetails,
        builder: (context, state) => Scaffold(
          body: Text('Property route: ${state.pathParameters['id']}'),
        ),
      ),
    ],
  );
  await tester.pumpWidget(
    UncontrolledProviderScope(
      container: container,
      child: MaterialApp.router(routerConfig: router),
    ),
  );
  controller.add(notifications);
  await tester.pumpAndSettle();

  return _NotificationHarness(
    controller: controller,
    container: container,
    router: router,
    service: service,
  );
}

Map<String, dynamic> _notification({
  required String id,
  required String type,
  required String title,
  required Map<String, dynamic> data,
}) {
  return {
    'id': id,
    'user_id': 'user-1',
    'type': type,
    'title': title,
    'body': null,
    'data': data,
    'is_read': false,
    'created_at': '2026-11-25T18:00:00Z',
  };
}

final _session = Session(
  accessToken: 'test-token',
  tokenType: 'bearer',
  user: User(
    id: 'user-1',
    appMetadata: const {},
    userMetadata: const {},
    aud: 'authenticated',
    createdAt: '2026-01-01T00:00:00Z',
  ),
);

class _NotificationHarness {
  const _NotificationHarness({
    required this.controller,
    required this.container,
    required this.router,
    required this.service,
  });

  final StreamController<List<Map<String, dynamic>>> controller;
  final ProviderContainer container;
  final GoRouter router;
  final _FakeNotificationService service;

  Future<void> dispose() async {
    router.dispose();
    container.dispose();
    await controller.close();
  }
}

class _FakeNotificationService implements NotificationService {
  _FakeNotificationService(this.stream, {required this.failMarkAsRead});

  final Stream<List<Map<String, dynamic>>> stream;
  final bool failMarkAsRead;
  final List<String> markedIds = [];

  @override
  Future<List<Map<String, dynamic>>> getNotifications(String userId) async =>
      [];

  @override
  Future<int> getUnreadCount(String userId) async => 0;

  @override
  Future<void> markAsRead(String notificationId) async {
    markedIds.add(notificationId);
    if (failMarkAsRead) {
      throw const NotificationServiceFailure('Permission denied.');
    }
  }

  @override
  Stream<List<Map<String, dynamic>>> notificationsStream(String userId) =>
      stream;
}
