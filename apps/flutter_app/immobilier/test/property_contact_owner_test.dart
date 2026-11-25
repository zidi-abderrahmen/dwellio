import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:immobilier/models/chat.dart';
import 'package:immobilier/models/property_models.dart';
import 'package:immobilier/providers/auth_providers.dart';
import 'package:immobilier/providers/favorite_providers.dart';
import 'package:immobilier/screens/chat/chat_screen.dart';
import 'package:immobilier/screens/property/property_details_screen.dart';
import 'package:immobilier/services/chat_service.dart';
import 'package:immobilier/services/favorite_service.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

void main() {
  testWidgets('contacting the owner opens the returned chat', (tester) async {
    final chatService = _FakeChatService();
    await _pumpDetails(tester, userId: 'buyer', chatService: chatService);

    await tester.tap(find.text('Contact Owner'));
    await tester.pumpAndSettle();

    expect(chatService.propertyId, 'property-1');
    expect(chatService.ownerId, 'owner');
    expect(find.byType(ChatScreen), findsOneWidget);
    expect(find.text('Conversation ID: chat-1'), findsOneWidget);
  });

  testWidgets('hides contact action for the property owner', (tester) async {
    final chatService = _FakeChatService();
    await _pumpDetails(tester, userId: 'owner', chatService: chatService);

    expect(find.text('Contact Owner'), findsNothing);
    expect(chatService.callCount, 0);
  });

  testWidgets('shows a loading indicator while opening the chat', (
    tester,
  ) async {
    final completer = Completer<String>();
    final chatService = _FakeChatService(result: completer.future);
    await _pumpDetails(tester, userId: 'buyer', chatService: chatService);

    await tester.tap(find.text('Contact Owner'));
    await tester.pump();

    expect(find.text('Opening chat...'), findsOneWidget);
    expect(find.byType(CircularProgressIndicator), findsOneWidget);

    completer.complete('chat-1');
    await tester.pumpAndSettle();
    expect(find.byType(ChatScreen), findsOneWidget);
  });

  testWidgets('shows an error when creating or retrieving the chat fails', (
    tester,
  ) async {
    final chatService = _FakeChatService(
      error: const ChatServiceFailure('Could not open this conversation.'),
    );
    await _pumpDetails(tester, userId: 'buyer', chatService: chatService);

    await tester.tap(find.text('Contact Owner'));
    await tester.pumpAndSettle();

    expect(find.text('Could not open this conversation.'), findsOneWidget);
    expect(find.byType(ChatScreen), findsNothing);
  });
}

Future<void> _pumpDetails(
  WidgetTester tester, {
  required String userId,
  required ChatService chatService,
}) async {
  tester.view.physicalSize = const Size(800, 1400);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);

  final router = GoRouter(
    initialLocation: '/property/property-1',
    routes: [
      GoRoute(
        path: '/property/:id',
        builder: (context, state) => PropertyDetailsScreen(
          propertyId: state.pathParameters['id']!,
          chatService: chatService,
          loadProperty: (_) async => _property,
        ),
      ),
      GoRoute(
        path: '/chats/:chatId',
        builder: (context, state) =>
            ChatScreen(chatId: state.pathParameters['chatId']!),
      ),
    ],
  );
  addTearDown(router.dispose);

  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        sessionProvider.overrideWithValue(_session(userId)),
        favoriteServiceProvider.overrideWithValue(_FakeFavoriteService()),
      ],
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

final _property = PropertyWithRelations(
  id: 'property-1',
  ownerId: 'owner',
  title: 'Test property',
  listingType: 'sale',
  propertyType: 'apartment',
  price: 100000,
  city: 'Tunis',
  status: 'active',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  propertyImages: const [],
);

class _FakeChatService implements ChatService {
  _FakeChatService({this.error, this.result});

  final Object? error;
  final Future<String>? result;
  String? propertyId;
  String? ownerId;
  int callCount = 0;

  @override
  Future<String> getOrCreateChat(String propertyId, String ownerId) async {
    callCount++;
    this.propertyId = propertyId;
    this.ownerId = ownerId;
    if (error != null) throw error!;
    return await (result ?? Future.value('chat-1'));
  }

  @override
  Future<List<ChatConversation>> getConversations() async => [];
}

class _FakeFavoriteService implements FavoriteService {
  @override
  Future<Set<String>> getFavoritePropertyIds() async => {};

  @override
  Future<List<PropertyWithRelations>> getFavoriteProperties() async => [];

  @override
  Future<void> addFavorite(String propertyId) async {}

  @override
  Future<void> removeFavorite(String propertyId) async {}
}
