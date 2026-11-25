import React from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { theme, spacing, radius, typography } from '../../theme';

const colors = theme.colors;
export const MAX_MESSAGE_LENGTH = 2000;

interface Props {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  sending: boolean;
  bottomInset: number;
}

export function MessageInput({
  value,
  onChangeText,
  onSend,
  sending,
  bottomInset,
}: Props) {
  const canSend = value.trim().length > 0 && !sending;
  const showCounter = value.length > MAX_MESSAGE_LENGTH * 0.85;

  return (
    <View style={[styles.container, { paddingBottom: bottomInset }]}>
      <View style={styles.inputWrap}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder="Write a message…"
          placeholderTextColor={colors.placeholder}
          style={styles.input}
          multiline
          maxLength={MAX_MESSAGE_LENGTH}
          editable={!sending}
          autoCorrect
          autoCapitalize="sentences"
          textAlignVertical="center"
          accessibilityLabel="Message input"
        />
        {showCounter ? (
          <Text style={styles.counter}>
            {value.length}/{MAX_MESSAGE_LENGTH}
          </Text>
        ) : null}
      </View>

      <Pressable
        onPress={onSend}
        disabled={!canSend}
        style={({ pressed }) => [
          styles.sendButton,
          !canSend && styles.sendButtonDisabled,
          pressed && canSend && styles.sendButtonPressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel={sending ? 'Sending message' : 'Send message'}
      >
        {sending ? (
          <ActivityIndicator size="small" color={colors.onPrimary} />
        ) : (
          <Ionicons name="arrow-up" size={20} color={colors.onPrimary} />
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.outlineVariant,
  },
  inputWrap: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  input: {
    ...typography.body,
    color: colors.onBackground,
    paddingHorizontal: spacing.md,
    paddingTop: Platform.OS === 'ios' ? 10 : 8,
    paddingBottom: Platform.OS === 'ios' ? 10 : 8,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceVariant,
    maxHeight: 120,
    minHeight: 40,
  },
  counter: {
    ...typography.caption,
    color: colors.secondary,
    textAlign: 'right',
    marginTop: 2,
    marginRight: spacing.xs,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    marginBottom: 2,
  },
  sendButtonDisabled: { backgroundColor: colors.outlineVariant },
  sendButtonPressed: { opacity: 0.85 },
});