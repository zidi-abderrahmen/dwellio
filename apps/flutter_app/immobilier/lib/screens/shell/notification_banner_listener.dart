import 'package:flutter/material.dart';

class NotificationBannerListener extends StatefulWidget {
  const NotificationBannerListener({
    super.key,
    required this.notifications,
    required this.onOpen,
  });

  final Stream<List<Map<String, dynamic>>> notifications;
  final VoidCallback onOpen;

  @override
  State<NotificationBannerListener> createState() =>
      _NotificationBannerListenerState();
}

class _NotificationBannerListenerState
    extends State<NotificationBannerListener> {
  final Set<String> _seenNotificationIds = {};
  bool _hasReceivedInitialSnapshot = false;

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<List<Map<String, dynamic>>>(
      stream: widget.notifications,
      builder: (context, snapshot) {
        if (snapshot.hasData) {
          _handleNotifications(context, snapshot.data!);
        }
        return const SizedBox.shrink();
      },
    );
  }

  void _handleNotifications(
    BuildContext context,
    List<Map<String, dynamic>> notifications,
  ) {
    if (!_hasReceivedInitialSnapshot) {
      _seenNotificationIds.addAll(
        notifications
            .map((notification) => notification['id']?.toString())
            .whereType<String>(),
      );
      _hasReceivedInitialSnapshot = true;
      return;
    }

    final incoming = notifications.where((notification) {
      final id = notification['id']?.toString();
      return id != null && id.isNotEmpty && _seenNotificationIds.add(id);
    }).toList();
    if (incoming.isEmpty) return;

    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      final messenger = ScaffoldMessenger.maybeOf(context);
      if (messenger == null) return;

      for (final notification in incoming) {
        messenger.showSnackBar(_buildSnackBar(messenger, notification));
      }
    });
  }

  SnackBar _buildSnackBar(
    ScaffoldMessengerState messenger,
    Map<String, dynamic> notification,
  ) {
    final title = notification['title']?.toString().trim();
    final body = notification['body']?.toString().trim();
    final preview = body == null || body.isEmpty
        ? 'Open to view details.'
        : body.length > 120
        ? '${body.substring(0, 117)}...'
        : body;
    final onOpen = widget.onOpen;

    return SnackBar(
      duration: const Duration(seconds: 8),
      content: Row(
        children: [
          Expanded(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title == null || title.isEmpty ? 'New notification' : title,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 3),
                Text(preview, maxLines: 2, overflow: TextOverflow.ellipsis),
              ],
            ),
          ),
          IconButton(
            tooltip: 'Dismiss notification',
            onPressed: messenger.hideCurrentSnackBar,
            icon: const Icon(Icons.close),
          ),
        ],
      ),
      action: SnackBarAction(label: 'Open', onPressed: onOpen),
    );
  }
}
