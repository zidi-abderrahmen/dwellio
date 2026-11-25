import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

export 'app_routes.dart';

import 'app_routes.dart';
import '../screens/property/add_property_screen.dart';
import '../screens/property/property_details_screen.dart';
import '../screens/property/my_listings_screen.dart';
import '../main.dart' show HomeScreen;
import '../providers/auth_providers.dart';
import '../screens/auth/login_screen.dart';
import '../screens/auth/register_screen.dart';
import '../screens/chat/chat_screen.dart';
import '../screens/chat/chats_screen.dart';
import '../screens/favorites/favorites_screen.dart';
import '../screens/profile/profile_screen.dart';
import '../screens/shell/main_shell.dart';
import '../screens/notifications/notifications_screen.dart';

final routerProvider = Provider<GoRouter>((ref) {
  final refresh = ValueNotifier<int>(0);
  ref.listen(authStateProvider, (_, _) => refresh.value++);
  ref.onDispose(refresh.dispose);

  return GoRouter(
    initialLocation: AppRoutes.home,
    refreshListenable: refresh,
    redirect: (context, state) {
      final loggedIn = ref.read(sessionProvider) != null;
      final location = state.matchedLocation;

      if (!loggedIn && AppRoutes.isProtectedLocation(location)) {
        return AppRoutes.loginLocation(from: location);
      }

      if (loggedIn && AppRoutes.isAuthPage(location)) {
        final from = state.uri.queryParameters['from'];
        if (from != null && AppRoutes.isProtectedLocation(from)) {
          return from;
        }
        return AppRoutes.home;
      }

      return null;
    },
    routes: [
      GoRoute(
        path: AppRoutes.login,
        builder: (context, state) =>
            LoginScreen(from: state.uri.queryParameters['from']),
      ),
      GoRoute(
        path: AppRoutes.register,
        builder: (context, state) =>
            RegisterScreen(from: state.uri.queryParameters['from']),
      ),
      GoRoute(
        path: AppRoutes.propertyDetails,
        name: 'property-details',
        builder: (context, state) {
          final propertyId = state.pathParameters['id']!;

          return PropertyDetailsScreen(propertyId: propertyId);
        },
      ),
      GoRoute(
        path: AppRoutes.chat,
        builder: (context, state) =>
            ChatScreen(chatId: state.pathParameters['chatId']!),
      ),
      GoRoute(
        path: AppRoutes.notifications,
        builder: (context, state) => const NotificationsScreen(),
      ),
      StatefulShellRoute.indexedStack(
        builder: (context, state, navigationShell) =>
            MainShell(navigationShell: navigationShell),
        branches: [
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: AppRoutes.home,
                builder: (context, state) => const HomeScreen(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: AppRoutes.favorites,
                builder: (context, state) => const FavoritesScreen(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: AppRoutes.add,
                builder: (context, state) => const AddPropertyScreen(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: AppRoutes.chats,
                builder: (context, state) => const ChatsScreen(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: AppRoutes.profile,
                builder: (context, state) => const ProfileScreen(),
                routes: [
                  GoRoute(
                    path: 'my-listings',
                    builder: (context, state) => const MyListingsScreen(),
                    routes: [
                      GoRoute(
                        path: ':id/edit',
                        builder: (context, state) => AddPropertyScreen(
                          propertyId: state.pathParameters['id']!,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ],
          ),
        ],
      ),
    ],
  );
});
