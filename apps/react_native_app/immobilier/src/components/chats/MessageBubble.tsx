import React, { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { theme, spacing, radius, typography } from '../../theme';
import { formatMessageTime } from '../../lib/chatFormatters';
import type { Message } from '../../types/chat';

const colors = theme.colors;

interface Props {
  message: Message;
  isOwn: boolean;
  onRetry: (message: Message) => void;
}

export const MessageBubble = React.memo(function MessageBubble({
  message,
  isOwn,
  onRetry,
}: Props) {
  const time = formatMessageTime(message.created_at);
  const failed = isOwn && message.status === 'failed';
  const sending = isOwn && message.status === 'sending';

  const handlePress = useCallback(() => {
    if (failed) onRetry(message);
  }, [failed, onRetry, message]);

  return (
    <Pressable
      onPress={handlePress}
      disabled={!failed}
      style={[styles.row, isOwn ? styles.rowOwn : styles.rowOther]}
      accessibilityRole={failed ? 'button' : undefined}
      accessibilityLabel={failed ? 'Resend failed message' : undefined}
    >
      {isOwn && failed ? (
        <View style={styles.retryIcon}>
          <Ionicons name="refresh" size={16} color={colors.error} />
        </View>
      ) : null}

      <View
        style={[
          styles.bubble,
          isOwn ? styles.bubbleOwn : styles.bubbleOther,
          failed && styles.bubbleFailed,
        ]}
      >
        <Text
          style={[
            styles.text,
            isOwn ? styles.textOwn : styles.textOther,
          ]}
        >
          {message.content}
        </Text>

        <View style={styles.meta}>
          <Text
            style={[
              styles.time,
              isOwn ? styles.timeOwn : styles.timeOther,
            ]}
          >
            {time}
          </Text>
          {isOwn ? <StatusIcon status={message.status} isRead={message.is_read} /> : null}
        </View>
      </View>

      {sending ? (
        <View style={styles.sendingDot}>
          <Ionicons
            name="time-outline"
            size={14}
            color={colors.secondary}
          />
        </View>
      ) : null}
    </Pressable>
  );
});

function StatusIcon({
  status,
  isRead,
}: {
  status: Message['status'];
  isRead: boolean;
}) {
  if (status === 'failed') {
    return (
      <Text style={styles.failedLabel}>Failed · tap to retry</Text>
    );
  }

  return (
    <Ionicons
      name={isRead ? 'checkmark-done' : 'checkmark'}
      size={14}
      color={colors.onPrimary}
      style={{ opacity: 0.85 }}
    />
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginVertical: 2,
    paddingHorizontal: spacing.md,
  },
  rowOwn: { justifyContent: 'flex-end' },
  rowOther: { justifyContent: 'flex-start' },

  bubble: {
    maxWidth: '80%',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
  },
  bubbleOwn: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: radius.sm,
  },
  bubbleOther: {
    backgroundColor: colors.surfaceVariant,
    borderBottomLeftRadius: radius.sm,
  },
  bubbleFailed: {
    opacity: 0.85,
    borderWidth: 1,
    borderColor: colors.error,
  },

  text: { ...typography.body, fontSize: 15, lineHeight: 20 },
  textOwn: { color: colors.onPrimary },
  textOther: { color: colors.onBackground },

  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
    alignSelf: 'flex-end',
  },
  time: { ...typography.caption, fontSize: 10 },
  timeOwn: { color: colors.onPrimary, opacity: 0.8 },
  timeOther: { color: colors.secondary },

  failedLabel: {
    ...typography.caption,
    color: colors.onPrimary,
    opacity: 0.9,
    fontSize: 10,
  },

  retryIcon: {
    marginRight: spacing.xs,
    marginBottom: spacing.sm,
  },
  sendingDot: {
    marginLeft: spacing.xs,
    marginBottom: spacing.sm,
  },
});