import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import {
  Stack,
  useGlobalSearchParams,
  usePathname,
  useRouter,
  type Href,
} from 'expo-router';

import {
  AuthProvider,
  useAuthSession,
} from '../context/AuthContext';

// --------------------------------------------------
// Routes
// --------------------------------------------------

const AUTH_ROUTES = ['/login', '/register'] as const;

const TAB_ROUTES = [
  '/',
  '/favorites',
  '/add',
  '/chats',
  '/profile',
] as const;

const PROTECTED_ROUTES = [
  '/favorites',
  '/add',
  '/chats',
  '/profile',
] as const;

// --------------------------------------------------
// Route Helpers
// --------------------------------------------------

function isTabRoute(
  location: unknown,
): location is (typeof TAB_ROUTES)[number] {
  return (
    typeof location === 'string' &&
    (TAB_ROUTES as readonly string[]).includes(location)
  );
}

// --------------------------------------------------
// Root Navigator
// --------------------------------------------------

function RootNavigator() {
  const router = useRouter();
  const pathname = usePathname();

  const params = useGlobalSearchParams<{
    from?: string | string[];
  }>();

  const { session, isLoading } = useAuthSession();

  const from = Array.isArray(params.from)
    ? params.from[0]
    : params.from;

  useEffect(() => {
    if (isLoading) return;

    const loggedIn = session !== null;

    const isAuthPage = (
      AUTH_ROUTES as readonly string[]
    ).includes(pathname);

    const isProtectedPage = (
      PROTECTED_ROUTES as readonly string[]
    ).includes(pathname);

    // Guest trying to access a protected route.
    if (!loggedIn && isProtectedPage) {
      router.replace({
        pathname: '/login',
        params: { from: pathname },
      });

      return;
    }

    // Authenticated user trying to access Login/Register.
    if (loggedIn && isAuthPage) {
      const destination = isTabRoute(from) ? from : '/';

      router.replace(destination as Href);
    }
  }, [from, isLoading, pathname, router, session]);

  // Wait for the initial Supabase session.
  if (isLoading) {
    return null;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}

// --------------------------------------------------
// Root Layout
// --------------------------------------------------

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}