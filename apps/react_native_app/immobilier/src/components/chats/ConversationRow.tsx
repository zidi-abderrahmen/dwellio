import React, { useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';

import { theme, spacing, radius, typography } from '../../theme';
import { formatRelativeTime } from '../../lib/formatters';
import type { ChatWithRelations } from '../../types/chat';

const colors = theme.colors;
const EMPTY_PREVIEW = 'No messages yet — say hello 👋';

interface Props {
  chat: ChatWithRelations;
  userId: string | null;
  onPress: (chatId: string) => void;
}

export const ConversationRow = React.memo(function ConversationRow({
  chat,
  userId,
  onPress,
}: Props) {
  const isBuyer = userId === chat.buyer_id;
  const participant = isBuyer ? chat.owner : chat.buyer;

  const displayName = participant?.full_name?.trim() || 'Unknown participant';
  const propertyTitle = chat.properties?.title ?? 'Untitled property';
  const avatarUrl = participant?.avatar_url ?? null;
  const role = isBuyer ? 'Buyer' : 'Owner';
  const time = formatRelativeTime(chat.last_message_at);

  const lastMessage = chat.last_message;
  const unreadCount = chat.unread_count ?? 0;
  const hasUnread = unreadCount > 0;

  const isOwnLast = !!lastMessage && lastMessage.sender_id === userId;
  const previewFailed = !!lastMessage && lastMessage.status === 'failed';
  const isRead = isOwnLast && lastMessage?.is_read === true;

  const previewText = useMemo(() => {
    const content = lastMessage?.content?.trim();
    return content && content.length > 0 ? content : EMPTY_PREVIEW;
  }, [lastMessage]);

  const previewPrefix = isOwnLast && !previewFailed ? 'You: ' : '';

  const accessibilityLabel = useMemo(() => {
    const unreadBit = hasUnread
      ? `${unreadCount} unread message${unreadCount === 1 ? '' : 's'}. `
      : '';
    const lastBit = lastMessage
      ? `${isOwnLast ? 'You said: ' : 'Last message: '}${previewText}`
      : 'No messages yet.';
    return `Conversation with ${displayName} about ${propertyTitle}. ${unreadBit}${lastBit}`;
  }, [
    displayName,
    propertyTitle,
    hasUnread,
    unreadCount,
    lastMessage,
    isOwnLast,
    previewText,
  ]);

  const handlePress = useCallback(() => {
    onPress(chat.id);
  }, [onPress, chat.id]);

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      <View style={styles.avatarContainer}>
        {avatarUrl ? (
          <Image
            source={{ uri: avatarUrl }}
            style={styles.avatar}
            contentFit="cover"
            transition={200}
            alt={`${displayName} avatar`}
          />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Ionicons name="person" size={22} color={colors.secondary} />
          </View>
        )}
      </View>

      <View style={styles.body}>
        {/* Name + time */}
        <View style={styles.lineTop}>
          <Text
            style={[styles.participantName, hasUnread && styles.participantNameUnread]}
            numberOfLines={1}
          >
            {displayName}
          </Text>
          {time ? (
            <Text style={[styles.time, hasUnread && styles.timeUnread]}>
              {time}
            </Text>
          ) : null}
        </View>

        {/* Role + property */}
        <View style={styles.lineMeta}>
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>{role}</Text>
          </View>
          <Text style={styles.propertyTitle} numberOfLines={1}>
            {propertyTitle}
          </Text>
        </View>

        {/* Preview + read state + unread badge */}
        <View style={styles.linePreview}>
          <Text
            style={[
              styles.preview,
              hasUnread && styles.previewUnread,
              previewFailed && styles.previewFailed,
              !lastMessage && styles.previewEmpty,
            ]}
            numberOfLines={1}
          >
            {previewPrefix}
            {previewFailed ? 'Failed to send' : previewText}
          </Text>

          {isOwnLast && !previewFailed ? (
            <Ionicons
              name={isRead ? 'checkmark-done' : 'checkmark'}
              size={14}
              color={isRead ? colors.primary : colors.secondary}
              style={styles.readIcon}
              accessibilityLabel={isRead ? 'Read' : 'Sent'}
            />
          ) : null}

          {hasUnread ? (
            <View
              style={styles.unreadBadge}
              accessibilityLabel={`${unreadCount} unread`}
            >
              <Text style={styles.unreadBadgeText}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.outlineVariant,
    backgroundColor: colors.surface,
  },
  rowPressed: { backgroundColor: colors.surfaceVariant },

  avatarContainer: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
    backgroundColor: colors.surfaceVariant,
  },
  avatar: { width: 52, height: 52, borderRadius: radius.full },
  avatarPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceVariant,
  },

  body: { flex: 1, gap: 2 },

  // Top line
  lineTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  participantName: {
    ...theme.fonts.titleMedium,
    color: colors.onBackground,
    flex: 1,
  },
  participantNameUnread: {
    fontWeight: '700',
  },
  time: { ...typography.caption, color: colors.secondary },
  timeUnread: { color: colors.primary, fontWeight: '600' },

  // Middle line
  lineMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: 2,
  },
  roleBadge: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 1,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceVariant,
  },
  roleBadgeText: {
    ...typography.caption,
    color: colors.secondary,
    fontWeight: '600',
    fontSize: 10,
  },
  propertyTitle: {
    ...typography.caption,
    color: colors.secondary,
    flex: 1,
  },

  // Bottom line
  linePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: 2,
  },
  preview: {
    ...typography.body,
    color: colors.onSurfaceVariant,
    flex: 1,
  },
  previewUnread: {
    color: colors.onBackground,
    fontWeight: '600',
  },
  previewFailed: {
    color: colors.error,
    fontStyle: 'italic',
  },
  previewEmpty: {
    color: colors.placeholder,
    fontStyle: 'italic',
  },
  readIcon: {
    marginLeft: 2,
  },

  unreadBadge: {
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    marginLeft: spacing.xs,
  },
  unreadBadgeText: {
    ...typography.caption,
    color: colors.onPrimary,
    fontWeight: '700',
    fontSize: 10,
    lineHeight: 12,
  },
});