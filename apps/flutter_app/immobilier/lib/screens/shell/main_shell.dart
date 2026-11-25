import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/router.dart';
import '../../core/theme.dart';
import '../../providers/auth_providers.dart';
import '../../providers/notification_providers.dart';
import 'notification_banner_listener.dart';

// --------------------------------------------------
// Tabs — same order as AppRoutes.tabs
// --------------------------------------------------

@immutable
class _TabItem {
  const _TabItem({
    required this.icon,
    required this.selectedIcon,
    required this.label,
  });

  final IconData icon;
  final IconData selectedIcon;
  final String label;
}

const List<_TabItem> _tabItems = [
  _TabItem(icon: Icons.home_outlined, selectedIcon: Icons.home, label: 'Home'),
  _TabItem(
    icon: Icons.favorite_border,
    selectedIcon: Icons.favorite,
    label: 'Favorites',
  ),
  _TabItem(icon: Icons.add, selectedIcon: Icons.add, label: 'Add'),
  _TabItem(
    icon: Icons.chat_bubble_outline,
    selectedIcon: Icons.chat_bubble,
    label: 'Chats',
  ),
  _TabItem(
    icon: Icons.person_outline,
    selectedIcon: Icons.person,
    label: 'Profile',
  ),
];

/// Index of the "Add" tab, highlighted as the primary action.
const int _addTabIndex = 2;

// --------------------------------------------------
// Main Shell
// --------------------------------------------------

class MainShell extends ConsumerWidget {
  const MainShell({super.key, required this.navigationShell});

  final StatefulNavigationShell navigationShell;

  void _onTabSelected(BuildContext context, WidgetRef ref, int index) {
    final tabPath = AppRoutes.tabs[index];
    final loggedIn = ref.read(sessionProvider) != null;

    if (!loggedIn && AppRoutes.protectedPaths.contains(tabPath)) {
      context.push(AppRoutes.loginLocation(from: tabPath));
      return;
    }

    navigationShell.goBranch(
      index,
      initialLocation: index == navigationShell.currentIndex,
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final userId = ref.watch(sessionProvider)?.user.id;
    final feed = userId == null
        ? null
        : ref.watch(notificationFeedProvider(userId));

    return Scaffold(
      backgroundColor: AppColors.background,
      body: Stack(
        children: [
          navigationShell,
          if (feed != null)
            NotificationBannerListener(
              key: ValueKey(userId),
              notifications: feed.stream,
              onOpen: () {
                if (context.mounted) context.push(AppRoutes.notifications);
              },
            ),
        ],
      ),
      bottomNavigationBar: _AppNavigationBar(
        selectedIndex: navigationShell.currentIndex,
        onSelected: (index) => _onTabSelected(context, ref, index),
      ),
    );
  }
}

// --------------------------------------------------
// Navigation Bar
// --------------------------------------------------

class _AppNavigationBar extends StatelessWidget {
  const _AppNavigationBar({
    required this.selectedIndex,
    required this.onSelected,
  });

  final int selectedIndex;
  final ValueChanged<int> onSelected;

  static const TextStyle _labelStyle = TextStyle(
    fontFamily: AppFontConfig.fontFamily,
    fontSize: 12,
    fontWeight: FontWeight.w500,
    height: 16 / 12,
    letterSpacing: 0.5,
  );

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.fromLTRB(12, 0, 12, 8),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: AppColors.outlineVariant),
        boxShadow: const [
          BoxShadow(
            color: Color(0x120C3448),
            offset: Offset(0, 8),
            blurRadius: 24,
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(24),
        child: NavigationBarTheme(
          data: NavigationBarThemeData(
            height: 72,
            elevation: 0,
            backgroundColor: AppColors.surface,
            surfaceTintColor: Colors.transparent,
            shadowColor: Colors.transparent,
            indicatorColor: AppColors.accent.withValues(alpha: 0.12),
            indicatorShape: const StadiumBorder(),
            labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
            iconTheme: WidgetStateProperty.resolveWith((states) {
              final selected = states.contains(WidgetState.selected);
              return IconThemeData(
                size: 24,
                color: selected ? AppColors.primary : AppColors.secondary,
              );
            }),
            labelTextStyle: WidgetStateProperty.resolveWith((states) {
              final selected = states.contains(WidgetState.selected);
              return _labelStyle.copyWith(
                color: selected ? AppColors.primary : AppColors.secondary,
              );
            }),
          ),
          child: NavigationBar(
            selectedIndex: selectedIndex,
            onDestinationSelected: onSelected,
            destinations: [
              for (var i = 0; i < _tabItems.length; i++)
                if (i == _addTabIndex)
                  _buildAddDestination(_tabItems[i])
                else
                  NavigationDestination(
                    icon: Icon(_tabItems[i].icon),
                    selectedIcon: Icon(_tabItems[i].selectedIcon),
                    label: _tabItems[i].label,
                  ),
            ],
          ),
        ),
      ),
    );
  }

  /// The "Add" tab is the one emphasized element: a filled primary pill
  /// that covers the selection indicator, so it reads the same in both states.
  NavigationDestination _buildAddDestination(_TabItem item) {
    const pill = _AddPill();

    return NavigationDestination(
      icon: pill,
      selectedIcon: pill,
      label: item.label,
    );
  }
}

class _AddPill extends StatelessWidget {
  const _AddPill();

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 52,
      height: 40,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: AppColors.accent,
        borderRadius: BorderRadius.circular(15),
      ),
      child: const Icon(Icons.add, size: 24, color: AppColors.onPrimary),
    );
  }
}
