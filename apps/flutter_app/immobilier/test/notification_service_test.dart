import 'package:flutter_test/flutter_test.dart';
import 'package:immobilier/services/notification_service.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

void main() {
  late NotificationService service;

  setUp(() {
    service = NotificationService(
      SupabaseClient('https://example.supabase.co', 'test-anon-key'),
    );
  });

  test('does not load notifications without an authenticated user', () async {
    await expectLater(
      service.getNotifications('user-1'),
      throwsA(isA<NotificationServiceFailure>()),
    );
  });

  test(
    'does not create a notification stream without an authenticated user',
    () {
      expect(
        () => service.notificationsStream('user-1'),
        throwsA(isA<NotificationServiceFailure>()),
      );
    },
  );

  test(
    'does not mark a notification as read without an authenticated user',
    () async {
      await expectLater(
        service.markAsRead('notification-1'),
        throwsA(isA<NotificationServiceFailure>()),
      );
    },
  );

  test('does not load unread count without an authenticated user', () async {
    await expectLater(
      service.getUnreadCount('user-1'),
      throwsA(isA<NotificationServiceFailure>()),
    );
  });
}
