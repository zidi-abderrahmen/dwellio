import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:immobilier/screens/chat/chat_screen.dart';

void main() {
  testWidgets(
    'opening a conversation from property details keeps one shell navigator',
    (tester) async {
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

      await tester.pumpWidget(MaterialApp.router(routerConfig: router));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Contact Owner'));
      await tester.pumpAndSettle();

      expect(find.text('Conversation ID: chat-1'), findsOneWidget);

      router.pop();
      await tester.pumpAndSettle();

      expect(find.text('Contact Owner'), findsOneWidget);
    },
  );
}
