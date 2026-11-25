import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:immobilier/models/chat.dart';
import 'package:immobilier/providers/auth_providers.dart';
import 'package:immobilier/screens/chat/chat_screen.dart';
import 'package:immobilier/screens/chat/chats_screen.dart';
import 'package:immobilier/services/chat_service.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

void main() {
  testWidgets('buyer sees owner and property and opens the chat', (
    tester,
  ) async {
    await _pumpChats(tester, userId: 'buyer', chatService: _FakeChatService());

    expect(find.text('Owner Name'), findsOneWidget);
    expect(find.text('Apartment in Tunis'), findsOneWidget);
    expect(find.text('Buyer Name'), findsNothing);

    await tester.tap(find.text('Owner Name'));
    await tester.pumpAndSettle();
    expect(find.byType(ChatScreen), findsOneWidget);
    expect(find.text('Conversation ID: chat-1'), findsOneWidget);
  });

  testWidgets('owner sees buyer rather than their own name', (tester) async {
    await _pumpChats(tester, userId: 'owner', chatService: _FakeChatService());

    expect(find.text('Buyer Name'), findsOneWidget);
    expect(find.text('Owner Name'), findsNothing);
  });

  testWidgets('shows an empty state when there are no conversations', (
    tester,
  ) async {
    await _pumpChats(
      tester,
      userId: 'buyer',
      chatService: _FakeChatService(conversations: const []),
    );

    expect(find.text('No conversations yet.'), findsOneWidget);
  });

  testWidgets('shows an error and retry action when loading fails', (
    tester,
  ) async {
    await _pumpChats(
      tester,
      userId: 'buyer',
      chatService: _FakeChatService(error: 'Could not load chats.'),
    );

    expect(find.text('Could not load chats.'), findsOneWidget);
    expect(find.text('Try again'), findsOneWidget);
  });
}

Future<void> _pumpChats(
  WidgetTester tester, {
  required String userId,
  required ChatService chatService,
}) async {
  tester.view.physicalSize = const Size(800, 900);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);

  final router = GoRouter(
    initialLocation: '/chats',
    routes: [
      GoRoute(
        path: '/chats',
        builder: (context, state) => ChatsScreen(chatService: chatService),
        routes: [
          GoRoute(
            path: ':chatId',
            builder: (context, state) =>
                ChatScreen(chatId: state.pathParameters['chatId']!),
          ),
        ],
      ),
    ],
  );
  addTearDown(router.dispose);

  await tester.pumpWidget(
    ProviderScope(
      overrides: [sessionProvider.overrideWithValue(_session(userId))],
      child: MaterialApp.router(routerConfig: router),
    ),
  );
  await tester.pumpAndSettle();
}

Session _session(String userId) => Session(
  accessToken: 'test-token',
  tokenType: 'bearer',
  user: User(
    id: userId,
    appMetadata: const {},
    userMetadata: const {},
    aud: 'authenticated',
    createdAt: '2026-01-01T00:00:00Z',
  ),
);

const _conversation = ChatConversation(
  id: 'chat-1',
  propertyId: 'property-1',
  buyerId: 'buyer',
  ownerId: 'owner',
  propertyTitle: 'Apartment in Tunis',
  buyer: ChatParticipant(fullName: 'Buyer Name'),
  owner: ChatParticipant(fullName: 'Owner Name'),
);

class _FakeChatService implements ChatService {
  _FakeChatService({this.conversations = const [_conversation], this.error});

  final List<ChatConversation> conversations;
  final String? error;

  @override
  Future<String> getOrCreateChat(String propertyId, String ownerId) async =>
      'chat-1';

  @override
  Future<List<ChatConversation>> getConversations() async {
    if (error != null) throw ChatServiceFailure(error!);
    return conversations;
  }
}
