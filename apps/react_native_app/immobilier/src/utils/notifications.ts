import type { Notification } from '../types/notification';

export type NotificationIconName =
  | 'chatbubble-ellipses-outline'
  | 'heart-outline'
  | 'information-circle-outline';

export interface NotificationSection {
  title: string;
  data: Notification[];
}

export type NotificationRoute =
  | { pathname: '/chat/[id]'; params: { id: string } }
  | { pathname: '/property/[id]'; params: { id: string } };

export function iconForType(type: Notification['type']): NotificationIconName {
  switch (type) {
    case 'new_message':
      return 'chatbubble-ellipses-outline';
    case 'favorite_added':
      return 'heart-outline';
    case 'system':
    default:
      return 'information-circle-outline';
  }
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * Human-friendly time: "Just now", "5m ago", "14:30" (today),
 * "Yesterday · 09:15", "Mon", "Mar 5".
 */
export function formatRelativeTime(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';

  const diffMs = Math.max(0, now.getTime() - date.getTime());
  const diffMinutes = Math.floor(diffMs / 60_000);

  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;

  if (isSameDay(date, now)) {
    return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (isSameDay(date, yesterday)) {
    const time = date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    return `Yesterday · ${time}`;
  }

  const diffDays = Math.floor(diffMs / 86_400_000);
  if (diffDays < 7) {
    return date.toLocaleDateString(undefined, { weekday: 'short' });
  }

  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function getNotificationRoute(
  notification: Notification,
): NotificationRoute | null {
  switch (notification.type) {
    case 'new_message': {
      const chatId = notification.data.chat_id;
      return chatId ? { pathname: '/chat/[id]', params: { id: chatId } } : null;
    }
    case 'favorite_added': {
      const propertyId = notification.data.property_id;
      return propertyId
        ? { pathname: '/property/[id]', params: { id: propertyId } }
        : null;
    }
    default:
      return null;
  }
}

export function groupNotificationsByDate(
  notifications: Notification[],
  now: Date = new Date(),
): NotificationSection[] {
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const weekAgo = new Date(now);
  weekAgo.setDate(now.getDate() - 7);

  const buckets: Record<'Today' | 'Yesterday' | 'This week' | 'Earlier', Notification[]> = {
    Today: [],
    Yesterday: [],
    'This week': [],
    Earlier: [],
  };

  for (const notification of notifications) {
    const date = new Date(notification.created_at);
    if (Number.isNaN(date.getTime())) {
      buckets['Earlier'].push(notification);
    } else if (isSameDay(date, now)) {
      buckets['Today'].push(notification);
    } else if (isSameDay(date, yesterday)) {
      buckets['Yesterday'].push(notification);
    } else if (date >= weekAgo) {
      buckets['This week'].push(notification);
    } else {
      buckets['Earlier'].push(notification);
    }
  }

  return (Object.keys(buckets) as Array<keyof typeof buckets>)
    .filter((key) => buckets[key].length > 0)
    .map((title) => ({ title, data: buckets[title] }));
}