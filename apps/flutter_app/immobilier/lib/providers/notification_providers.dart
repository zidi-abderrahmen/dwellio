import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../services/notification_service.dart';

final notificationServiceProvider = Provider<NotificationService>(
  (ref) => NotificationService(),
);

final notificationFeedProvider = Provider.autoDispose
    .family<NotificationFeed, String>((ref, userId) {
      final feed = NotificationFeed(
        ref.watch(notificationServiceProvider).notificationsStream(userId),
      );
      ref.onDispose(() {
        unawaited(feed.dispose());
      });
      return feed;
    });

/// Shares one source subscription among the shell, bell, and notifications page.
class NotificationFeed {
  NotificationFeed(Stream<List<Map<String, dynamic>>> source) {
    _subscription = source.listen(
      _publish,
      onError: (Object error, StackTrace stackTrace) {
        if (!_controller.isClosed) _controller.addError(error, stackTrace);
      },
      onDone: () {
        if (!_controller.isClosed) unawaited(_controller.close());
      },
    );
  }

  final StreamController<List<Map<String, dynamic>>> _controller =
      StreamController<List<Map<String, dynamic>>>.broadcast();
  final ValueNotifier<int> _unreadCount = ValueNotifier<int>(0);
  late final StreamSubscription<List<Map<String, dynamic>>> _subscription;
  List<Map<String, dynamic>>? _latestNotifications;

  late final Stream<List<Map<String, dynamic>>> _stream = Stream.multi((
    controller,
  ) {
    final latest = _latestNotifications;
    if (latest != null) controller.add(latest);

    final subscription = _controller.stream.listen(
      controller.add,
      onError: (Object error, StackTrace stackTrace) {
        controller.addError(error, stackTrace);
      },
      onDone: controller.close,
    );
    controller.onCancel = () => subscription.cancel();
  });

  Stream<List<Map<String, dynamic>>> get stream => _stream;
  ValueListenable<int> get unreadCount => _unreadCount;

  void markAsReadLocally(String notificationId) {
    final current = _latestNotifications;
    if (current == null) return;

    final index = current.indexWhere(
      (notification) =>
          notification['id']?.toString() == notificationId &&
          notification['is_read'] != true,
    );
    if (index < 0) return;

    final updated = List<Map<String, dynamic>>.of(current);
    updated[index] = {...updated[index], 'is_read': true};
    _publish(updated);
  }

  void _publish(List<Map<String, dynamic>> notifications) {
    _latestNotifications = notifications;
    _unreadCount.value = notifications
        .where((notification) => notification['is_read'] == false)
        .length;
    if (!_controller.isClosed) _controller.add(notifications);
  }

  Future<void> dispose() async {
    await _subscription.cancel();
    await _controller.close();
    _unreadCount.dispose();
  }
}
