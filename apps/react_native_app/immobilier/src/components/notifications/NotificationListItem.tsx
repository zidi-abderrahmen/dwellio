import React, { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import type { Notification } from '../../types/notification';
import {
  formatRelativeTime,
  getNotificationRoute,
  iconForType,
} from '../../utils/notifications';
import { theme, spacing, radius, typography } from '../../theme';

const colors = theme.colors;

interface NotificationListItemProps {
  notification: Notification;
  onPress: (notification: Notification) => void;
}

function NotificationListItemBase({
  notification,
  onPress,
}: NotificationListItemProps) {
  const isUnread = !notification.is_read;
  const iconName = iconForType(notification.type);
  const time = formatRelativeTime(notification.created_at);
  const navigable = getNotificationRoute(notification) !== null;

  return (
    <Pressable
      onPress={() => onPress(notification)}
      accessibilityRole="button"
      accessibilityLabel={`${isUnread ? 'Unread. ' : ''}${notification.title}`}
      accessibilityHint={
        notification.body ?? (navigable ? 'Opens the related screen' : undefined)
      }
      style={({ pressed }) => [
        styles.card,
        isUnread && styles.cardUnread,
        pressed && styles.cardPressed,
      ]}
    >
      {isUnread ? <View style={styles.accentBar} /> : null}

      <View style={styles.iconWrap}>
        <Ionicons
          name={iconName}
          size={20}
          color={isUnread ? colors.primary : colors.secondary}
        />
        {isUnread ? <View style={styles.iconBadge} /> : null}
      </View>

      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text
            style={[styles.title, isUnread && styles.titleUnread]}
            numberOfLines={1}
          >
            {notification.title}
          </Text>
          {time ? <Text style={styles.time}>{time}</Text> : null}
        </View>

        {notification.body ? (
          <Text
            style={[styles.message, isUnread && styles.messageUnread]}
            numberOfLines={2}
          >
            {notification.body}
          </Text>
        ) : null}
      </View>

      {navigable ? (
        <Ionicons name="chevron-forward" size={16} color={colors.secondary} />
      ) : null}
    </Pressable>
  );
}

export const NotificationListItem = memo(NotificationListItemBase);

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingLeft: spacing.md + 4, // room for the accent bar
    paddingRight: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.outlineVariant,
    overflow: 'hidden',
  },
  cardUnread: {
    backgroundColor: colors.surface,
  },
  cardPressed: {
    opacity: 0.85,
  },
  accentBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: colors.primary,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.outlineVariant,
  },
  iconBadge: {
    position: 'absolute',
    top: -1,
    right: -1,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.surface,
  },
  content: {
    flex: 1,
    gap: 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    flex: 1,
    ...theme.fonts.labelLarge,
    color: colors.onBackground,
  },
  titleUnread: {
    fontWeight: '700',
  },
  time: {
    ...typography.caption,
    color: colors.secondary,
  },
  message: {
    ...typography.body,
    fontSize: 13,
    color: colors.secondary,
  },
  messageUnread: {
    color: colors.onSurfaceVariant,
  },
});