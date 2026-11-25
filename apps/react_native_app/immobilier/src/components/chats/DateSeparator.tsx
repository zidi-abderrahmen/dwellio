import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme, spacing, radius, typography } from '../../theme';

const colors = theme.colors;

export function DateSeparator({ label }: { label: string }) {
  return (
    <View style={styles.container}>
      <View style={styles.line} />
      <View style={styles.pill}>
        <Text style={styles.label}>{label}</Text>
      </View>
      <View style={styles.line} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  line: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.outlineVariant,
  },
  pill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceVariant,
  },
  label: {
    ...typography.caption,
    color: colors.secondary,
    fontWeight: '600',
  },
});