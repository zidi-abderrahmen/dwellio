abstract final class AppRoutes {
  static const login = '/login';
  static const register = '/register';
  static const home = '/home';
  static const favorites = '/favorites';
  static const add = '/add';
  static const chats = '/chats';
  static const chat = '/chats/:chatId';
  static const notifications = '/notifications';
  static const profile = '/profile';
  static const myListings = '/profile/my-listings';
  static const propertyDetails = '/property/:id';

  /// Same order as the bottom navigation tabs.
  static const tabs = [home, favorites, add, chats, profile];

  /// Tabs and pages that require an account.
  static const protectedPaths = {
    favorites,
    add,
    chats,
    profile,
    myListings,
    notifications,
  };

  static bool isAuthPage(String location) =>
      location == login || location == register;

  static bool isProtectedLocation(String location) =>
      protectedPaths.contains(location) ||
      location.startsWith('$myListings/') ||
      location.startsWith('$chats/');

  static String loginLocation({String? from}) => _withFrom(login, from);
  static String registerLocation({String? from}) => _withFrom(register, from);

  static String _withFrom(String path, String? from) {
    if (from == null || !protectedPaths.contains(from)) return path;
    return Uri(path: path, queryParameters: {'from': from}).toString();
  }

  static String propertyDetailsLocation(String id) =>
      '/property/${Uri.encodeComponent(id)}';
  static String chatLocation(String chatId) =>
      '$chats/${Uri.encodeComponent(chatId)}';
  static String editPropertyLocation(String id) =>
      '$myListings/${Uri.encodeComponent(id)}/edit';
}
