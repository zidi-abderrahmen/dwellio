import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:immobilier/providers/auth_providers.dart';
import 'package:immobilier/providers/notification_providers.dart';
import 'package:immobilier/screens/notifications/notifications_screen.dart';
import 'package:immobilier/services/notification_service.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

void main() {
  testWidgets('shows newest notifications first and updates from the stream', (
    tester,
  ) async {
    final controller = StreamController<List<Map<String, dynamic>>>();
    addTearDown(controller.close);
    final service = _FakeNotificationService(controller.stream);
    await _pumpNotifications(tester, service);

    expect(find.text('Loading notifications...'), findsOneWidget);
    expect(service.requestedUserId, 'user-1');

    controller.add([
      _notification(
        id: 'old',
        type: 'favorite_added',
        title: 'Someone saved your property',
        body: 'Sunny apartment',
        createdAt: '2026-01-01T10:00:00Z',
        isRead: true,
        data: const {'property_id': 'property-1'},
      ),
      _notification(
        id: 'new',
        type: 'new_message',
        title: 'New message from Ahmed',
        body: 'Is the apartment still available?',
        createdAt: '2026-11-25T18:00:00Z',
        isRead: false,
        data: const {'chat_id': 'chat-1', 'property_title': 'Sunny apartment'},
      ),
    ]);
    await tester.pump();

    expect(find.text('New message from Ahmed'), findsOneWidget);
    expect(find.text('Is the apartment still available?'), findsOneWidget);
    expect(find.text('Someone saved your property'), findsOneWidget);
    expect(find.text('Sunny apartment'), findsOneWidget);
    expect(
      tester.getTopLeft(find.text('New message from Ahmed')).dy,
      lessThan(tester.getTopLeft(find.text('Someone saved your property')).dy),
    );
    expect(
      tester
          .widget<Text>(find.text('New message from Ahmed'))
          .style
          ?.fontWeight,
      FontWeight.w700,
    );
    expect(
      tester
          .widget<Text>(find.text('Someone saved your property'))
          .style
          ?.fontWeight,
      FontWeight.w500,
    );
    expect(find.byIcon(Icons.chat_bubble_outline_rounded), findsOneWidget);
    expect(find.byIcon(Icons.favorite_border_rounded), findsOneWidget);

    controller.add([
      _notification(
        id: 'latest',
        type: 'new_message',
        title: 'Another new message',
        body: 'Thanks!',
        createdAt: '2026-11-25T18:05:00Z',
        isRead: false,
        data: const {'chat_id': 'chat-1'},
      ),
    ]);
    await tester.pump();

    expect(find.text('Another new message'), findsOneWidget);
  });

  testWidgets('shows an empty state when there are no notifications', (
    tester,
  ) async {
    await _pumpNotifications(
      tester,
      _FakeNotificationService(Stream.value(const [])),
    );
    await tester.pumpAndSettle();

    expect(find.text('No notifications yet.'), findsOneWidget);
  });

  testWidgets('shows an error state when the notification stream fails', (
    tester,
  ) async {
    await _pumpNotifications(
      tester,
      _FakeNotificationService(Stream.error(Exception('connection failed'))),
    );
    await tester.pumpAndSettle();

    expect(find.text('Notifications could not be loaded'), findsOneWidget);
    expect(find.textContaining('connection failed'), findsOneWidget);
    expect(find.text('Try again'), findsOneWidget);
  });
}

Future<void> _pumpNotifications(
  WidgetTester tester,
  NotificationService notificationService,
) async {
  tester.view.physicalSize = const Size(800, 900);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);

  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        sessionProvider.overrideWithValue(_session),
        notificationServiceProvider.overrideWithValue(notificationService),
      ],
      child: MaterialApp(home: const NotificationsScreen()),
    ),
  );
  await tester.pump();
}

Map<String, dynamic> _notification({
  required String id,
  required String type,
  required String title,
  required String body,
  required String createdAt,
  required bool isRead,
  required Map<String, dynamic> data,
}) {
  return {
    'id': id,
    'user_id': 'user-1',
    'type': type,
    'title': title,
    'body': body,
    'data': data,
    'is_read': isRead,
    'created_at': createdAt,
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

class _FakeNotificationService implements NotificationService {
  _FakeNotificationService(this.stream);

  final Stream<List<Map<String, dynamic>>> stream;
  String? requestedUserId;

  @override
  Future<List<Map<String, dynamic>>> getNotifications(String userId) async =>
      [];

  @override
  Future<int> getUnreadCount(String userId) async => 0;

  @override
  Future<void> markAsRead(String notificationId) async {}

  @override
  Stream<List<Map<String, dynamic>>> notificationsStream(String userId) {
    requestedUserId = userId;
    return stream;
  }
}
