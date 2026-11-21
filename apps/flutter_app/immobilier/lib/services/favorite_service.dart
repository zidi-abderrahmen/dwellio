import 'package:supabase_flutter/supabase_flutter.dart';

import '../models/property_models.dart';

/// Thrown when a favorites query cannot be completed.
class FavoriteQueryFailure implements Exception {
  const FavoriteQueryFailure(this.message);

  final String message;

  @override
  String toString() => message;
}

/// Thrown when a favorite cannot be added or removed.
class FavoriteModificationFailure implements Exception {
  const FavoriteModificationFailure(this.message);

  final String message;

  @override
  String toString() => message;
}

/// Handles all Favorites-related Supabase queries.
class FavoriteService {
  FavoriteService([SupabaseClient? client])
    : _client = client ?? Supabase.instance.client;

  final SupabaseClient _client;

  /// Returns the IDs of the properties favorited by the current user.
  Future<Set<String>> getFavoritePropertyIds() async {
    final user = _client.auth.currentUser;
    if (user == null) {
      throw const FavoriteQueryFailure(
        'Please sign in again to view your favorites.',
      );
    }

    try {
      final response = await _client
          .from('favorites')
          .select('property_id')
          .eq('user_id', user.id);

      final rows = List<Map<String, dynamic>>.from(response);
      return rows
          .map((row) => row['property_id'] as String)
          .toSet();
    } on PostgrestException catch (error) {
      throw FavoriteQueryFailure(
        'Unable to load your favorites: ${error.message}',
      );
    }
  }

  /// Adds a property to the current user's favorites.
  Future<void> addFavorite(String propertyId) async {
    final user = _client.auth.currentUser;
    if (user == null) {
      throw const FavoriteModificationFailure(
        'Please sign in again to favorite this property.',
      );
    }

    final normalizedPropertyId = propertyId.trim();
    if (normalizedPropertyId.isEmpty) {
      throw const FavoriteModificationFailure(
        'A valid property ID is required.',
      );
    }

    try {
      await _client.from('favorites').insert({
        'user_id': user.id,
        'property_id': normalizedPropertyId,
      });
    } on PostgrestException catch (error) {
      if (error.code == '23505') {
        throw const FavoriteModificationFailure(
          'This property is already in your favorites.',
        );
      }
      throw FavoriteModificationFailure(
        'Unable to add this property to your favorites: ${error.message}',
      );
    }
  }

  /// Removes a property from the current user's favorites.
  Future<void> removeFavorite(String propertyId) async {
    final user = _client.auth.currentUser;
    if (user == null) {
      throw const FavoriteModificationFailure(
        'Please sign in again to remove this property from your favorites.',
      );
    }

    final normalizedPropertyId = propertyId.trim();
    if (normalizedPropertyId.isEmpty) {
      throw const FavoriteModificationFailure(
        'A valid property ID is required.',
      );
    }

    try {
      await _client
          .from('favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('property_id', normalizedPropertyId);
    } on PostgrestException catch (error) {
      throw FavoriteModificationFailure(
        'Unable to remove this property from your favorites: ${error.message}',
      );
    }
  }

  /// Returns the current user's favorite properties, including their images.
  Future<List<PropertyWithRelations>> getFavoriteProperties() async {
    final user = _client.auth.currentUser;
    if (user == null) {
      throw const FavoriteQueryFailure(
        'Please sign in again to view your favorites.',
      );
    }

    try {
      final response = await _client
          .from('favorites')
          .select('''
            property_id,
            properties (
              *,
              property_images (*),
              profiles!properties_owner_id_fkey (*)
            )
          ''')
          .eq('user_id', user.id)
          .order('created_at', ascending: false);

      final rows = List<Map<String, dynamic>>.from(response);

      return rows.map((row) {
        final propertyJson =
            Map<String, dynamic>.from(row['properties'] as Map);
        final property = PropertyWithRelations.fromJson(propertyJson);
        property.propertyImages.sort(
          (first, second) => first.position.compareTo(second.position),
        );
        return property;
      }).toList();
    } on PostgrestException catch (error) {
      throw FavoriteQueryFailure(
        'Unable to load your favorite properties: ${error.message}',
      );
    }
  }
}