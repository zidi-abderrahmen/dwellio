import { supabase } from '../lib/supabase';
import type { Message } from '../types/chat';

export class MessageServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MessageServiceError';
    Object.setPrototypeOf(this, MessageServiceError.prototype);
  }
}

export interface GetMessagesOptions {
  limit?: number;
  /** Return messages strictly older than this ISO timestamp. */
  beforeIso?: string;
}

export const messageService = {
  /** Load the latest messages, returned in chronological (ascending) order. */
  async getMessages(
    chatId: string,
    { limit = 50, beforeIso }: GetMessagesOptions = {},
  ): Promise<Message[]> {
    let query = supabase
      .from('messages')
      .select('*')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (beforeIso) {
      query = query.lt('created_at', beforeIso);
    }

    const { data, error } = await query;

    if (error) {
      throw new MessageServiceError(`Unable to load messages: ${error.message}`);
    }

    return ((data ?? []) as Message[]).reverse();
  },

  async sendMessage(
    chatId: string,
    senderId: string,
    content: string,
  ): Promise<Message> {
    const trimmed = content.trim();
    if (!trimmed) {
      throw new MessageServiceError('Message cannot be empty.');
    }

    const { data, error } = await supabase
      .from('messages')
      .insert({
        chat_id: chatId,
        sender_id: senderId,
        content: trimmed,
      })
      .select('*')
      .single();

    if (error) {
      throw new MessageServiceError(`Unable to send: ${error.message}`);
    }

    return data as Message;
  },

  /** Marks every message NOT sent by `currentUserId` as read. */
  async markMessagesAsRead(
    chatId: string,
    currentUserId: string,
  ): Promise<void> {
    const { error } = await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('chat_id', chatId)
      .neq('sender_id', currentUserId)
      .eq('is_read', false);

    if (error) {
      console.error('Failed to mark messages as read:', error);
    }
  },
};