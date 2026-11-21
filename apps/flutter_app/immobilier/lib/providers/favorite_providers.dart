import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../services/favorite_service.dart';
import 'auth_providers.dart';

final favoriteServiceProvider = Provider<FavoriteService>(
  (ref) => FavoriteService(Supabase.instance.client),
);

/// Holds the currently authenticated user's favorited property IDs in memory.
///
/// This is the shared source of favorite state used by Home, Property Details
/// and the Favorites screen so the heart stays consistent across screens.
final favoritePropertyIdsProvider =
    NotifierProvider<FavoritePropertyIdsNotifier, Set<String>>(
  FavoritePropertyIdsNotifier.new,
);

class FavoritePropertyIdsNotifier extends Notifier<Set<String>> {
  final Set<String> _inFlight = <String>{};

  @override
  Set<String> build() => const {};

  /// Loads the favorite IDs for the current user from Supabase.
  Future<void> load() async {
    final session = ref.read(sessionProvider);
    if (session == null) return;

    final ids = await ref.read(favoriteServiceProvider).getFavoritePropertyIds();
    state = ids;
  }

  /// Optimistically adds a property ID and persists it to Supabase.
  Future<void> add(String id) async {
    if (_inFlight.contains(id)) return;
    _inFlight.add(id);

    state = {...state, id};
    try {
      await ref.read(favoriteServiceProvider).addFavorite(id);
    } catch (error) {
      state = state..remove(id);
      rethrow;
    } finally {
      _inFlight.remove(id);
    }
  }

  /// Optimistically removes a property ID and persists it to Supabase.
  Future<void> remove(String id) async {
    if (_inFlight.contains(id)) return;
    _inFlight.add(id);

    final newState = {...state}..remove(id);
    state = newState;
    try {
      await ref.read(favoriteServiceProvider).removeFavorite(id);
    } catch (error) {
      state = {...state, id};
      rethrow;
    } finally {
      _inFlight.remove(id);
    }
  }

  void clear() => state = {};
}