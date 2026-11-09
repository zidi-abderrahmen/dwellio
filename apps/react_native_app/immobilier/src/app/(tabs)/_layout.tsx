
import { Tabs, useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import { useAuthSession } from '../../context/AuthContext';
import { theme } from '../../theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const colors = theme.colors;

type ProtectedTabPath =
  | '/favorites'
  | '/add'
  | '/chats'
  | '/profile';

export default function TabLayout() {
  const router = useRouter();
  const { session } = useAuthSession();
  const insets = useSafeAreaInsets();

  // Redirect unauthenticated users before switching tabs.
  const requireAuthentication = (destination: ProtectedTabPath) => ({
    tabPress: (event: { preventDefault: () => void }) => {
      if (!session) {
        event.preventDefault();

        router.push({
          pathname: '/login',
          params: { from: destination },
        });
      }
    },
  });

  return (
    <Tabs
      screenOptions={{
        headerShown: false,

        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.secondary,

        tabBarShowLabel: true,
        tabBarHideOnKeyboard: true,

        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
          marginTop: 2,
        },

        tabBarStyle: {
          backgroundColor: colors.surface,

          borderTopColor: colors.outline,
          borderTopWidth: 0.5,

          // Responsive height
          height: 64 + insets.bottom,

          // Respect the phone's bottom navigation area
          paddingTop: 8,
          paddingBottom: Math.max(insets.bottom, 8),
        },

        tabBarIconStyle: {
          marginTop: 0,
        },

        tabBarItemStyle: {
          height: 56,
        },
      }}
    >
      {/* Home */}

      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarLabel: 'Home',

          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'home' : 'home-outline'}
              size={size}
              color={typeof color === 'number' ? colors.primary : color ?? colors.primary}
            />
          ),
        }}
      />

      {/* Favorites */}

      <Tabs.Screen
        name="favorites"
        listeners={requireAuthentication('/favorites')}
        options={{
          title: 'Favorites',
          tabBarLabel: 'Favorites',

          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'heart' : 'heart-outline'}
              size={size}
              color={typeof color === 'number' ? colors.primary : color ?? colors.primary}
            />
          ),
        }}
      />

      {/* Add Property */}

      <Tabs.Screen
        name="add"
        listeners={requireAuthentication('/add')}
        options={{
          title: 'Add',
          tabBarLabel: 'Add',

          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={
                focused
                  ? 'add-circle'
                  : 'add-circle-outline'
              }
              size={size + 2}
              color={typeof color === 'number' ? colors.primary : color ?? colors.primary}
            />
          ),
        }}
      />

      {/* Chats */}

      <Tabs.Screen
        name="chats"
        listeners={requireAuthentication('/chats')}
        options={{
          title: 'Chats',
          tabBarLabel: 'Chats',

          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={
                focused
                  ? 'chatbubbles'
                  : 'chatbubbles-outline'
              }
              size={size}
              color={typeof color === 'number' ? colors.primary : color ?? colors.primary}
            />
          ),
        }}
      />

      {/* Profile */}

      <Tabs.Screen
        name="profile"
        listeners={requireAuthentication('/profile')}
        options={{
          title: 'Profile',
          tabBarLabel: 'Profile',

          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'person' : 'person-outline'}
              size={size}
              color={typeof color === 'number' ? colors.primary : color ?? colors.primary}
            />
          ),
        }}
      />
    </Tabs>
  );
}