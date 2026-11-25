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

export interface ChatPropertyPreview {
  title: string;
}

export interface ChatWithRelations extends Chat {
  properties: ChatPropertyPreview | null;
  buyer: ChatParticipant | null;
  owner: ChatParticipant | null;
}

/** Convenience: the participant the current user is chatting with. */
export function getCounterpart(
  chat: ChatWithRelations,
  currentUserId: string,
): ChatParticipant | null {
  return currentUserId === chat.buyer_id ? chat.owner : chat.buyer;
}