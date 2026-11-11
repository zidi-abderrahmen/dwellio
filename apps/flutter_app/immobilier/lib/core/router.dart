import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../screens/property/add_property_screen.dart';
import '../screens/property/property_details_screen.dart';
import '../main.dart' show HomeScreen;
import '../providers/auth_providers.dart';
import '../screens/auth/login_screen.dart';
import '../screens/auth/register_screen.dart';
import '../screens/placeholder_screen.dart';
import '../screens/profile/profile_screen.dart';
import '../screens/shell/main_shell.dart';

abstract final class AppRoutes {
  static const login = '/login';
  static const register = '/register';
  static const home = '/home';
  static const favorites = '/favorites';
  static const add = '/add';
  static const chats = '/chats';
  static const profile = '/profile';
  static const propertyDetails = '/property/:id';

  /// Same order as the bottom navigation tabs
  static const tabs = [home, favorites, add, chats, profile];

  /// Tabs that require an account
  static const protectedPaths = {favorites, add, chats, profile};

  static bool isAuthPage(String location) =>
      location == login || location == register;

  static String loginLocation({String? from}) => _withFrom(login, from);
  static String registerLocation({String? from}) => _withFrom(register, from);

  static String _withFrom(String path, String? from) {
    if (from == null || !tabs.contains(from)) return path;
    return Uri(path: path, queryParameters: {'from': from}).toString();
  }

  static String propertyDetailsLocation(String id) =>
      '/property/${Uri.encodeComponent(id)}';
}

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

      if (!loggedIn && AppRoutes.protectedPaths.contains(location)) {
        return AppRoutes.loginLocation(from: location);
      }

      if (loggedIn && AppRoutes.isAuthPage(location)) {
        final from = state.uri.queryParameters['from'];
        if (from != null && AppRoutes.tabs.contains(from)) return from;
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
                builder: (context, state) =>
                    const PlaceholderScreen(title: 'Favorites'),
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
                builder: (context, state) =>
                    const PlaceholderScreen(title: 'Chats'),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: AppRoutes.profile,
                builder: (context, state) => const ProfileScreen(),
              ),
            ],
          ),
        ],
      ),
    ],
  );
});
