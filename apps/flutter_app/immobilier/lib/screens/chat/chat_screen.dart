import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/theme.dart';
import '../../models/chat.dart';
import '../../providers/auth_providers.dart';
import '../../services/chat_service.dart';

class ChatScreen extends ConsumerStatefulWidget {
  const ChatScreen({super.key, required this.chatId, this.chatService});

  final String chatId;
  final ChatService? chatService;

  @override
  ConsumerState<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends ConsumerState<ChatScreen> {
  late ChatService _chatService;
  late Stream<List<Map<String, dynamic>>> _messages;
  final TextEditingController _messageController = TextEditingController();
  final ScrollController _scrollController = ScrollController();

  bool _isSending = false;
  String? _sendError;
  String? _readError;
  String? _latestMessageId;
  int _readRequestId = 0;

  @override
  void initState() {
    super.initState();
    _resetMessageStream();
    _markReceivedMessagesAsRead();
  }

  @override
  void didUpdateWidget(covariant ChatScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.chatId != widget.chatId ||
        oldWidget.chatService != widget.chatService) {
      _resetMessageStream();
      _markReceivedMessagesAsRead();
    }
  }

  void _resetMessageStream() {
    _chatService = widget.chatService ?? ChatService();
    _messages = _chatService.getMessages(widget.chatId);
    _latestMessageId = null;
    _readError = null;
  }

  void _onMessagesChanged(List<ChatMessage> messages) {
    final latestMessageId = messages.isEmpty ? null : messages.last.id;
    if (_latestMessageId == latestMessageId) return;

    _latestMessageId = latestMessageId;
    _scrollToLatest();
  }

  void _scrollToLatest() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted || !_scrollController.hasClients) return;

      _scrollController.animateTo(
        0,
        duration: const Duration(milliseconds: 250),
        curve: Curves.easeOut,
      );
    });
  }

  Future<void> _markReceivedMessagesAsRead() async {
    final requestId = ++_readRequestId;
    final chatId = widget.chatId;

    try {
      await _chatService.markReceivedMessagesAsRead(chatId);
      if (mounted && requestId == _readRequestId && _readError != null) {
        setState(() => _readError = null);
      }
    } catch (error) {
      if (mounted && requestId == _readRequestId) {
        setState(() => _readError = error.toString());
      }
    }
  }

  @override
  void dispose() {
    _messageController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  Future<void> _sendMessage() async {
    if (_isSending) return;

    final message = _messageController.text.trim();
    if (message.isEmpty) return;
    if (message.length > 2000) {
      setState(() => _sendError = 'Message cannot exceed 2000 characters.');
      return;
    }

    setState(() {
      _isSending = true;
      _sendError = null;
    });

    try {
      await _chatService.sendMessage(widget.chatId, message);
      if (!mounted) return;
      _messageController.clear();
      _scrollToLatest();
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _sendError = error.toString();
      });
    } finally {
      if (mounted) {
        setState(() => _isSending = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final currentUserId = ref.watch(sessionProvider)?.user.id;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        toolbarHeight: 68,
        title: Row(
          children: [
            CircleAvatar(
              radius: 19,
              backgroundColor: AppColors.primary.withValues(alpha: 0.1),
              child: const Icon(
                Icons.forum_outlined,
                size: 20,
                color: AppColors.primary,
              ),
            ),
            const SizedBox(width: 12),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  'Conversation',
                  style: Theme.of(context).textTheme.titleMedium
                      ?.copyWith(fontWeight: FontWeight.w700),
                ),
                Text(
                  'Property chat',
                  style: Theme.of(context).textTheme.labelSmall
                      ?.copyWith(color: AppColors.secondary),
                ),
              ],
            ),
          ],
        ),
        backgroundColor: AppColors.background,
        surfaceTintColor: Colors.transparent,
      ),
      body: Column(
        children: [
          if (_readError != null) _buildReadError(),
          Expanded(
            child: StreamBuilder<List<Map<String, dynamic>>>(
              stream: _messages,
              builder: (context, snapshot) {
                if (snapshot.hasError) {
                  return _buildError(snapshot.error!);
                }
                if (!snapshot.hasData) {
                  return _buildLoading();
                }

                final messages =
                    snapshot.data!.map(ChatMessage.fromJson).toList()
                      ..sort((first, second) {
                        return first.createdAt.compareTo(second.createdAt);
                      });
                _onMessagesChanged(messages);
                if (messages.isEmpty) {
                  return _buildEmpty();
                }

                return ListView.builder(
                  controller: _scrollController,
                  reverse: true,
                  padding: const EdgeInsets.all(16),
                  itemCount: messages.length,
                  itemBuilder: (context, index) {
                    final message = messages[messages.length - 1 - index];
                    return _MessageBubble(
                      message: message,
                      isMine: message.senderId == currentUserId,
                    );
                  },
                );
              },
            ),
          ),
          _buildComposer(),
        ],
      ),
    );
  }

  Widget _buildReadError() {
    return Container(
      margin: const EdgeInsets.fromLTRB(12, 8, 12, 0),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
      decoration: BoxDecoration(
        color: AppColors.error.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        children: [
          const Icon(Icons.error_outline, color: AppColors.error),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              'Unable to update read status: $_readError',
              style: const TextStyle(color: AppColors.error),
            ),
          ),
          IconButton(
            tooltip: 'Retry',
            onPressed: _markReceivedMessagesAsRead,
            icon: const Icon(Icons.refresh),
          ),
        ],
      ),
    );
  }

  Widget _buildComposer() {
    final canSend = !_isSending && _messageController.text.trim().isNotEmpty;

    return SafeArea(
      top: false,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(14, 8, 14, 12),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (_sendError != null)
              Padding(
                padding: const EdgeInsets.only(bottom: 8, left: 4, right: 4),
                child: Row(
                  children: [
                    const Icon(
                      Icons.error_outline,
                      size: 16,
                      color: AppColors.error,
                    ),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        _sendError!,
                        style: const TextStyle(color: AppColors.error),
                      ),
                    ),
                  ],
                ),
              ),
            Container(
              padding: const EdgeInsets.fromLTRB(16, 4, 6, 4),
              decoration: BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.circular(28),
                border: Border.all(color: AppColors.outlineVariant),
                boxShadow: const [
                  BoxShadow(
                    color: Color.fromRGBO(0, 0, 0, 0.04),
                    blurRadius: 10,
                    offset: Offset(0, 3),
                  ),
                ],
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Expanded(
                    child: TextField(
                      controller: _messageController,
                      enabled: !_isSending,
                      minLines: 1,
                      maxLines: 4,
                      maxLength: 2000,
                      maxLengthEnforcement: MaxLengthEnforcement.enforced,
                      textInputAction: TextInputAction.send,
                      onChanged: (_) => setState(() => _sendError = null),
                      onSubmitted: (_) => _sendMessage(),
                      decoration: const InputDecoration(
                        hintText: 'Write a message...',
                        counterText: '',
                        border: InputBorder.none,
                        enabledBorder: InputBorder.none,
                        focusedBorder: InputBorder.none,
                        contentPadding: EdgeInsets.symmetric(vertical: 12),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  FilledButton.icon(
                    onPressed: canSend ? _sendMessage : null,
                    style: FilledButton.styleFrom(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 16,
                        vertical: 12,
                      ),
                      shape: const StadiumBorder(),
                    ),
                    icon: _isSending
                        ? const SizedBox.square(
                            dimension: 16,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Icon(Icons.send_rounded, size: 18),
                    label: Text(_isSending ? 'Sending' : 'Send'),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildLoading() {
    return const Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          CircularProgressIndicator(),
          SizedBox(height: 14),
          Text('Loading conversation...'),
        ],
      ),
    );
  }

  Widget _buildError(Object error) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.error_outline, color: AppColors.error, size: 40),
            const SizedBox(height: 12),
            const Text('Unable to load messages.', textAlign: TextAlign.center),
            const SizedBox(height: 8),
            Text(error.toString(), textAlign: TextAlign.center),
          ],
        ),
      ),
    );
  }

  Widget _buildEmpty() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(28),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            CircleAvatar(
              radius: 34,
              backgroundColor: AppColors.primary.withValues(alpha: 0.1),
              child: const Icon(
                Icons.chat_bubble_outline_rounded,
                size: 30,
                color: AppColors.primary,
              ),
            ),
            const SizedBox(height: 16),
            Text(
              'Start the conversation',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w700,
                color: AppColors.onSurface,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              'Send a message to ask about this property.',
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

class _MessageBubble extends StatelessWidget {
  const _MessageBubble({required this.message, required this.isMine});

  final ChatMessage message;
  final bool isMine;

  @override
  Widget build(BuildContext context) {
    final localTime = TimeOfDay.fromDateTime(message.createdAt.toLocal());
    final time = MaterialLocalizations.of(context).formatTimeOfDay(localTime);

    return Align(
      alignment: isMine ? Alignment.centerRight : Alignment.centerLeft,
      child: ConstrainedBox(
        constraints: BoxConstraints(
          maxWidth: MediaQuery.sizeOf(context).width * 0.8,
        ),
        child: Container(
          margin: const EdgeInsets.only(bottom: 10),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 11),
          decoration: BoxDecoration(
            color: isMine ? AppColors.primary : AppColors.surface,
            borderRadius: BorderRadius.only(
              topLeft: const Radius.circular(20),
              topRight: const Radius.circular(20),
              bottomLeft: Radius.circular(isMine ? 20 : 6),
              bottomRight: Radius.circular(isMine ? 6 : 20),
            ),
            border: isMine ? null : Border.all(color: AppColors.outlineVariant),
            boxShadow: const [
              BoxShadow(
                color: Color.fromRGBO(0, 0, 0, 0.035),
                blurRadius: 6,
                offset: Offset(0, 2),
              ),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                message.content,
                style: TextStyle(
                  color: isMine ? AppColors.onPrimary : AppColors.onSurface,
                  height: 1.35,
                ),
              ),
              const SizedBox(height: 5),
              Align(
                alignment: Alignment.centerRight,
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      time,
                      style: TextStyle(
                        color: isMine
                            ? AppColors.onPrimary.withValues(alpha: 0.78)
                            : AppColors.secondary,
                        fontSize: 11,
                      ),
                    ),
                    if (isMine) ...[
                      const SizedBox(width: 4),
                      Icon(
                        message.isRead
                            ? Icons.done_all_rounded
                            : Icons.done_rounded,
                        size: 15,
                        color: AppColors.onPrimary.withValues(
                          alpha: message.isRead ? 1 : 0.72,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
