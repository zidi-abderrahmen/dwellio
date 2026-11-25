import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:immobilier/providers/auth_providers.dart';
import 'package:immobilier/providers/notification_providers.dart';
import 'package:immobilier/screens/notifications/notification_bell.dart';
import 'package:immobilier/services/notification_service.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

void main() {
  testWidgets('bell hides zero and tracks live unread count updates', (
    tester,
  ) async {
    final service = _FakeNotificationService();
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          sessionProvider.overrideWithValue(_session),
          notificationServiceProvider.overrideWithValue(service),
        ],
        child: const MaterialApp(
          home: Scaffold(body: NotificationBell(onPressed: _noOp)),
        ),
      ),
    );

    Badge currentBadge() => tester.widget<Badge>(find.byType(Badge));

    expect(currentBadge().isLabelVisible, isFalse);

    service.emit('user-1', [
      {'is_read': false},
    ]);
    await tester.pumpAndSettle();
    expect(currentBadge().isLabelVisible, isTrue);
    expect(find.text('1'), findsOneWidget);

    service.emit('user-1', List.generate(5, (_) => {'is_read': false}));
    await tester.pumpAndSettle();
    expect(find.text('5'), findsOneWidget);

    service.emit('user-1', [
      {'is_read': true},
      ...List.generate(4, (_) => {'is_read': false}),
    ]);
    await tester.pumpAndSettle();
    expect(find.text('4'), findsOneWidget);

    service.emit('user-1', [
      {'is_read': true},
    ]);
    await tester.pumpAndSettle();
    expect(currentBadge().isLabelVisible, isFalse);

    await tester.pumpWidget(const SizedBox.shrink());
    await tester.pump();
    await service.close();
  });

  test(
    'shares one feed per user and cancels it when no longer observed',
    () async {
      final service = _FakeNotificationService();
      final container = ProviderContainer(
        overrides: [notificationServiceProvider.overrideWithValue(service)],
      );
      addTearDown(() async {
        container.dispose();
        await Future<void>.delayed(Duration.zero);
        await service.close();
      });

      final firstListener = container.listen(
        notificationFeedProvider('user-1'),
        (_, _) {},
      );
      final secondListener = container.listen(
        notificationFeedProvider('user-1'),
        (_, _) {},
      );
      final firstFeed = container.read(notificationFeedProvider('user-1'));

      expect(
        identical(
          firstFeed,
          container.read(notificationFeedProvider('user-1')),
        ),
        isTrue,
      );
      expect(service.requestedUsers, ['user-1']);
      expect(service.activeSubscriptions['user-1'], 1);

      service.emit('user-1', [
        {'is_read': false},
        {'is_read': true},
        {'is_read': false},
      ]);
      await Future<void>.delayed(Duration.zero);
      expect(firstFeed.unreadCount.value, 2);
      expect(identical(firstFeed.stream, firstFeed.stream), isTrue);
      expect((await firstFeed.stream.first).length, 3);

      firstListener.close();
      expect(service.activeSubscriptions['user-1'], 1);
      secondListener.close();
      await container.pump();

      expect(service.activeSubscriptions['user-1'], 0);
      expect(service.cancelledSubscriptions['user-1'], 1);

      final otherUserListener = container.listen(
        notificationFeedProvider('user-2'),
        (_, _) {},
      );
      expect(service.requestedUsers, ['user-1', 'user-2']);
      expect(service.activeSubscriptions['user-2'], 1);
      otherUserListener.close();
      await container.pump();
    },
  );
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

void _noOp() {}

class _FakeNotificationService implements NotificationService {
  final List<String> requestedUsers = [];
  final Map<String, int> activeSubscriptions = {};
  final Map<String, int> cancelledSubscriptions = {};
  final Map<String, StreamController<List<Map<String, dynamic>>>> _controllers =
      {};

  @override
  Stream<List<Map<String, dynamic>>> notificationsStream(String userId) {
    requestedUsers.add(userId);
    final controller = StreamController<List<Map<String, dynamic>>>.broadcast(
      onListen: () {
        activeSubscriptions.update(
          userId,
          (count) => count + 1,
          ifAbsent: () => 1,
        );
      },
      onCancel: () {
        activeSubscriptions.update(userId, (count) => count - 1);
        cancelledSubscriptions.update(
          userId,
          (count) => count + 1,
          ifAbsent: () => 1,
        );
      },
    );
    _controllers[userId] = controller;
    return controller.stream;
  }

  void emit(String userId, List<Map<String, dynamic>> notifications) {
    _controllers[userId]!.add(notifications);
  }

  Future<void> close() async {
    for (final controller in _controllers.values) {
      await controller.close();
    }
  }

  @override
  Future<List<Map<String, dynamic>>> getNotifications(String userId) async =>
      [];

  @override
  Future<int> getUnreadCount(String userId) async => 0;

  @override
  Future<void> markAsRead(String notificationId) async {}
}
