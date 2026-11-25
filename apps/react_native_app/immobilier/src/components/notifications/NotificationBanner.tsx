import React, { useCallback, useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Notification } from '../../types/notification';
import { getNotificationRoute, iconForType } from '../../utils/notifications';
import { theme, spacing, radius, typography } from '../../theme';

const colors = theme.colors;

const AUTO_DISMISS_MS = 6000;
const HIDDEN_OFFSET = -160;

interface NotificationBannerProps {
  notification: Notification;
  onDismiss: () => void;
  onOpen?: (notification: Notification) => void;
}

export function NotificationBanner({
  notification,
  onDismiss,
  onOpen,
}: NotificationBannerProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const translateY = useRef(new Animated.Value(HIDDEN_OFFSET)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestIdRef = useRef(notification.id);
  const dismissedRef = useRef(false);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const animateOut = useCallback(
    (after?: () => void) => {
      if (dismissedRef.current) return;
      dismissedRef.current = true;
      clearTimer();

      const idAtStart = latestIdRef.current;
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: HIDDEN_OFFSET,
          duration: 220,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 180,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start(() => {
        // If a new notification replaced this one during the exit
        // animation, don't tear down the fresh banner.
        if (latestIdRef.current === idAtStart) after?.();
      });
    },
    [clearTimer, opacity, translateY],
  );

  useEffect(() => {
    latestIdRef.current = notification.id;
    dismissedRef.current = false;

    translateY.setValue(HIDDEN_OFFSET);
    opacity.setValue(0);

    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        damping: 18,
        stiffness: 180,
        mass: 0.9,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

    timerRef.current = setTimeout(() => animateOut(onDismiss), AUTO_DISMISS_MS);

    return clearTimer;
  }, [notification.id, animateOut, onDismiss, opacity, translateY, clearTimer]);

  const handlePress = useCallback(() => {
    animateOut(() => {
      onOpen?.(notification);
      onDismiss();
      const route = getNotificationRoute(notification);
      router.push(route ?? ('/notifications' as never));
    });
  }, [animateOut, notification, onDismiss, onOpen, router]);

  const iconName = iconForType(notification.type);
  const subtitle = notification.body?.trim();

  return (
    <Animated.View
      pointerEvents="box-none"
      accessibilityLiveRegion="polite"
      style={[
        styles.wrapper,
        {
          paddingTop: insets.top + spacing.sm,
          transform: [{ translateY }],
          opacity,
        },
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`New notification: ${notification.title}`}
        accessibilityHint="Opens the related screen"
        onPress={handlePress}
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      >
        <View style={styles.iconHalo}>
          <Ionicons name={iconName} size={18} color={colors.onPrimary} />
        </View>

        <View style={styles.textColumn}>
          <Text style={styles.title} numberOfLines={1}>
            {notification.title}
          </Text>
          {subtitle ? (
            <Text style={styles.body} numberOfLines={2}>
              {subtitle}
            </Text>
          ) : null}
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss notification"
          hitSlop={10}
          onPress={() => animateOut(onDismiss)}
          style={styles.dismissButton}
        >
          <Ionicons name="close" size={16} color={colors.secondary} />
        </Pressable>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.md,
    zIndex: 1000,
    elevation: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.outlineVariant,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  cardPressed: {
    opacity: 0.92,
  },
  iconHalo: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  textColumn: {
    flex: 1,
    gap: 2,
  },
  title: {
    ...theme.fonts.labelLarge,
    color: colors.onBackground,
  },
  body: {
    ...typography.body,
    fontSize: 13,
    color: colors.secondary,
  },
  dismissButton: {
    padding: 4,
  },
});