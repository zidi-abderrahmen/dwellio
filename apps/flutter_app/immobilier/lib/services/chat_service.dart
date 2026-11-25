import 'package:supabase_flutter/supabase_flutter.dart';

import '../models/chat.dart';

class ChatServiceFailure implements Exception {
  const ChatServiceFailure(this.message);

  final String message;

  @override
  String toString() => message;
}

/// Handles chat creation and retrieval for the authenticated buyer.
class ChatService {
  ChatService([SupabaseClient? client])
    : _client = client ?? Supabase.instance.client;

  final SupabaseClient _client;

  /// Returns conversations visible to the currently authenticated user.
  Future<List<ChatConversation>> getConversations() async {
    if (_client.auth.currentUser == null) {
      throw const ChatServiceFailure(
        'Please sign in to view your conversations.',
      );
    }

    try {
      final rows = await _client
          .from('chats')
          .select('''
            *,
            properties(title),
            buyer:profiles!chats_buyer_id_fkey(full_name, avatar_url),
            owner:profiles!chats_owner_id_fkey(full_name, avatar_url)
          ''')
          .order('last_message_at', ascending: false);

      return List<Map<String, dynamic>>.from(rows)
          .map(ChatConversation.fromJson)
          .toList();
    } on PostgrestException catch (error) {
      throw ChatServiceFailure(
        'Unable to load your conversations: ${error.message}',
      );
    } catch (error) {
      throw ChatServiceFailure('Unable to load your conversations: $error');
    }
  }

  /// Returns an existing chat for this property and buyer, or creates one.
  Future<String> getOrCreateChat(String propertyId, String ownerId) async {
    final user = _client.auth.currentUser;
    if (user == null) {
      throw const ChatServiceFailure(
        'Please sign in to contact the property owner.',
      );
    }

    final normalizedPropertyId = propertyId.trim();
    final normalizedOwnerId = ownerId.trim();
    if (normalizedPropertyId.isEmpty || normalizedOwnerId.isEmpty) {
      throw const ChatServiceFailure(
        'A valid property and owner are required to start a chat.',
      );
    }
    if (user.id == normalizedOwnerId) {
      throw const ChatServiceFailure(
        'You cannot start a chat with yourself about your property.',
      );
    }

    try {
      final existingChatId = await _getExistingChatId(
        normalizedPropertyId,
        user.id,
      );
      if (existingChatId != null) return existingChatId;

      try {
        final created = await _client
            .from('chats')
            .insert({
              'property_id': normalizedPropertyId,
              'buyer_id': user.id,
              'owner_id': normalizedOwnerId,
            })
            .select('id')
            .single();

        return created['id'] as String;
      } on PostgrestException catch (error) {
        if (error.code != '23505') rethrow;

        final concurrentChatId = await _getExistingChatId(
          normalizedPropertyId,
          user.id,
        );
        if (concurrentChatId != null) return concurrentChatId;

        throw const ChatServiceFailure(
          'A chat was created concurrently but could not be retrieved. Please try again.',
        );
      }
    } on ChatServiceFailure {
      rethrow;
    } on PostgrestException catch (error) {
      throw ChatServiceFailure('Unable to start a chat: ${error.message}');
    } catch (error) {
      throw ChatServiceFailure('Unable to start a chat: $error');
    }
  }

  Future<String?> _getExistingChatId(String propertyId, String buyerId) async {
    final existing = await _client
        .from('chats')
        .select('id')
        .eq('property_id', propertyId)
        .eq('buyer_id', buyerId)
        .maybeSingle();

    return existing?['id'] as String?;
  }
}
