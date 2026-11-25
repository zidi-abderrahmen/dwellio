import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ListRenderItemInfo,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';

import { useAuthSession } from '../../context/AuthContext';
import { chatService } from '../../services/chatService';
import { ConversationRow } from '../../components/chats/ConversationRow';
import { theme, spacing, radius, typography } from '../../theme';
import type { ChatWithRelations } from '../../types/chat';

const colors = theme.colors;

export default function ChatsScreen() {
  const { session } = useAuthSession();
  const userId = session?.user?.id ?? null;
  const router = useRouter();

  const [chats, setChats] = useState<ChatWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const isMounted = useRef(false);
  const requestId = useRef(0);

  const loadChats = useCallback(
    async (opts?: { refresh?: boolean }) => {
      if (!userId) {
        setLoading(false);
        return;
      }

      const currentRequestId = ++requestId.current;

      if (opts?.refresh) setRefreshing(true);
      else setLoading(true);
      setLoadError(null);

      try {
        const data = await chatService.getChatsForCurrentUser();

        if (isMounted.current && requestId.current === currentRequestId) {
          setChats(data);
        }
      } catch (error) {
        if (isMounted.current && requestId.current === currentRequestId) {
          console.error('Failed to load conversations:', error);
          setLoadError(
            error instanceof Error
              ? error.message
              : 'Unable to load your conversations. Please try again.',
          );
        }
      } finally {
        if (isMounted.current && requestId.current === currentRequestId) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [userId],
  );

  useFocusEffect(
    useCallback(() => {
      isMounted.current = true;
      void loadChats();

      return () => {
        isMounted.current = false;
        requestId.current += 1;
      };
    }, [loadChats]),
  );

  const filteredChats = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return chats;

    return chats.filter((chat) => {
      const isBuyer = userId === chat.buyer_id;
      const participant = isBuyer ? chat.owner : chat.buyer;
      const name = participant?.full_name?.toLowerCase() ?? '';
      const title = chat.properties?.title?.toLowerCase() ?? '';
      return name.includes(q) || title.includes(q);
    });
  }, [chats, query, userId]);

  const handleChatPress = useCallback(
    (chatId: string) => {
      router.push({ pathname: '/chat/[id]', params: { id: chatId } });
    },
    [router],
  );

  const renderChat = useCallback(
    ({ item }: ListRenderItemInfo<ChatWithRelations>) => (
      <ConversationRow
        chat={item}
        userId={userId}
        onPress={handleChatPress}
      />
    ),
    [userId, handleChatPress],
  );

  // --------------------------------------------------
  // State views
  // --------------------------------------------------

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar style="dark" />
        <View style={styles.stateContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.stateText}>Loading conversations…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (loadError) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar style="dark" />
        <View style={styles.stateContainer}>
          <Ionicons
            name="alert-circle-outline"
            size={48}
            color={colors.error}
          />
          <Text style={styles.stateText}>{loadError}</Text>
          <Pressable
            style={styles.primaryButton}
            onPress={() => void loadChats()}
            accessibilityRole="button"
          >
            <Text style={styles.primaryButtonText}>Try again</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (chats.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar style="dark" />
        <View style={styles.stateContainer}>
          <Ionicons
            name="chatbubbles-outline"
            size={64}
            color={colors.placeholder}
          />
          <Text style={styles.stateTitle}>No conversations yet</Text>
          <Text style={styles.stateText}>
            Find a property you love and contact its owner to start chatting.
          </Text>
          <Pressable
            style={styles.primaryButton}
            onPress={() => router.push('/')}
            accessibilityRole="button"
          >
            <Text style={styles.primaryButtonText}>Browse properties</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="dark" />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
        <Text style={styles.headerCount}>
          {chats.length} {chats.length === 1 ? 'conversation' : 'conversations'}
        </Text>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color={colors.secondary} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search by name or property"
          placeholderTextColor={colors.placeholder}
          style={styles.searchInput}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
          onSubmitEditing={Keyboard.dismiss}
          accessibilityLabel="Search conversations"
        />
        {query.length > 0 && (
          <Pressable
            onPress={() => setQuery('')}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Clear search"
          >
            <Ionicons
              name="close-circle"
              size={18}
              color={colors.secondary}
            />
          </Pressable>
        )}
      </View>

      <FlatList
        data={filteredChats}
        keyExtractor={(item) => item.id}
        renderItem={renderChat}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        initialNumToRender={12}
        windowSize={7}
        removeClippedSubviews
        ListEmptyComponent={
          <View style={styles.emptySearch}>
            <Text style={styles.stateText}>
              No conversations match “{query}”.
            </Text>
          </View>
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void loadChats({ refresh: true })}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  headerTitle: { ...theme.fonts.headlineSmall, color: colors.onBackground },
  headerCount: {
    ...typography.caption,
    color: colors.secondary,
    marginTop: 2,
  },

  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceVariant,
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    color: colors.onBackground,
    paddingVertical: 0,
  },

  listContent: { paddingBottom: spacing.xxl },

  stateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  stateTitle: { ...theme.fonts.titleLarge, color: colors.onBackground },
  stateText: {
    ...typography.body,
    color: colors.secondary,
    textAlign: 'center',
  },
  emptySearch: { padding: spacing.xl, alignItems: 'center' },

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
});