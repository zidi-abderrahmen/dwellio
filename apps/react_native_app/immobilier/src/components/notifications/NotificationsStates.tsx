import React, { useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

import { theme, spacing, radius, typography } from '../../theme';

const colors = theme.colors;

function useSkeletonPulse() {
  const value = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(value, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(value, { toValue: 0.5, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [value]);

  return value;
}

export function NotificationsSkeleton() {
  const opacity = useSkeletonPulse();

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <StatusBar style="dark" />
      <View style={styles.skeletonHeader}>
        <Animated.View style={[styles.skeletonBlock, { width: 180, height: 24, opacity }]} />
        <Animated.View
          style={[styles.skeletonBlock, { width: 80, height: 14, marginTop: 8, opacity }]}
        />
      </View>
      <View style={styles.skeletonList}>
        {[0, 1, 2, 3, 4].map((i) => (
          <View key={i} style={styles.skeletonCard}>
            <Animated.View
              style={[styles.skeletonBlock, { width: 40, height: 40, borderRadius: 20, opacity }]}
            />
            <View style={styles.skeletonText}>
              <Animated.View style={[styles.skeletonBlock, { width: '60%', height: 14, opacity }]} />
              <Animated.View style={[styles.skeletonBlock, { width: '90%', height: 12, opacity }]} />
              <Animated.View style={[styles.skeletonBlock, { width: '30%', height: 10, opacity }]} />
            </View>
          </View>
        ))}
      </View>
    </SafeAreaView>
  );
}

export function NotificationsEmptyState({
  onRefresh,
  refreshing,
}: {
  onRefresh: () => void;
  refreshing: boolean;
}) {
  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={styles.stateContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        <View style={styles.iconHalo}>
          <Ionicons name="notifications-outline" size={36} color={colors.primary} />
        </View>
        <Text style={styles.stateTitle}>You're all caught up</Text>
        <Text style={styles.stateSubtitle}>
          New messages, favorites, and account updates will appear here.
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={onRefresh}
          style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
        >
          <Ionicons name="refresh-outline" size={16} color={colors.primary} />
          <Text style={styles.secondaryButtonText}>Refresh</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

export function NotificationsErrorState({
  message,
  onRetry,
  retrying,
}: {
  message: string;
  onRetry: () => void;
  retrying: boolean;
}) {
  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <StatusBar style="dark" />
      <View style={styles.stateContent}>
        <View style={[styles.iconHalo, styles.iconHaloError]}>
          <Ionicons name="alert-circle-outline" size={36} color={colors.error} />
        </View>
        <Text style={styles.stateTitle}>Couldn't load notifications</Text>
        <Text style={styles.stateSubtitle}>{message}</Text>
        <Pressable
          accessibilityRole="button"
          disabled={retrying}
          onPress={onRetry}
          style={({ pressed }) => [
            styles.primaryButton,
            (pressed || retrying) && styles.pressed,
          ]}
        >
          {retrying ? (
            <ActivityIndicator size="small" color={colors.onPrimary} />
          ) : (
            <Text style={styles.primaryButtonText}>Try again</Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },

  stateContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  iconHalo: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.outlineVariant,
    marginBottom: spacing.sm,
  },
  iconHaloError: {
    borderColor: colors.error,
  },
  stateTitle: {
    ...typography.body,
    fontSize: 18,
    fontWeight: '600',
    color: colors.onBackground,
    textAlign: 'center',
  },
  stateSubtitle: {
    ...typography.body,
    fontSize: 14,
    color: colors.secondary,
    textAlign: 'center',
    maxWidth: 320,
  },
  primaryButton: {
    minHeight: 44,
    minWidth: 160,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.md,
  },
  primaryButtonText: {
    ...theme.fonts.labelLarge,
    color: colors.onPrimary,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 44,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.outlineVariant,
  },
  secondaryButtonText: {
    ...theme.fonts.labelLarge,
    color: colors.primary,
  },
  pressed: {
    opacity: 0.75,
  },

  skeletonHeader: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  skeletonList: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  skeletonCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.outlineVariant,
  },
  skeletonText: {
    flex: 1,
    gap: 8,
  },
  skeletonBlock: {
    borderRadius: 4,
    backgroundColor: colors.outlineVariant,
  },
});