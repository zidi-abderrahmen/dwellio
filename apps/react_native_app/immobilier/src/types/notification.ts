/** The payload carried inside a notification's `data` column. */
export interface NotificationData {
  chat_id?: string;
  property_title?: string;
  property_id?: string;
}

/** A single notification belonging to the authenticated user. */
export interface Notification {
  id: string;
  user_id: string;
  type: 'new_message' | 'favorite_added' | 'system';
  title: string;
  body: string | null;
  data: NotificationData;
  is_read: boolean;
  created_at: string;
}

export type NotificationType = Notification['type'];
