import { supabase } from '../lib/supabase';
import type { Notification } from '../types/notification';

export class NotificationServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotificationServiceError';
    Object.setPrototypeOf(this, NotificationServiceError.prototype);
  }
}

export const notificationService = {
  /** Retrieve the authenticated user's notifications, newest first. */
  async getNotifications(userId: string): Promise<Notification[]> {
    if (!userId) {
      throw new NotificationServiceError('A user ID is required.');
    }

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new NotificationServiceError(
        `Unable to load notifications: ${error.message}`,
      );
    }

    return (data ?? []) as Notification[];
  },

  /** Mark a single notification as read, scoped to the current user. */
  async markAsRead(notificationId: string, userId: string): Promise<void> {
    if (!userId) {
      throw new NotificationServiceError('A user ID is required.');
    }

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) {
      throw new NotificationServiceError(
        `Unable to mark notification as read: ${error.message}`,
      );
    }
  },

  /** Count the current user's unread notifications. */
  async getUnreadCount(userId: string): Promise<number> {
    if (!userId) {
      return 0;
    }

    const { count, error } = await supabase
      .from('notifications')
      .select('*', { head: true, count: 'exact' })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) {
      throw new NotificationServiceError(
        `Unable to count unread notifications: ${error.message}`,
      );
    }

    return count ?? 0;
  },
};
