import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';
import { StyleSheet, View } from 'react-native';

import { supabase } from '../lib/supabase';
import { useAuthSession } from './AuthContext';
import { notificationService } from '../services/notificationService';
import { NotificationBanner } from '../components/notifications/NotificationBanner';
import type { Notification } from '../types/notification';

interface NotificationContextValue {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  /** Load error only. Action errors are thrown to the caller. */
  error: string | null;
  banner: Notification | null;
  refresh: () => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  clearError: () => void;
  showBanner: (notification: Notification) => void;
  dismissBanner: () => void;
}

const NotificationContext = createContext<NotificationContextValue | undefined>(
  undefined,
);

const LOAD_ERROR_FALLBACK = 'Unable to load notifications.';

export function NotificationProvider({ children }: PropsWithChildren) {
  const { session } = useAuthSession();
  const userId = session?.user?.id ?? null;

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [banner, setBanner] = useState<Notification | null>(null);

  const notificationsRef = useRef<Notification[]>(notifications);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    notificationsRef.current = notifications;
  }, [notifications]);

  const unreadCount = useMemo(
    () => notifications.reduce((count, n) => (n.is_read ? count : count + 1), 0),
    [notifications],
  );

  // --------------------------------------------------
  // Load notification history
  // --------------------------------------------------

  const loadNotifications = useCallback(async () => {
    if (!userId) {
      setNotifications([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await notificationService.getNotifications(userId);
      if (mountedRef.current) setNotifications(data);
    } catch (err) {
      if (!mountedRef.current) return;
      setError(err instanceof Error ? err.message : LOAD_ERROR_FALLBACK);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    mountedRef.current = true;
    void loadNotifications();
    return () => {
      mountedRef.current = false;
    };
  }, [loadNotifications]);

  // --------------------------------------------------
  // Realtime subscription
  // --------------------------------------------------

  useEffect(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    if (!userId) {
      setNotifications([]);
      setBanner(null);
      return;
    }

    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (!mountedRef.current) return;
          const incoming = payload.new as Notification;
          setNotifications((previous) =>
            previous.some((item) => item.id === incoming.id)
              ? previous
              : [incoming, ...previous],
          );
          setBanner(incoming);
        },
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [userId]);

  // --------------------------------------------------
  // Mutations (optimistic, with rollback)
  // --------------------------------------------------

  const markAsRead = useCallback(
    async (notificationId: string) => {
      if (!userId) return;

      const existing = notificationsRef.current.find((n) => n.id === notificationId);
      setBanner((current) => (current?.id === notificationId ? null : current));

      if (!existing || existing.is_read) return;

      setNotifications((previous) =>
        previous.map((item) =>
          item.id === notificationId ? { ...item, is_read: true } : item,
        ),
      );

      try {
        await notificationService.markAsRead(notificationId, userId);
      } catch (err) {
        if (mountedRef.current) {
          setNotifications((previous) =>
            previous.map((item) =>
              item.id === notificationId ? { ...item, is_read: false } : item,
            ),
          );
        }
        throw err;
      }
    },
    [userId],
  );

  const markAllAsRead = useCallback(async () => {
    if (!userId) return;

    const unreadIds = notificationsRef.current
      .filter((n) => !n.is_read)
      .map((n) => n.id);
    if (unreadIds.length === 0) return;

    setNotifications((previous) =>
      previous.map((item) => (item.is_read ? item : { ...item, is_read: true })),
    );
    setBanner(null);

    try {
      await Promise.all(
        unreadIds.map((id) => notificationService.markAsRead(id, userId)),
      );
    } catch (err) {
      // Re-sync from the server so we don't leave wrong local state.
      await loadNotifications();
      throw err;
    }
  }, [loadNotifications, userId]);

  const clearError = useCallback(() => setError(null), []);
  const showBanner = useCallback(
    (notification: Notification) => setBanner(notification),
    [],
  );
  const dismissBanner = useCallback(() => setBanner(null), []);

  const handleBannerOpen = useCallback(
    (notification: Notification) => {
      void markAsRead(notification.id).catch(() => {
        /* Silent: banner tap should never block navigation. */
      });
    },
    [markAsRead],
  );

  const value = useMemo<NotificationContextValue>(
    () => ({
      notifications,
      unreadCount,
      loading,
      error,
      banner,
      refresh: loadNotifications,
      markAsRead,
      markAllAsRead,
      clearError,
      showBanner,
      dismissBanner,
    }),
    [
      notifications,
      unreadCount,
      loading,
      error,
      banner,
      loadNotifications,
      markAsRead,
      markAllAsRead,
      clearError,
      showBanner,
      dismissBanner,
    ],
  );

  return (
    <NotificationContext.Provider value={value}>
      <View style={styles.container}>
        {children}
        {banner ? (
          <NotificationBanner
            notification={banner}
            onDismiss={dismissBanner}
            onOpen={handleBannerOpen}
          />
        ) : null}
      </View>
    </NotificationContext.Provider>
  );
}

export function useNotifications(): NotificationContextValue {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider.');
  }
  return context;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
});