import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ListRenderItemInfo,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { useAuthSession } from '../../context/AuthContext';
import { useChatConversation } from '../../hooks/useChatConversation';
import { buildChatListItems, type ChatListItem } from '../../lib/chatFormatters';
import { ChatHeader } from '../../components/chats/ChatHeader';
import { DateSeparator } from '../../components/chats/DateSeparator';
import { MessageBubble } from '../../components/chats/MessageBubble';
import { MessageInput } from '../../components/chats/MessageInput';
import { theme, spacing, radius, typography } from '../../theme';

const colors = theme.colors;
const LOAD_OLDER_THRESHOLD = 120;

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuthSession();
  const userId = session?.user?.id ?? null;
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const chatId = !id || Array.isArray(id) ? undefined : id;

  const {
    chat,
    messages,
    loading,
    loadError,
    sending,
    sendError,
    hasMore,
    loadingOlder,
    sendMessage,
    retryMessage,
    loadOlder,
  } = useChatConversation(chatId, userId);

  const [draft, setDraft] = useState('');
  const flatListRef = useRef<FlatList<ChatListItem>>(null);
  const isAtBottomRef = useRef(true);
  const prevMessageCountRef = useRef(0);
  const initialScrollDoneRef = useRef(false);

  const listItems = useMemo(() => buildChatListItems(messages), [messages]);
  const lastItemKey = listItems.length > 0 ? listItems[listItems.length - 1].key : null;

  const counterpart = useMemo(() => {
    if (!chat || !userId) return null;
    return userId === chat.buyer_id ? chat.owner : chat.buyer;
  }, [chat, userId]);

  const displayName = counterpart?.full_name?.trim() || 'Conversation';
  const propertyTitle = chat?.properties?.title ?? 'Untitled property';

  // --------------------------------------------------
  // Navigation
  // --------------------------------------------------
  const handleBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/chats');
  }, [router]);

  const handlePressProperty = useCallback(() => {
    if (!chat) return;
    router.push({
      pathname: '/property/[id]',
      params: { id: chat.property_id },
    });
  }, [chat, router]);

  // --------------------------------------------------
  // Send
  // --------------------------------------------------
  const handleSend = useCallback(async () => {
    const text = draft.trim();
    if (!text) return;
    setDraft('');
    Keyboard.dismiss();
    try {
      await sendMessage(text);
    } catch {
      // Failed state is surfaced in the bubble; user can tap to retry.
    }
  }, [draft, sendMessage]);

  // --------------------------------------------------
  // Scroll management
  // --------------------------------------------------
  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, contentSize, layoutMeasurement } =
        event.nativeEvent;

      // At-bottom check (with small tolerance).
      isAtBottomRef.current =
        contentOffset.y + layoutMeasurement.height >=
        contentSize.height - 40;

      // Fetch older messages when scrolled near the top.
      if (
        contentOffset.y < LOAD_OLDER_THRESHOLD &&
        hasMore &&
        !loadingOlder &&
        messages.length > 0
      ) {
        void loadOlder();
      }
    },
    [hasMore, loadingOlder, loadOlder, messages.length],
  );

  const handleContentSizeChange = useCallback(() => {
    if (initialScrollDoneRef.current || messages.length === 0) return;
    initialScrollDoneRef.current = true;
    requestAnimationFrame(() => {
      flatListRef.current?.scrollToEnd({ animated: false });
    });
  }, [messages.length]);

  useEffect(() => {
    if (!initialScrollDoneRef.current) {
      prevMessageCountRef.current = messages.length;
      return;
    }

    const grew = messages.length > prevMessageCountRef.current;
    prevMessageCountRef.current = messages.length;

    if (grew && isAtBottomRef.current) {
      requestAnimationFrame(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      });
    }
  }, [messages.length]);

  // --------------------------------------------------
  // Item rendering
  // --------------------------------------------------
  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<ChatListItem>) => {
      if (item.type === 'date') {
        return <DateSeparator label={item.label} />;
      }
      return (
        <MessageBubble
          message={item.message}
          isOwn={item.message.sender_id === userId}
          onRetry={retryMessage}
        />
      );
    },
    [userId, retryMessage],
  );

  // --------------------------------------------------
  // State screens
  // --------------------------------------------------
  if (loading) {
    return (
      <SafeAreaView style={styles.stateScreen} edges={['top', 'bottom']}>
        <StatusBar style="dark" />
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.stateText}>Loading conversation…</Text>
      </SafeAreaView>
    );
  }

  if (loadError || !chat) {
    return (
      <SafeAreaView style={styles.stateScreen} edges={['top', 'bottom']}>
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

  // --------------------------------------------------
  // Main
  // --------------------------------------------------
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="dark" />

      <ChatHeader
        displayName={displayName}
        propertyTitle={propertyTitle}
        avatarUrl={counterpart?.avatar_url ?? null}
        onBack={handleBack}
        onPressProperty={handlePressProperty}
      />

      {sendError ? (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle" size={16} color={colors.onPrimary} />
          <Text style={styles.errorBannerText} numberOfLines={2}>
            {sendError}
          </Text>
        </View>
      ) : null}

      <FlatList
        ref={flatListRef}
        style={styles.list}
        data={listItems}
        keyExtractor={(item) => item.key}
        renderItem={renderItem}
        extraData={lastItemKey}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={80}
        onContentSizeChange={handleContentSizeChange}
        maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
        ListHeaderComponent={
          loadingOlder ? (
            <View style={styles.loadingOlder}>
              <ActivityIndicator size="small" color={colors.secondary} />
            </View>
          ) : undefined
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons
              name="chatbubble-ellipses-outline"
              size={52}
              color={colors.placeholder}
            />
            <Text style={styles.emptyTitle}>Say hello 👋</Text>
            <Text style={styles.emptyText}>
              This is the start of your conversation about “{propertyTitle}”.
            </Text>
          </View>
        }
      />

      <MessageInput
        value={draft}
        onChangeText={setDraft}
        onSend={handleSend}
        sending={sending}
        bottomInset={Math.max(insets.bottom, spacing.xs)}
      />
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

  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.error,
  },
  errorBannerText: {
    ...typography.body,
    color: colors.onPrimary,
    flex: 1,
    fontSize: 13,
  },

  list: { flex: 1 },
  listContent: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },

  loadingOlder: {
    paddingVertical: spacing.md,
    alignItems: 'center',
  },

  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.sm,
  },
  emptyTitle: { ...theme.fonts.titleLarge, color: colors.onBackground },
  emptyText: {
    ...typography.body,
    color: colors.secondary,
    textAlign: 'center',
  },
});