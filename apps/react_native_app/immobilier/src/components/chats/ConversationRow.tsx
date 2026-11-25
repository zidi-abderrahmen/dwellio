import React, { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';

import { theme, spacing, radius, typography } from '../../theme';
import { formatRelativeTime } from '../../lib/formatters';
import type { ChatWithRelations } from '../../types/chat';

const colors = theme.colors;

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

  const handlePress = useCallback(() => {
    onPress(chat.id);
  }, [onPress, chat.id]);

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      accessibilityRole="button"
      accessibilityLabel={`Conversation with ${displayName} about ${propertyTitle}`}
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
        <View style={styles.topLine}>
          <Text style={styles.participantName} numberOfLines={1}>
            {displayName}
          </Text>
          {time ? <Text style={styles.time}>{time}</Text> : null}
        </View>

        <View style={styles.metaLine}>
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>{role}</Text>
          </View>
          <Text style={styles.propertyTitle} numberOfLines={1}>
            {propertyTitle}
          </Text>
        </View>

        <Text style={styles.preview} numberOfLines={1}>
          No messages yet — say hello 👋
        </Text>
      </View>

      <Ionicons name="chevron-forward" size={18} color={colors.outline} />
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

  topLine: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  participantName: {
    ...theme.fonts.titleMedium,
    color: colors.onBackground,
    flex: 1,
  },
  time: { ...typography.caption, color: colors.secondary },

  metaLine: {
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

  preview: {
    ...typography.body,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
});