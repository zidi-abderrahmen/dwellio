import { useEffect } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  Stack,
  useGlobalSearchParams,
  usePathname,
  useRouter,
  type Href,
} from 'expo-router';

import { AuthProvider, useAuthSession } from '../context/AuthContext';
import { FavoriteProvider } from '../context/FavoriteContext';
import { NotificationProvider } from '../context/NotificationContext';
import { theme } from '../theme';

// --------------------------------------------------
// Route configuration — matched by first URL segment so
// dynamic routes (e.g. /chat/abc) are covered too.
// --------------------------------------------------

const AUTH_ROOTS = new Set(['login', 'register']);

const PROTECTED_ROOTS = new Set([
  'favorites',
  'add',
  'chats',
  'chat',
  'profile',
  'my-listings',
  'notifications',
]);

function firstSegment(pathname: string): string | undefined {
  return pathname.split('/').filter(Boolean)[0];
}

function isAuthRoute(pathname: string): boolean {
  const seg = firstSegment(pathname);
  return seg !== undefined && AUTH_ROOTS.has(seg);
}

function isProtectedRoute(pathname: string): boolean {
  const seg = firstSegment(pathname);
  return seg !== undefined && PROTECTED_ROOTS.has(seg);
}

/**
 * Only accept redirects back to internal, whitelisted paths.
 * Prevents open-redirect issues from a tampered `from` param.
 */
function isSafeRedirect(location: string | undefined): location is string {
  if (!location || !location.startsWith('/')) return false;
  const seg = firstSegment(location);
  return seg !== undefined && PROTECTED_ROOTS.has(seg);
}

// --------------------------------------------------
// Root navigator
// --------------------------------------------------

function RootNavigator() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useGlobalSearchParams<{ from?: string | string[] }>();
  const { session, isLoading } = useAuthSession();

  const from = Array.isArray(params.from) ? params.from[0] : params.from;

  useEffect(() => {
    if (isLoading) return;

    const loggedIn = session !== null;

    // 1. Guest hitting a protected page → login
    if (!loggedIn && isProtectedRoute(pathname)) {
      router.replace({
        pathname: '/login',
        params: { from: pathname },
      });
      return;
    }

    // 2. Authenticated user on auth pages → intended destination or home
    if (loggedIn && isAuthRoute(pathname)) {
      const destination: Href = isSafeRedirect(from) ? (from as Href) : '/';
      router.replace(destination);
    }
  }, [from, isLoading, pathname, router, session]);

  if (isLoading) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="my-listings" />
      <Stack.Screen
        name="chat/[id]"
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="property/[id]"
        options={{ animation: 'slide_from_right' }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <FavoriteProvider>
          <NotificationProvider>
            <RootNavigator />
          </NotificationProvider>
        </FavoriteProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background,
  },
});