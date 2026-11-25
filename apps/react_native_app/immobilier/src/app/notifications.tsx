import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  SectionList,
  StyleSheet,
  Text,
  View,
  type SectionListRenderItemInfo,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { useNotifications } from '../context/NotificationContext';
import type { Notification } from '../types/notification';
import {
  getNotificationRoute,
  groupNotificationsByDate,
  type NotificationSection,
} from '../utils/notifications';
import { NotificationListItem } from '../components/notifications/NotificationListItem';
import {
  NotificationsEmptyState,
  NotificationsErrorState,
  NotificationsSkeleton,
} from '../components/notifications/NotificationsStates';
import { theme, spacing, typography } from '../theme';

const colors = theme.colors;

const ItemSeparator = () => <View style={styles.separator} />;

export default function NotificationsScreen() {
  const {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    refresh,
    clearError,
  } = useNotifications();
  const router = useRouter();

  const [refreshing, setRefreshing] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);

  const sections = useMemo(
    () => groupNotificationsByDate(notifications),
    [notifications],
  );

  const handlePress = useCallback(
    async (notification: Notification) => {
      if (!notification.is_read) {
        try {
          await markAsRead(notification.id);
        } catch {
          /* Non-blocking: still navigate if the read flag fails. */
        }
      }

      const route = getNotificationRoute(notification);
      if (route) {
        router.push(route as never);
      }
    },
    [markAsRead, router],
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refresh();
    } finally {
      setRefreshing(false);
    }
  }, [refresh]);

  const handleMarkAll = useCallback(async () => {
    if (markingAll || unreadCount === 0) return;
    setMarkingAll(true);
    try {
      await markAllAsRead();
    } catch (err) {
      Alert.alert(
        'Could not mark all as read',
        err instanceof Error ? err.message : 'Please try again.',
      );
    } finally {
      setMarkingAll(false);
    }
  }, [markAllAsRead, markingAll, unreadCount]);

  const renderItem = useCallback(
    ({ item }: SectionListRenderItemInfo<Notification, NotificationSection>) => (
      <NotificationListItem notification={item} onPress={handlePress} />
    ),
    [handlePress],
  );

  // -------------------- states --------------------

  if (loading && notifications.length === 0) {
    return <NotificationsSkeleton />;
  }

  if (error && notifications.length === 0) {
    return (
      <NotificationsErrorState
        message={error}
        onRetry={() => void handleRefresh()}
        retrying={refreshing}
      />
    );
  }

  if (notifications.length === 0) {
    return (
      <NotificationsEmptyState
        onRefresh={() => void handleRefresh()}
        refreshing={refreshing}
      />
    );
  }

  // -------------------- list --------------------

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="dark" />

      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Notifications</Text>
          <Text style={styles.headerSubtitle}>
            {unreadCount > 0 ? `${unreadCount} unread` : 'All read'}
          </Text>
        </View>

        {unreadCount > 0 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Mark all notifications as read"
            accessibilityState={{ disabled: markingAll }}
            disabled={markingAll}
            onPress={() => void handleMarkAll()}
            style={({ pressed }) => [
              styles.markAllButton,
              (pressed || markingAll) && styles.markAllButtonPressed,
            ]}
          >
            {markingAll ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <>
                <Ionicons name="checkmark-done-outline" size={16} color={colors.primary} />
                <Text style={styles.markAllText}>Mark all read</Text>
              </>
            )}
          </Pressable>
        ) : null}
      </View>

      {error ? (
        <View style={styles.inlineError}>
          <Ionicons name="alert-circle-outline" size={16} color={colors.error} />
          <Text style={styles.inlineErrorText} numberOfLines={2}>
            {error}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Dismiss error"
            hitSlop={8}
            onPress={clearError}
          >
            <Ionicons name="close" size={16} color={colors.error} />
          </Pressable>
        </View>
      ) : null}

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        renderSectionHeader={({ section }) => (
          <Text style={styles.sectionHeader}>{section.title}</Text>
        )}
        stickySectionHeadersEnabled={false}
        ItemSeparatorComponent={ItemSeparator}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void handleRefresh()}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.md,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    ...theme.fonts.headlineSmall,
    color: colors.onBackground,
  },
  headerSubtitle: {
    ...typography.caption,
    color: colors.secondary,
    marginTop: 2,
  },
  markAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 36,
    paddingHorizontal: spacing.md,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.outlineVariant,
  },
  markAllButtonPressed: {
    opacity: 0.7,
  },
  markAllText: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.primary,
  },

  inlineError: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.error,
  },
  inlineErrorText: {
    flex: 1,
    ...typography.caption,
    color: colors.error,
  },

  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  separator: {
    height: spacing.sm,
  },
  sectionHeader: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
});