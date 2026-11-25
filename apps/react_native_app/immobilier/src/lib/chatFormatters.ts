import type { Message } from '../types/chat';

export function formatMessageTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDateLabel(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((today.getTime() - target.getTime()) / 86_400_000);

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays > 1 && diffDays < 7) {
    return date.toLocaleDateString(undefined, { weekday: 'long' });
  }

  return date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: date.getFullYear() === now.getFullYear() ? undefined : 'numeric',
  });
}

export type ChatListItem =
  | { type: 'message'; key: string; message: Message }
  | { type: 'date'; key: string; label: string };

/**
 * Builds the chat list (chronological) with inline date separators.
 * Messages are expected in ascending `created_at` order.
 */
export function buildChatListItems(messages: Message[]): ChatListItem[] {
  const items: ChatListItem[] = [];
  let lastDateLabel = '';

  for (const message of messages) {
    const label = formatDateLabel(message.created_at);
    if (label && label !== lastDateLabel) {
      items.push({ type: 'date', key: `date-${label}`, label });
      lastDateLabel = label;
    }
    items.push({
      type: 'message',
      key: message.tempId ?? message.id,
      message,
    });
  }

  return items;
}