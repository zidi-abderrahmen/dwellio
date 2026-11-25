import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:immobilier/models/chat.dart';
import 'package:immobilier/providers/auth_providers.dart';
import 'package:immobilier/screens/chat/chat_screen.dart';
import 'package:immobilier/services/chat_service.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

void main() {
  testWidgets(
    'opening a conversation from property details keeps one shell navigator',
    (tester) async {
      final chatService = _FakeChatService();
      final router = GoRouter(
        initialLocation: '/property/property-1',
        routes: [
          GoRoute(
            path: '/property/:id',
            builder: (context, state) => Scaffold(
              body: TextButton(
                onPressed: () => context.push('/chats/chat-1'),
                child: const Text('Contact Owner'),
              ),
            ),
          ),
          GoRoute(
            path: '/chats/:chatId',
            builder: (context, state) => ChatScreen(
              chatId: state.pathParameters['chatId']!,
              chatService: chatService,
            ),
          ),
          StatefulShellRoute.indexedStack(
            builder: (context, state, navigationShell) =>
                Scaffold(body: navigationShell),
            branches: [
              StatefulShellBranch(
                routes: [
                  GoRoute(
                    path: '/home',
                    builder: (context, state) =>
                        const Scaffold(body: Text('Home')),
                  ),
                ],
              ),
              StatefulShellBranch(
                routes: [
                  GoRoute(
                    path: '/chats',
                    builder: (context, state) =>
                        const Scaffold(body: Text('Chats')),
                  ),
                ],
              ),
            ],
          ),
        ],
      );
      addTearDown(router.dispose);

      await tester.pumpWidget(
        ProviderScope(
          overrides: [sessionProvider.overrideWithValue(_session)],
          child: MaterialApp.router(routerConfig: router),
        ),
      );
      await tester.pumpAndSettle();
      await tester.tap(find.text('Contact Owner'));
      await tester.pumpAndSettle();

      expect(find.text('Start the conversation'), findsOneWidget);

      router.pop();
      await tester.pumpAndSettle();

      expect(find.text('Contact Owner'), findsOneWidget);
    },
  );
}

final _session = Session(
  accessToken: 'test-token',
  tokenType: 'bearer',
  user: User(
    id: 'buyer',
    appMetadata: const {},
    userMetadata: const {},
    aud: 'authenticated',
    createdAt: '2026-01-01T00:00:00Z',
  ),
);

class _FakeChatService implements ChatService {
  @override
  Future<String> getOrCreateChat(String propertyId, String ownerId) async =>
      'chat-1';

  @override
  Future<List<ChatConversation>> getConversations() async => [];

  @override
  Future<void> sendMessage(String chatId, String content) async {}

  @override
  Future<void> markReceivedMessagesAsRead(String chatId) async {}

  @override
  Stream<List<Map<String, dynamic>>> getMessages(String chatId) =>
      Stream.value(const []);
}
