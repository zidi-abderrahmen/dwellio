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
    setState(() {
      _loading = true;
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
      setState(() => _error = error.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Widget _buildEmptyState() {
    return const Center(
      child: Padding(
        padding: EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              Icons.chat_bubble_outline,
              size: 48,
              color: AppColors.placeholder,
            ),
            SizedBox(height: 12),
            Text(
              'No conversations yet.',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w600,
                color: AppColors.onSurface,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildErrorState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.error_outline, size: 40, color: AppColors.error),
            const SizedBox(height: 12),
            Text(
              _error ?? 'Unable to load your conversations.',
              textAlign: TextAlign.center,
              style: const TextStyle(color: AppColors.error),
            ),
            const SizedBox(height: 16),
            FilledButton(
              onPressed: _loadConversations,
              child: const Text('Try again'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildConversationTile(ChatConversation conversation, String userId) {
    final otherParticipant = conversation.buyerId == userId
        ? conversation.owner
        : conversation.ownerId == userId
        ? conversation.buyer
        : null;
    final name = otherParticipant?.fullName?.trim();
    final displayName = name == null || name.isEmpty
        ? 'Conversation participant'
        : name;
    final avatarUrl = otherParticipant?.avatarUrl;

    return ListTile(
      leading: CircleAvatar(
        backgroundColor: AppColors.surfaceVariant,
        child: avatarUrl != null && avatarUrl.isNotEmpty
            ? ClipOval(
                child: Image.network(
                  avatarUrl,
                  width: 48,
                  height: 48,
                  fit: BoxFit.cover,
                  errorBuilder: (context, error, stackTrace) => const Icon(
                    Icons.person_outline,
                    color: AppColors.secondary,
                  ),
                ),
              )
            : const Icon(Icons.person_outline, color: AppColors.secondary),
      ),
      title: Text(displayName, maxLines: 1, overflow: TextOverflow.ellipsis),
      subtitle: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            conversation.propertyTitle,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
          const Text('Tap to open conversation'),
        ],
      ),
      isThreeLine: true,
      trailing: const Icon(Icons.chevron_right),
      onTap: () => context.push(AppRoutes.chatLocation(conversation.id)),
    );
  }

  @override
  Widget build(BuildContext context) {
    final userId = ref.watch(sessionProvider)?.user.id;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Chats'),
        backgroundColor: AppColors.background,
        surfaceTintColor: Colors.transparent,
      ),
      body: _loading
          ? const Center(
              child: CircularProgressIndicator(color: AppColors.primary),
            )
          : _error != null
          ? _buildErrorState()
          : _conversations.isEmpty
          ? _buildEmptyState()
          : RefreshIndicator(
              onRefresh: _loadConversations,
              child: ListView.separated(
                physics: const AlwaysScrollableScrollPhysics(),
                itemCount: _conversations.length,
                separatorBuilder: (context, index) =>
                    const Divider(height: 1, indent: 72),
                itemBuilder: (context, index) {
                  final conversation = _conversations[index];
                  return _buildConversationTile(conversation, userId ?? '');
                },
              ),
            ),
    );
  }
}
