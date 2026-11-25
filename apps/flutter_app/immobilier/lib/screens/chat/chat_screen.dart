import 'package:flutter/material.dart';

import '../../core/theme.dart';

class ChatScreen extends StatelessWidget {
  const ChatScreen({super.key, required this.chatId});

  final String chatId;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Conversation'),
        backgroundColor: AppColors.background,
        surfaceTintColor: Colors.transparent,
      ),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(
                Icons.chat_bubble_outline,
                size: 40,
                color: AppColors.primary,
              ),
              const SizedBox(height: 12),
              Text(
                'Messaging will be available here soon.',
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.titleMedium,
              ),
              const SizedBox(height: 8),
              SelectableText(
                'Conversation ID: $chatId',
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.bodySmall,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
