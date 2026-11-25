import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/app_routes.dart';
import '../../core/theme.dart';
import '../../models/app_notification.dart';
import '../../providers/auth_providers.dart';
import '../../providers/notification_providers.dart';

final _uuidPattern = RegExp(
  r'^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$',
);

class NotificationsScreen extends ConsumerStatefulWidget {
  const NotificationsScreen({super.key});

  @override
  ConsumerState<NotificationsScreen> createState() =>
      _NotificationsScreenState();
}

class _NotificationsScreenState extends ConsumerState<NotificationsScreen> {
  final Set<String> _openingNotificationIds = {};

  @override
  Widget build(BuildContext context) {
    final userId = ref.watch(sessionProvider)?.user.id;
    final feedProvider = userId == null
        ? null
        : notificationFeedProvider(userId);
    final feed = feedProvider == null ? null : ref.watch(feedProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Notifications'),
        backgroundColor: AppColors.background,
        surfaceTintColor: Colors.transparent,
      ),
      body: feed == null
          ? _buildErrorState(
              context,
              'Please sign in to view your notifications.',
              null,
            )
          : StreamBuilder<List<Map<String, dynamic>>>(
              stream: feed.stream,
              builder: (context, snapshot) {
                if (snapshot.hasError) {
                  return _buildErrorState(
                    context,
                    snapshot.error!,
                    () => ref.invalidate(feedProvider!),
                  );
                }
                if (!snapshot.hasData) return _buildLoadingState();

                final notifications =
                    snapshot.data!.map(AppNotification.fromJson).toList()
                      ..sort((first, second) {
                        return second.createdAt.compareTo(first.createdAt);
                      });
                if (notifications.isEmpty) return _buildEmptyState(context);

                return ListView.builder(
                  padding: const EdgeInsets.fromLTRB(20, 16, 20, 28),
                  itemCount: notifications.length + 1,
                  itemBuilder: (context, index) {
                    if (index == 0) {
                      return _buildListHeader(context, notifications.length);
                    }
                    return _buildNotificationCard(
                      context,
                      notifications[index - 1],
                      feed,
                    );
                  },
                );
              },
            ),
    );
  }

  Widget _buildListHeader(BuildContext context, int count) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(4, 4, 4, 18),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Recent activity',
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.w700,
                    color: AppColors.onSurface,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  '$count ${count == 1 ? 'notification' : 'notifications'}',
                  style: Theme.of(context).textTheme.bodyMedium
                      ?.copyWith(color: AppColors.secondary),
                ),
              ],
            ),
          ),
          const Icon(
            Icons.notifications_active_outlined,
            color: AppColors.primary,
          ),
        ],
      ),
    );
  }

  Widget _buildNotificationCard(
    BuildContext context,
    AppNotification notification,
    NotificationFeed feed,
  ) {
    final unread = !notification.isRead;
    final opening = _openingNotificationIds.contains(notification.id);
    final icon = switch (notification.type) {
      'new_message' => Icons.chat_bubble_outline_rounded,
      'favorite_added' => Icons.favorite_border_rounded,
      _ => Icons.notifications_none_rounded,
    };
    final iconColor = switch (notification.type) {
      'new_message' => AppColors.primary,
      'favorite_added' => AppColors.favorite,
      _ => AppColors.secondary,
    };

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      child: Material(
        color: unread
            ? AppColors.primary.withValues(alpha: 0.055)
            : AppColors.surface,
        borderRadius: BorderRadius.circular(20),
        child: InkWell(
          borderRadius: BorderRadius.circular(20),
          onTap: opening ? null : () => _openNotification(notification, feed),
          child: Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(20),
              border: Border.all(
                color: unread
                    ? AppColors.primary.withValues(alpha: 0.2)
                    : AppColors.outlineVariant,
              ),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                CircleAvatar(
                  radius: 23,
                  backgroundColor: iconColor.withValues(alpha: 0.1),
                  child: Icon(icon, color: iconColor, size: 22),
                ),
                const SizedBox(width: 13),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Expanded(
                            child: Text(
                              notification.title,
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                              style: Theme.of(context).textTheme.titleSmall
                                  ?.copyWith(
                                    fontWeight: unread
                                        ? FontWeight.w700
                                        : FontWeight.w500,
                                    color: AppColors.onSurface,
                                  ),
                            ),
                          ),
                          if (opening) ...[
                            const SizedBox(width: 8),
                            const SizedBox(
                              width: 16,
                              height: 16,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                color: AppColors.primary,
                              ),
                            ),
                          ] else if (unread) ...[
                            const SizedBox(width: 8),
                            Container(
                              width: 9,
                              height: 9,
                              margin: const EdgeInsets.only(top: 5),
                              decoration: const BoxDecoration(
                                color: AppColors.primary,
                                shape: BoxShape.circle,
                              ),
                            ),
                          ],
                        ],
                      ),
                      if (notification.body != null &&
                          notification.body!.trim().isNotEmpty) ...[
                        const SizedBox(height: 5),
                        Text(
                          notification.body!,
                          maxLines: 3,
                          overflow: TextOverflow.ellipsis,
                          style: Theme.of(context).textTheme.bodyMedium
                              ?.copyWith(
                                color: AppColors.secondary,
                                height: 1.35,
                              ),
                        ),
                      ],
                      const SizedBox(height: 8),
                      Text(
                        _formatCreatedAt(context, notification.createdAt),
                        style: Theme.of(context).textTheme.labelSmall
                            ?.copyWith(color: AppColors.placeholder),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Future<void> _openNotification(
    AppNotification notification,
    NotificationFeed feed,
  ) async {
    final destination = _notificationDestination(notification);
    if (destination == null) {
      _showOpenError(
        'This notification is missing valid destination information.',
      );
      return;
    }
    if (!_openingNotificationIds.add(notification.id)) return;

    setState(() {});
    try {
      await ref.read(notificationServiceProvider).markAsRead(notification.id);
      if (!mounted) return;

      feed.markAsReadLocally(notification.id);
      context.push(destination);
    } catch (error) {
      if (!mounted) return;
      _showOpenError('Unable to mark this notification as read: $error');
    } finally {
      if (mounted) {
        setState(() => _openingNotificationIds.remove(notification.id));
      }
    }
  }

  String? _notificationDestination(AppNotification notification) {
    switch (notification.type) {
      case 'new_message':
        final chatId = _validUuid(notification.data['chat_id']);
        return chatId == null ? null : AppRoutes.chatLocation(chatId);
      case 'favorite_added':
        final propertyId = _validUuid(notification.data['property_id']);
        return propertyId == null
            ? null
            : AppRoutes.propertyDetailsLocation(propertyId);
      default:
        return null;
    }
  }

  String? _validUuid(dynamic value) {
    if (value is! String) return null;
    final id = value.trim();
    return _uuidPattern.hasMatch(id) ? id : null;
  }

  void _showOpenError(String message) {
    ScaffoldMessenger.of(context)
        .showSnackBar(SnackBar(content: Text(message)));
  }

  String _formatCreatedAt(BuildContext context, DateTime timestamp) {
    final localTime = timestamp.toLocal();
    final now = DateTime.now();
    if (localTime.year == now.year &&
        localTime.month == now.month &&
        localTime.day == now.day) {
      return MaterialLocalizations.of(context)
          .formatTimeOfDay(TimeOfDay.fromDateTime(localTime));
    }
    return MaterialLocalizations.of(context).formatShortDate(localTime);
  }

  Widget _buildLoadingState() {
    return const Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          CircularProgressIndicator(color: AppColors.primary),
          SizedBox(height: 14),
          Text('Loading notifications...'),
        ],
      ),
    );
  }

  Widget _buildErrorState(
    BuildContext context,
    Object error,
    VoidCallback? onRetry,
  ) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(28),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            CircleAvatar(
              radius: 36,
              backgroundColor: AppColors.error.withValues(alpha: 0.08),
              child: const Icon(
                Icons.notifications_off_outlined,
                size: 34,
                color: AppColors.error,
              ),
            ),
            const SizedBox(height: 18),
            Text(
              'Notifications could not be loaded',
              style: Theme.of(context).textTheme.titleMedium
                  ?.copyWith(fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 8),
            Text(
              error.toString(),
              textAlign: TextAlign.center,
              style: const TextStyle(color: AppColors.secondary),
            ),
            const SizedBox(height: 20),
            if (onRetry != null)
              OutlinedButton.icon(
                onPressed: onRetry,
                icon: const Icon(Icons.refresh),
                label: const Text('Try again'),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildEmptyState(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(28),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            CircleAvatar(
              radius: 42,
              backgroundColor: AppColors.primary.withValues(alpha: 0.1),
              child: const Icon(
                Icons.notifications_none_rounded,
                size: 38,
                color: AppColors.primary,
              ),
            ),
            const SizedBox(height: 20),
            Text(
              'No notifications yet.',
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.w700,
                color: AppColors.onSurface,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Updates about messages and saved properties will show up here.',
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.bodyMedium
                  ?.copyWith(color: AppColors.secondary),
            ),
          ],
        ),
      ),
    );
  }
}
