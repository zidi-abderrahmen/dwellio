import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/router.dart';
import '../../core/theme.dart';
import '../../models/chat.dart';
import '../../providers/auth_providers.dart';
import '../../services/chat_service.dart';

class ChatsScreen extends ConsumerStatefulWidget {
  const ChatsScreen({super.key, this.chatService});

  final ChatService? chatService;

  @override
  ConsumerState<ChatsScreen> createState() => _ChatsScreenState();
}

class _ChatsScreenState extends ConsumerState<ChatsScreen> {
  late final ChatService _chatService = widget.chatService ?? ChatService();

  List<ChatConversation> _conversations = const [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadConversations();
  }

  Future<void> _loadConversations() async {
    final showFullLoader = _conversations.isEmpty;
    setState(() {
      if (showFullLoader) _loading = true;
      _error = null;
    });

    try {
      if (ref.read(sessionProvider)?.user.id == null) {
        throw const ChatServiceFailure(
          'Please sign in to view your conversations.',
        );
      }

      final conversations = await _chatService.getConversations();
      if (!mounted) return;
      setState(() => _conversations = conversations);
    } catch (error) {
      debugPrint('Failed to load conversations: $error');
      if (!mounted) return;
      if (_conversations.isEmpty) {
        setState(() => _error = error.toString());
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Could not refresh conversations: $error')),
        );
      }
    } finally {
      if (mounted && showFullLoader) {
        setState(() => _loading = false);
      }
    }
  }

  Widget _buildLoadingState() {
    return const Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          CircularProgressIndicator(color: AppColors.primary),
          SizedBox(height: 14),
          Text('Loading your conversations...'),
        ],
      ),
    );
  }

  Widget _buildEmptyState(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            CircleAvatar(
              radius: 42,
              backgroundColor: AppColors.primary.withValues(alpha: 0.1),
              child: const Icon(
                Icons.forum_outlined,
                size: 38,
                color: AppColors.primary,
              ),
            ),
            const SizedBox(height: 22),
            Text(
              'No conversations yet.',
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.w700,
                color: AppColors.onSurface,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Contact an owner from a property listing to start a conversation.',
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.bodyMedium
                  ?.copyWith(color: AppColors.secondary),
            ),
            const SizedBox(height: 22),
            FilledButton.icon(
              onPressed: () => context.go(AppRoutes.home),
              icon: const Icon(Icons.search),
              label: const Text('Explore properties'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildErrorState() {
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
                Icons.cloud_off_outlined,
                size: 34,
                color: AppColors.error,
              ),
            ),
            const SizedBox(height: 18),
            Text(
              'Chats could not be loaded',
              style: Theme.of(context).textTheme.titleMedium
                  ?.copyWith(fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 8),
            Text(
              _error ?? 'Please check your connection and try again.',
              textAlign: TextAlign.center,
              style: const TextStyle(color: AppColors.secondary),
            ),
            const SizedBox(height: 20),
            OutlinedButton.icon(
              onPressed: _loadConversations,
              icon: const Icon(Icons.refresh),
              label: const Text('Try again'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildListHeader(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(4, 12, 4, 18),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Your conversations',
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.w700,
                    color: AppColors.onSurface,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Property questions and updates',
                  style: Theme.of(context).textTheme.bodyMedium
                      ?.copyWith(color: AppColors.secondary),
                ),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
            decoration: BoxDecoration(
              color: AppColors.primary.withValues(alpha: 0.08),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Text(
              '${_conversations.length}',
              style: const TextStyle(
                color: AppColors.primary,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAvatar(String displayName, String? avatarUrl) {
    final imageUrl = avatarUrl?.trim();
    return CircleAvatar(
      radius: 27,
      backgroundColor: AppColors.primary.withValues(alpha: 0.1),
      child: imageUrl != null && imageUrl.isNotEmpty
          ? ClipOval(
              child: Image.network(
                imageUrl,
                width: 54,
                height: 54,
                fit: BoxFit.cover,
                errorBuilder: (context, error, stackTrace) =>
                    _buildInitials(displayName),
              ),
            )
          : _buildInitials(displayName),
    );
  }

  Widget _buildInitials(String name) {
    final initials = name
        .trim()
        .split(RegExp(r'\s+'))
        .where((part) => part.isNotEmpty)
        .take(2)
        .map((part) => part.substring(0, 1).toUpperCase())
        .join();

    return Text(
      initials.isEmpty ? '?' : initials,
      style: const TextStyle(
        color: AppColors.primary,
        fontWeight: FontWeight.w700,
      ),
    );
  }

  Widget _buildConversationCard(
    BuildContext context,
    ChatConversation conversation,
    String userId,
  ) {
    final otherParticipant = conversation.buyerId == userId
        ? conversation.owner
        : conversation.ownerId == userId
        ? conversation.buyer
        : null;
    final name = otherParticipant?.fullName?.trim();
    final displayName = name == null || name.isEmpty
        ? 'Conversation participant'
        : name;
    final activity = _formatActivityTime(context, conversation.lastMessageAt);

    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Material(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(20),
        child: InkWell(
          borderRadius: BorderRadius.circular(20),
          onTap: () => context.push(AppRoutes.chatLocation(conversation.id)),
          child: Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: AppColors.outlineVariant),
            ),
            child: Row(
              children: [
                _buildAvatar(displayName, otherParticipant?.avatarUrl),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              displayName,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: Theme.of(context).textTheme.titleMedium
                                  ?.copyWith(
                                    fontWeight: FontWeight.w700,
                                    color: AppColors.onSurface,
                                  ),
                            ),
                          ),
                          if (activity.isNotEmpty) ...[
                            const SizedBox(width: 8),
                            Text(
                              activity,
                              style: Theme.of(context).textTheme.labelSmall
                                  ?.copyWith(color: AppColors.placeholder),
                            ),
                          ],
                        ],
                      ),
                      const SizedBox(height: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 9,
                          vertical: 5,
                        ),
                        decoration: BoxDecoration(
                          color: AppColors.surfaceVariant,
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(
                              Icons.home_work_outlined,
                              size: 15,
                              color: AppColors.secondary,
                            ),
                            const SizedBox(width: 6),
                            Flexible(
                              child: Text(
                                conversation.propertyTitle,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: Theme.of(context).textTheme.labelMedium
                                    ?.copyWith(color: AppColors.secondary),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                const Icon(
                  Icons.chevron_right_rounded,
                  color: AppColors.placeholder,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  String _formatActivityTime(BuildContext context, DateTime? timestamp) {
    if (timestamp == null) return '';

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

  @override
  Widget build(BuildContext context) {
    final userId = ref.watch(sessionProvider)?.user.id ?? '';

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Chats'),
        backgroundColor: AppColors.background,
        surfaceTintColor: Colors.transparent,
        actions: [
          IconButton(
            tooltip: 'Refresh conversations',
            onPressed: _loading ? null : _loadConversations,
            icon: const Icon(Icons.refresh),
          ),
          const SizedBox(width: 4),
        ],
      ),
      body: _loading
          ? _buildLoadingState()
          : _error != null
          ? _buildErrorState()
          : _conversations.isEmpty
          ? _buildEmptyState(context)
          : RefreshIndicator(
              onRefresh: _loadConversations,
              child: ListView.builder(
                padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
                physics: const AlwaysScrollableScrollPhysics(),
                itemCount: _conversations.length + 1,
                itemBuilder: (context, index) {
                  if (index == 0) return _buildListHeader(context);
                  return _buildConversationCard(
                    context,
                    _conversations[index - 1],
                    userId,
                  );
                },
              ),
            ),
    );
  }
}
