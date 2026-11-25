import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';

import { theme, spacing, radius, typography } from '../../theme';

const colors = theme.colors;

interface Props {
  displayName: string;
  propertyTitle: string;
  avatarUrl: string | null;
  onBack: () => void;
  onPressProperty: () => void;
}

export function ChatHeader({
  displayName,
  propertyTitle,
  avatarUrl,
  onBack,
  onPressProperty,
}: Props) {
  return (
    <View style={styles.container}>
      <Pressable
        onPress={onBack}
        style={styles.iconButton}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Go back"
      >
        <Ionicons name="arrow-back" size={22} color={colors.onSurface} />
      </Pressable>

      <View style={styles.center}>
        {avatarUrl ? (
          <Image
            source={{ uri: avatarUrl }}
            style={styles.avatar}
            contentFit="cover"
            transition={150}
            alt={`${displayName} avatar`}
          />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Ionicons name="person" size={18} color={colors.secondary} />
          </View>
        )}

        <View style={styles.textBlock}>
          <Text style={styles.name} numberOfLines={1}>
            {displayName}
          </Text>
          <Pressable
            onPress={onPressProperty}
            hitSlop={4}
            accessibilityRole="button"
            accessibilityLabel={`View property ${propertyTitle}`}
          >
            <Text style={styles.property} numberOfLines={1}>
              {propertyTitle}
            </Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.iconButton} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 60,
    paddingHorizontal: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.outlineVariant,
    backgroundColor: colors.background,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.xs,
  },
  avatar: { width: 36, height: 36, borderRadius: radius.full },
  avatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceVariant,
  },
  textBlock: { flex: 1 },
  name: { ...theme.fonts.titleMedium, color: colors.onBackground },
  property: { ...typography.caption, color: colors.primary, marginTop: 1 },
});