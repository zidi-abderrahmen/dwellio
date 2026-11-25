import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../providers/auth_providers.dart';
import '../../providers/notification_providers.dart';

class NotificationBell extends ConsumerWidget {
  const NotificationBell({super.key, required this.onPressed});

  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final userId = ref.watch(sessionProvider)?.user.id;
    final feed = userId == null
        ? null
        : ref.watch(notificationFeedProvider(userId));

    return IconButton(
      tooltip: 'Notifications',
      onPressed: onPressed,
      icon: feed == null
          ? const Icon(Icons.notifications_none_rounded)
          : ValueListenableBuilder<int>(
              valueListenable: feed.unreadCount,
              builder: (context, count, child) {
                return Badge(
                  isLabelVisible: count > 0,
                  label: Text('$count'),
                  child: child,
                );
              },
              child: const Icon(Icons.notifications_none_rounded),
            ),
    );
  }
}
