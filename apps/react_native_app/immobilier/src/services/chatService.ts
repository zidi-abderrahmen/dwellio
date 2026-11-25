import { supabase } from '../lib/supabase';
import type { ChatWithRelations } from '../types/chat';

export class ChatServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ChatServiceError';
    Object.setPrototypeOf(this, ChatServiceError.prototype);
  }
}

async function getCurrentUserId(): Promise<string> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    throw new ChatServiceError(
      `Failed to verify the current user: ${error.message}`,
    );
  }

  if (!user) {
    throw new ChatServiceError('You must be signed in to continue.');
  }

  return user.id;
}

export const chatService = {
  /** Load the current user's conversations (buyer or owner). */
  async getChatsForCurrentUser(): Promise<ChatWithRelations[]> {
    const userId = await getCurrentUserId();

    const { data, error } = await supabase
      .from('chats')
      .select(
        `
        *,
        properties(title),
        buyer:profiles!chats_buyer_id_fkey(full_name, avatar_url),
        owner:profiles!chats_owner_id_fkey(full_name, avatar_url)
      `,
      )
      .or(`buyer_id.eq.${userId},owner_id.eq.${userId}`)
      .order('last_message_at', { ascending: false });

    if (error) {
      throw new ChatServiceError(
        `Unable to load conversations: ${error.message}`,
      );
    }

    return (data ?? []) as ChatWithRelations[];
  },

  /** Load a single conversation with the current user's access. */
  async getChatById(chatId: string): Promise<ChatWithRelations | null> {
    const { data, error } = await supabase
      .from('chats')
      .select(
        `
        *,
        properties(title),
        buyer:profiles!chats_buyer_id_fkey(full_name, avatar_url),
        owner:profiles!chats_owner_id_fkey(full_name, avatar_url)
      `,
      )
      .eq('id', chatId)
      .maybeSingle();

    if (error) {
      throw new ChatServiceError(
        `Unable to load the conversation: ${error.message}`,
      );
    }

    return (data as ChatWithRelations | null) ?? null;
  },

  /** Open (or create) the buyer↔owner conversation for a property. */
  async getOrCreateChat(propertyId: string, ownerId: string): Promise<string> {
    const userId = await getCurrentUserId();
    const normalizedPropertyId = propertyId.trim();
    const normalizedOwnerId = ownerId.trim();

    if (!normalizedPropertyId) {
      throw new ChatServiceError('A valid property ID is required.');
    }
    if (!normalizedOwnerId) {
      throw new ChatServiceError('A valid owner ID is required.');
    }
    if (normalizedOwnerId === userId) {
      throw new ChatServiceError(
        'You cannot start a conversation with your own listing.',
      );
    }

    const { data: existing, error } = await supabase
      .from('chats')
      .select('id')
      .eq('property_id', normalizedPropertyId)
      .eq('buyer_id', userId)
      .maybeSingle();

    if (error) {
      throw new ChatServiceError(
        `Unable to find the conversation: ${error.message}`,
      );
    }
    if (existing) return existing.id;

    const { data, error: insertError } = await supabase
      .from('chats')
      .insert({
        property_id: normalizedPropertyId,
        buyer_id: userId,
        owner_id: normalizedOwnerId,
      })
      .select('id')
      .single();

    if (insertError) {
      // Concurrent creation race — reuse the existing chat.
      if (insertError.code === '23505') {
        const { data: recovered, error: recoverError } = await supabase
          .from('chats')
          .select('id')
          .eq('property_id', normalizedPropertyId)
          .eq('buyer_id', userId)
          .maybeSingle();

        if (!recoverError && recovered) return recovered.id;
      }
      throw new ChatServiceError(
        `Unable to create the conversation: ${insertError.message}`,
      );
    }

    if (!data) throw new ChatServiceError('The conversation could not be created.');
    return data.id;
  },
};