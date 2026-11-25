import 'package:supabase_flutter/supabase_flutter.dart';

class NotificationServiceFailure implements Exception {
  const NotificationServiceFailure(this.message);

  final String message;

  @override
  String toString() => message;
}

/// Reads and updates notifications for the currently authenticated user.
class NotificationService {
  NotificationService([SupabaseClient? client])
    : _client = client ?? Supabase.instance.client;

  final SupabaseClient _client;

  Future<List<Map<String, dynamic>>> getNotifications(String userId) async {
    final authenticatedUserId = _requireUserId(userId);

    try {
      final rows = await _client
          .from('notifications')
          .select()
          .eq('user_id', authenticatedUserId)
          .order('created_at', ascending: false);

      return List<Map<String, dynamic>>.from(rows);
    } on PostgrestException catch (error) {
      throw NotificationServiceFailure(
        'Unable to load notifications: ${error.message}',
      );
    } catch (error) {
      throw NotificationServiceFailure('Unable to load notifications: $error');
    }
  }

  Stream<List<Map<String, dynamic>>> notificationsStream(String userId) {
    final authenticatedUserId = _requireUserId(userId);

    try {
      return _client
          .from('notifications')
          .stream(primaryKey: ['id'])
          .eq('user_id', authenticatedUserId)
          .order('created_at', ascending: false)
          .handleError((Object error, StackTrace stackTrace) {
            throw NotificationServiceFailure(
              'Unable to receive notifications: $error',
            );
          });
    } on NotificationServiceFailure {
      rethrow;
    } on PostgrestException catch (error) {
      throw NotificationServiceFailure(
        'Unable to subscribe to notifications: ${error.message}',
      );
    } catch (error) {
      throw NotificationServiceFailure(
        'Unable to subscribe to notifications: $error',
      );
    }
  }

  Future<void> markAsRead(String notificationId) async {
    final userId = _requireAuthenticatedUserId();
    final normalizedNotificationId = notificationId.trim();
    if (normalizedNotificationId.isEmpty) {
      throw const NotificationServiceFailure(
        'A valid notification is required.',
      );
    }

    try {
      final updated = await _client
          .from('notifications')
          .update({'is_read': true})
          .eq('id', normalizedNotificationId)
          .eq('user_id', userId)
          .select('id')
          .maybeSingle();

      if (updated == null) {
        throw const NotificationServiceFailure(
          'This notification could not be found.',
        );
      }
    } on NotificationServiceFailure {
      rethrow;
    } on PostgrestException catch (error) {
      throw NotificationServiceFailure(
        'Unable to mark notification as read: ${error.message}',
      );
    } catch (error) {
      throw NotificationServiceFailure(
        'Unable to mark notification as read: $error',
      );
    }
  }

  Future<int> getUnreadCount(String userId) async {
    final authenticatedUserId = _requireUserId(userId);

    try {
      final rows = await _client
          .from('notifications')
          .select('id')
          .eq('user_id', authenticatedUserId)
          .eq('is_read', false);

      return List<Map<String, dynamic>>.from(rows).length;
    } on PostgrestException catch (error) {
      throw NotificationServiceFailure(
        'Unable to load unread notifications: ${error.message}',
      );
    } catch (error) {
      throw NotificationServiceFailure(
        'Unable to load unread notifications: $error',
      );
    }
  }

  String _requireUserId(String userId) {
    final authenticatedUserId = _requireAuthenticatedUserId();
    if (userId.trim() != authenticatedUserId) {
      throw const NotificationServiceFailure(
        'You can only access your own notifications.',
      );
    }
    return authenticatedUserId;
  }

  String _requireAuthenticatedUserId() {
    final userId = _client.auth.currentUser?.id;
    if (userId == null) {
      throw const NotificationServiceFailure(
        'Please sign in to access notifications.',
      );
    }
    return userId;
  }
}
