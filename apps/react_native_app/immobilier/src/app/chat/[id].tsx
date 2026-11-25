import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { chatService } from '../../services/chatService';
import { useAuthSession } from '../../context/AuthContext';
import { theme, spacing, radius, typography } from '../../theme';
import type { ChatWithRelations } from '../../types/chat';

const colors = theme.colors;

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuthSession();
  const userId = session?.user?.id ?? null;
  const router = useRouter();

  const [chat, setChat] = useState<ChatWithRelations | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadChat = useCallback(async () => {
    if (!id || Array.isArray(id)) {
      setLoadError('Invalid conversation.');
      setLoading(false);
      return;
    }
    if (!userId) {
      setLoadError('You must be signed in to open a conversation.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError(null);
    try {
      const result = await chatService.getChatById(id);
      if (!result) {
        setLoadError('This conversation could not be found.');
      } else {
        setChat(result);
      }
    } catch (error) {
      console.error('Failed to load conversation:', error);
      setLoadError(
        error instanceof Error
          ? error.message
          : 'Unable to open this conversation.',
      );
    } finally {
      setLoading(false);
    }
  }, [id, userId]);

  useEffect(() => {
    void loadChat();
  }, [loadChat]);

  const counterpart = useMemo(() => {
    if (!chat || !userId) return null;
    return userId === chat.buyer_id ? chat.owner : chat.buyer;
  }, [chat, userId]);

  const handleBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/chats');
  }, [router]);

  if (loading) {
    return (
      <SafeAreaView style={styles.stateScreen}>
        <StatusBar style="dark" />
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.stateText}>Loading conversation…</Text>
      </SafeAreaView>
    );
  }

  if (loadError || !chat) {
    return (
      <SafeAreaView style={styles.stateScreen}>
        <StatusBar style="dark" />
        <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
        <Text style={styles.errorText}>
          {loadError ?? 'This conversation could not be found.'}
        </Text>
        <Pressable
          style={styles.primaryButton}
          onPress={handleBack}
          accessibilityRole="button"
        >
          <Text style={styles.primaryButtonText}>Back to messages</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const displayName = counterpart?.full_name?.trim() || 'Conversation';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="dark" />

      <View style={styles.topBar}>
        <Pressable
          onPress={handleBack}
          hitSlop={8}
          style={styles.iconButton}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={22} color={colors.onSurface} />
        </Pressable>

        <View style={styles.headerCenter}>
          {counterpart?.avatar_url ? (
            <Image
              source={{ uri: counterpart.avatar_url }}
              style={styles.headerAvatar}
              contentFit="cover"
              alt={`${displayName} avatar`}
            />
          ) : (
            <View style={styles.headerAvatarPlaceholder}>
              <Ionicons name="person" size={16} color={colors.secondary} />
            </View>
          )}
          <View style={styles.headerText}>
            <Text style={styles.topBarTitle} numberOfLines={1}>
              {displayName}
            </Text>
            <Text style={styles.topBarSubtitle} numberOfLines={1}>
              {chat.properties?.title ?? 'Untitled property'}
            </Text>
          </View>
        </View>

        <View style={styles.iconButton} />
      </View>

      <View style={styles.content}>
        <Ionicons
          name="chatbubble-ellipses-outline"
          size={56}
          color={colors.placeholder}
        />
        <Text style={styles.contentTitle}>No messages yet</Text>
        <Text style={styles.contentText}>
          Messaging (history, sending, realtime) arrives in the next milestone.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  stateScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
    backgroundColor: colors.background,
  },
  stateText: { ...typography.body, color: colors.secondary },
  errorText: {
    ...typography.body,
    color: colors.error,
    textAlign: 'center',
  },

  primaryButton: {
    minHeight: 44,
    paddingHorizontal: spacing.xl,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    marginTop: spacing.sm,
  },
  primaryButtonText: {
    ...theme.fonts.labelLarge,
    color: colors.onPrimary,
  },

  topBar: {
    minHeight: 60,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.outlineVariant,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.sm,
  },
  headerAvatar: { width: 36, height: 36, borderRadius: radius.full },
  headerAvatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceVariant,
  },
  headerText: { flex: 1 },
  topBarTitle: { ...theme.fonts.titleMedium, color: colors.onBackground },
  topBarSubtitle: { ...typography.caption, color: colors.secondary },

  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.sm,
  },
  contentTitle: { ...theme.fonts.titleLarge, color: colors.onBackground },
  contentText: {
    ...typography.body,
    color: colors.secondary,
    textAlign: 'center',
  },
});