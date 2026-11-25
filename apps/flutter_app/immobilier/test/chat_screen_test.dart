import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:immobilier/models/chat.dart';
import 'package:immobilier/providers/auth_providers.dart';
import 'package:immobilier/screens/chat/chat_screen.dart';
import 'package:immobilier/services/chat_service.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

void main() {
  testWidgets('shows ordered messages and updates when the stream emits', (
    tester,
  ) async {
    final controller = StreamController<List<Map<String, dynamic>>>();
    addTearDown(controller.close);
    await _pumpChat(tester, stream: controller.stream);

    expect(find.text('Loading conversation...'), findsOneWidget);

    controller.add([
      _message(
        id: 'message-2',
        senderId: 'owner',
        content: 'Received',
        createdAt: '2026-01-01T08:31:00Z',
      ),
      _message(
        id: 'message-1',
        senderId: 'buyer',
        content: 'Sent by me',
        createdAt: '2026-01-01T08:30:00Z',
      ),
    ]);
    await tester.pump();

    expect(find.text('Sent by me'), findsOneWidget);
    expect(find.text('Received'), findsOneWidget);
    expect(
      find.byWidgetPredicate(
        (widget) =>
            widget is Text &&
            widget.style?.fontSize == 11 &&
            RegExp(r'^\d{1,2}:\d{2}').hasMatch(widget.data ?? ''),
      ),
      findsNWidgets(2),
    );
    expect(
      tester.getTopLeft(find.text('Sent by me')).dy,
      lessThan(tester.getTopLeft(find.text('Received')).dy),
    );

    final sentAlign = tester.widget<Align>(
      find
          .ancestor(of: find.text('Sent by me'), matching: find.byType(Align))
          .last,
    );
    final receivedAlign = tester.widget<Align>(
      find
          .ancestor(of: find.text('Received'), matching: find.byType(Align))
          .last,
    );
    expect(sentAlign.alignment, Alignment.centerRight);
    expect(receivedAlign.alignment, Alignment.centerLeft);

    controller.add([
      _message(
        id: 'message-3',
        senderId: 'owner',
        content: 'Arrived live',
        createdAt: '2026-01-01T08:32:00Z',
      ),
      _message(
        id: 'message-2',
        senderId: 'owner',
        content: 'Received',
        createdAt: '2026-01-01T08:31:00Z',
      ),
      _message(
        id: 'message-1',
        senderId: 'buyer',
        content: 'Sent by me',
        createdAt: '2026-01-01T08:30:00Z',
      ),
    ]);
    await tester.pump();

    expect(find.text('Arrived live'), findsOneWidget);
  });

  testWidgets('shows an empty state when the stream has no messages', (
    tester,
  ) async {
    await _pumpChat(tester, stream: Stream.value(const []));
    await tester.pumpAndSettle();

    expect(find.text('Start the conversation'), findsOneWidget);
  });

  testWidgets('shows a readable error when the stream fails', (tester) async {
    await _pumpChat(
      tester,
      stream: Stream.error(Exception('connection failed')),
    );
    await tester.pumpAndSettle();

    expect(find.text('Unable to load messages.'), findsOneWidget);
    expect(find.textContaining('connection failed'), findsOneWidget);
  });

  testWidgets(
    'trims sent content, ignores empty input, and clears on success',
    (tester) async {
      final service = _FakeChatService(Stream.value(const []));
      await _pumpChat(
        tester,
        stream: Stream.value(const []),
        chatService: service,
      );

      await tester.enterText(find.byType(TextField), '   ');
      await tester.pump();
      expect(_sendButton(tester).onPressed, isNull);
      expect(service.sendCount, 0);

      await tester.enterText(find.byType(TextField), '  Hello there  ');
      await tester.pump();
      await tester.tap(find.text('Send'));
      await tester.pumpAndSettle();

      expect(service.sentChatId, 'chat-1');
      expect(service.sentContent, 'Hello there');
      expect(
        tester.widget<TextField>(find.byType(TextField)).controller!.text,
        '',
      );
      expect(find.text('Hello there'), findsNothing);
    },
  );

  testWidgets('blocks duplicate sends while the insert is pending', (
    tester,
  ) async {
    final sendCompleter = Completer<void>();
    final service = _FakeChatService(
      Stream.value(const []),
      onSend: (_, _) => sendCompleter.future,
    );
    await _pumpChat(
      tester,
      stream: Stream.value(const []),
      chatService: service,
    );

    await tester.enterText(find.byType(TextField), 'One message');
    await tester.pump();
    await tester.tap(find.text('Send'));
    await tester.pump();
    await tester.tap(find.byType(FilledButton));
    await tester.pump();

    expect(service.sendCount, 1);
    expect(tester.widget<TextField>(find.byType(TextField)).enabled, isFalse);

    sendCompleter.complete();
    await tester.pumpAndSettle();
    expect(
      tester.widget<TextField>(find.byType(TextField)).controller!.text,
      '',
    );
  });

  testWidgets('shows an insert error and keeps the message for retry', (
    tester,
  ) async {
    final service = _FakeChatService(
      Stream.value(const []),
      onSend: (_, _) async => throw const ChatServiceFailure('Please retry.'),
    );
    await _pumpChat(
      tester,
      stream: Stream.value(const []),
      chatService: service,
    );

    await tester.enterText(find.byType(TextField), 'Keep this message');
    await tester.pump();
    await tester.tap(find.text('Send'));
    await tester.pumpAndSettle();

    expect(find.text('Please retry.'), findsOneWidget);
    expect(
      tester.widget<TextField>(find.byType(TextField)).controller!.text,
      'Keep this message',
    );
  });

  testWidgets('marks received messages read on open and reports failures', (
    tester,
  ) async {
    var attempts = 0;
    final service = _FakeChatService(
      Stream.value(const []),
      onMarkRead: (chatId) async {
        attempts++;
        if (attempts == 1) {
          throw const ChatServiceFailure('Permission denied.');
        }
      },
    );
    await _pumpChat(
      tester,
      stream: Stream.value(const []),
      chatService: service,
    );
    await tester.pumpAndSettle();

    expect(service.markedChatId, 'chat-1');
    expect(service.markReadCount, 1);
    expect(
      find.text('Unable to update read status: Permission denied.'),
      findsOneWidget,
    );

    await tester.tap(find.byTooltip('Retry'));
    await tester.pumpAndSettle();

    expect(service.markReadCount, 2);
    expect(find.textContaining('Unable to update read status'), findsNothing);
  });

  testWidgets('reuses, replaces, and cancels the message stream', (
    tester,
  ) async {
    var firstStreamCancelled = false;
    var secondStreamCancelled = false;
    final firstController = StreamController<List<Map<String, dynamic>>>(
      onCancel: () => firstStreamCancelled = true,
    );
    final secondController = StreamController<List<Map<String, dynamic>>>(
      onCancel: () => secondStreamCancelled = true,
    );
    addTearDown(firstController.close);
    addTearDown(secondController.close);

    final firstService = _FakeChatService(firstController.stream);
    await _pumpChat(
      tester,
      stream: firstController.stream,
      chatService: firstService,
      key: const ValueKey('chat-room'),
    );
    expect(firstService.requestedChatIds, ['chat-1']);

    await tester.enterText(find.byType(TextField), 'Draft');
    await tester.pump();
    expect(firstService.requestedChatIds, ['chat-1']);

    final secondService = _FakeChatService(secondController.stream);
    await tester.pumpWidget(
      ProviderScope(
        overrides: [sessionProvider.overrideWithValue(_session)],
        child: MaterialApp(
          home: ChatScreen(
            key: const ValueKey('chat-room'),
            chatId: 'chat-2',
            chatService: secondService,
          ),
        ),
      ),
    );
    await tester.pump();

    expect(secondService.requestedChatIds, ['chat-2']);
    expect(firstStreamCancelled, isTrue);

    await tester.pumpWidget(const SizedBox.shrink());
    await tester.pump();
    expect(secondStreamCancelled, isTrue);
    expect(tester.takeException(), isNull);
  });

  testWidgets('limits the message input to 2000 characters', (tester) async {
    await _pumpChat(tester, stream: Stream.value(const []));

    await tester.enterText(find.byType(TextField), 'x' * 2001);
    await tester.pump();

    expect(
      tester.widget<TextField>(find.byType(TextField)).controller!.text.length,
      lessThanOrEqualTo(2000),
    );
  });

  testWidgets('scrolls to the latest message when a new one arrives', (
    tester,
  ) async {
    final controller = StreamController<List<Map<String, dynamic>>>();
    addTearDown(controller.close);
    await _pumpChat(
      tester,
      stream: controller.stream,
      physicalSize: const Size(400, 320),
    );

    final messages = List.generate(
      20,
      (index) => _message(
        id: 'message-$index',
        senderId: 'owner',
        content: 'Message $index',
        createdAt: '2026-01-01T08:30:00Z',
      ),
    );
    controller.add(messages);
    await tester.pump();
    await tester.pumpAndSettle();

    final scrollable = _messageListScrollable(tester);
    expect(scrollable.position.pixels, closeTo(0, 1));

    await tester.drag(find.byType(ListView), const Offset(0, 1000));
    await tester.pumpAndSettle();
    expect(scrollable.position.pixels, greaterThan(0));

    controller.add([
      ...messages,
      _message(
        id: 'message-20',
        senderId: 'owner',
        content: 'Newest message',
        createdAt: '2026-01-01T08:31:00Z',
      ),
    ]);
    await tester.pump();
    await tester.pumpAndSettle();

    expect(scrollable.position.pixels, closeTo(0, 1));
    expect(find.text('Newest message'), findsOneWidget);
  });

  testWidgets('scrolls to the latest message after a successful send', (
    tester,
  ) async {
    final messages = List.generate(
      20,
      (index) => _message(
        id: 'message-$index',
        senderId: 'owner',
        content: 'Message $index',
        createdAt: '2026-01-01T08:30:00Z',
      ),
    );
    final service = _FakeChatService(Stream.value(messages));
    await _pumpChat(
      tester,
      stream: Stream.value(messages),
      chatService: service,
      physicalSize: const Size(400, 320),
    );
    await tester.pumpAndSettle();

    final scrollable = _messageListScrollable(tester);
    await tester.drag(find.byType(ListView), const Offset(0, 1000));
    await tester.pumpAndSettle();
    expect(scrollable.position.pixels, greaterThan(0));

    await tester.enterText(find.byType(TextField), 'My new message');
    await tester.pump();
    await tester.tap(find.text('Send'));
    await tester.pumpAndSettle();

    expect(scrollable.position.pixels, closeTo(0, 1));
    expect(find.text('My new message'), findsNothing);
  });
}

Future<void> _pumpChat(
  WidgetTester tester, {
  required Stream<List<Map<String, dynamic>>> stream,
  ChatService? chatService,
  Size physicalSize = const Size(800, 900),
  Key? key,
}) async {
  tester.view.physicalSize = physicalSize;
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);

  await tester.pumpWidget(
    ProviderScope(
      overrides: [sessionProvider.overrideWithValue(_session)],
      child: MaterialApp(
        home: ChatScreen(
          key: key,
          chatId: 'chat-1',
          chatService: chatService ?? _FakeChatService(stream),
        ),
      ),
    ),
  );
  await tester.pump();
}

FilledButton _sendButton(WidgetTester tester) =>
    tester.widget<FilledButton>(find.widgetWithText(FilledButton, 'Send'));

ScrollableState _messageListScrollable(WidgetTester tester) =>
    tester.state<ScrollableState>(
      find.descendant(
        of: find.byType(ListView),
        matching: find.byType(Scrollable),
      ),
    );

Map<String, dynamic> _message({
  required String id,
  required String senderId,
  required String content,
  required String createdAt,
}) {
  return {
    'id': id,
    'chat_id': 'chat-1',
    'sender_id': senderId,
    'content': content,
    'is_read': false,
    'created_at': createdAt,
  };
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
  _FakeChatService(this.messages, {this.onSend, this.onMarkRead});

  final Stream<List<Map<String, dynamic>>> messages;
  final Future<void> Function(String chatId, String content)? onSend;
  final Future<void> Function(String chatId)? onMarkRead;
  int sendCount = 0;
  int markReadCount = 0;
  String? sentChatId;
  String? sentContent;
  String? markedChatId;
  final List<String> requestedChatIds = [];

  @override
  Future<String> getOrCreateChat(String propertyId, String ownerId) async =>
      'chat-1';

  @override
  Future<void> sendMessage(String chatId, String content) async {
    sendCount++;
    sentChatId = chatId;
    sentContent = content;
    final callback = onSend;
    if (callback != null) await callback(chatId, content);
  }

  @override
  Future<void> markReceivedMessagesAsRead(String chatId) async {
    markReadCount++;
    markedChatId = chatId;
    final callback = onMarkRead;
    if (callback != null) await callback(chatId);
  }

  @override
  Future<List<ChatConversation>> getConversations() async => [];

  @override
  Stream<List<Map<String, dynamic>>> getMessages(String chatId) {
    requestedChatIds.add(chatId);
    return messages;
  }
}
