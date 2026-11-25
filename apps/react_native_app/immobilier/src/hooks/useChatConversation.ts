import { useCallback, useEffect, useRef, useState } from 'react';

import { supabase } from '../lib/supabase';
import { chatService } from '../services/chatService';
import { messageService } from '../services/messageService';
import type { ChatWithRelations, Message } from '../types/chat';

const PAGE_SIZE = 50;

function createTempId(): string {
  return `temp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export interface UseChatConversationResult {
  chat: ChatWithRelations | null;
  messages: Message[];
  loading: boolean;
  loadError: string | null;
  sending: boolean;
  sendError: string | null;
  hasMore: boolean;
  loadingOlder: boolean;
  sendMessage: (content: string) => Promise<void>;
  retryMessage: (message: Message) => Promise<void>;
  loadOlder: () => Promise<void>;
}

export function useChatConversation(
  chatId: string | undefined,
  userId: string | null,
): UseChatConversationResult {
  const [chat, setChat] = useState<ChatWithRelations | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);

  const messagesRef = useRef<Message[]>([]);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // --------------------------------------------------
  // Initial load: chat + latest page of messages
  // --------------------------------------------------
  useEffect(() => {
    let active = true;

    setChat(null);
    setMessages([]);
    setHasMore(false);
    setSendError(null);
    setLoadError(null);

    if (!chatId || !userId) {
      setLoading(false);
      setLoadError('Invalid conversation.');
      return;
    }

    setLoading(true);

    (async () => {
      try {
        const [chatResult, messageResult] = await Promise.all([
          chatService.getChatById(chatId),
          messageService.getMessages(chatId, { limit: PAGE_SIZE }),
        ]);

        if (!active) return;

        if (!chatResult) {
          setLoadError('This conversation could not be found.');
          return;
        }

        setChat(chatResult);
        setMessages(messageResult);
        setHasMore(messageResult.length === PAGE_SIZE);

        const hasUnread = messageResult.some(
          (m) => m.sender_id !== userId && !m.is_read,
        );
        if (hasUnread) {
          // Fire and forget — local copy already reflects read state visually.
          void messageService.markMessagesAsRead(chatId, userId);
        }
      } catch (error) {
        if (!active) return;
        setLoadError(
          error instanceof Error
            ? error.message
            : 'Unable to open this conversation.',
        );
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [chatId, userId]);

  // --------------------------------------------------
  // Realtime subscription — only after chat is loaded
  // --------------------------------------------------
  useEffect(() => {
    if (!chatId || !userId || !chat) return;

    const channel = supabase
      .channel(`chat-${chatId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `chat_id=eq.${chatId}`,
        },
        (payload) => {
          const incoming = payload.new as Message;

          setMessages((prev) => {
            // Already have this message by id → refresh fields only.
            const byId = prev.findIndex((m) => m.id === incoming.id);
            if (byId !== -1) {
              const next = [...prev];
              next[byId] = { ...incoming, status: 'sent' };
              return next;
            }

            // Our optimistic send — swap by content match.
            if (incoming.sender_id === userId) {
              const optimisticIdx = prev.findIndex(
                (m) =>
                  m.status === 'sending' &&
                  m.sender_id === userId &&
                  m.content === incoming.content,
              );
              if (optimisticIdx !== -1) {
                const next = [...prev];
                next[optimisticIdx] = { ...incoming, status: 'sent' };
                return next;
              }
            }

            return [...prev, incoming];
          });

          if (incoming.sender_id !== userId && !incoming.is_read) {
            void messageService.markMessagesAsRead(chatId, userId);
          }
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `chat_id=eq.${chatId}`,
        },
        (payload) => {
          const updated = payload.new as Message;
          setMessages((prev) =>
            prev.map((m) => (m.id === updated.id ? { ...updated } : m)),
          );
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [chatId, userId, chat?.id]);

  // --------------------------------------------------
  // Send (optimistic)
  // --------------------------------------------------
  const sendMessage = useCallback(
    async (content: string) => {
      if (!chatId || !userId) return;
      const trimmed = content.trim();
      if (!trimmed) return;

      const tempId = createTempId();
      const optimistic: Message = {
        id: tempId,
        chat_id: chatId,
        sender_id: userId,
        content: trimmed,
        is_read: false,
        created_at: new Date().toISOString(),
        status: 'sending',
        tempId,
      };

      setMessages((prev) => [...prev, optimistic]);
      setSending(true);
      setSendError(null);

      try {
        const real = await messageService.sendMessage(chatId, userId, trimmed);
        setMessages((prev) =>
          prev.map((m) =>
            m.tempId === tempId ? { ...real, status: 'sent' } : m,
          ),
        );
      } catch (error) {
        setMessages((prev) =>
          prev.map((m) =>
            m.tempId === tempId ? { ...m, status: 'failed' } : m,
          ),
        );
        setSendError(
          error instanceof Error
            ? error.message
            : 'Failed to send. Tap the message to retry.',
        );
        throw error;
      } finally {
        setSending(false);
      }
    },
    [chatId, userId],
  );

  // --------------------------------------------------
  // Retry a failed optimistic message
  // --------------------------------------------------
  const retryMessage = useCallback(
    async (message: Message) => {
      if (!chatId || !userId || message.status !== 'failed') return;

      const match = (m: Message) =>
        m.id === message.id || (m.tempId && m.tempId === message.tempId);

      setMessages((prev) =>
        prev.map((m) => (match(m) ? { ...m, status: 'sending' } : m)),
      );
      setSending(true);
      setSendError(null);

      try {
        const real = await messageService.sendMessage(
          chatId,
          userId,
          message.content,
        );
        setMessages((prev) =>
          prev.map((m) => (match(m) ? { ...real, status: 'sent' } : m)),
        );
      } catch (error) {
        setMessages((prev) =>
          prev.map((m) => (match(m) ? { ...m, status: 'failed' } : m)),
        );
        setSendError(
          error instanceof Error ? error.message : 'Failed to send.',
        );
      } finally {
        setSending(false);
      }
    },
    [chatId, userId],
  );

  // --------------------------------------------------
  // Load older messages
  // --------------------------------------------------
  const loadOlder = useCallback(async () => {
    if (!chatId || loadingOlder || !hasMore) return;
    const oldest = messagesRef.current[0];
    if (!oldest) return;

    setLoadingOlder(true);
    try {
      const older = await messageService.getMessages(chatId, {
        limit: PAGE_SIZE,
        beforeIso: oldest.created_at,
      });

      if (older.length === 0) {
        setHasMore(false);
        return;
      }

      setMessages((prev) => [...older, ...prev]);
      setHasMore(older.length === PAGE_SIZE);
    } catch (error) {
      console.error('Failed to load older messages:', error);
    } finally {
      setLoadingOlder(false);
    }
  }, [chatId, hasMore, loadingOlder]);

  return {
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
  };
}