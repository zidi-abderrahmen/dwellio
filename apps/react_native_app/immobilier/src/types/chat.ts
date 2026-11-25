export interface Chat {
  id: string;
  property_id: string;
  buyer_id: string;
  owner_id: string;
  last_message_at: string;
  created_at: string;
}

export interface ChatParticipant {
  full_name: string | null;
  avatar_url: string | null;
}

export type MessageStatus = 'sending' | 'sent' | 'failed';

export interface Message {
  id: string;
  chat_id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
  /** Client-only status for optimistic sends. */
  status?: MessageStatus;
  /** Stable key for optimistic messages before the server assigns an id. */
  tempId?: string;
}

export interface ChatPropertyPreview {
  title: string;
}

export interface ChatWithRelations extends Chat {
  properties: ChatPropertyPreview | null;
  buyer: ChatParticipant | null;
  owner: ChatParticipant | null;
  /** Latest message in the conversation, if any. */
  last_message: Message | null;
  /** Unread messages for the current user, computed at fetch time. */
  unread_count: number;
}

export function getCounterpart(
  chat: ChatWithRelations,
  currentUserId: string,
): ChatParticipant | null {
  return currentUserId === chat.buyer_id ? chat.owner : chat.buyer;
}

/** Stable key for FlatList keys across optimistic ↔ persisted transitions. */
export function getMessageKey(message: Message): string {
  return message.tempId ?? message.id;
}