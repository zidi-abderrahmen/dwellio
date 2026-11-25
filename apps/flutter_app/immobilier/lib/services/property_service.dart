import 'dart:typed_data';

import 'package:supabase_flutter/supabase_flutter.dart';

import '../core/supabase_config.dart';
import '../models/property_models.dart';

class PropertyCreationFailure implements Exception {
  const PropertyCreationFailure(this.message);

  final String message;

  @override
  String toString() => message;
}

class PropertyQueryFailure implements Exception {
  const PropertyQueryFailure(this.message);

  final String message;

  @override
  String toString() => message;
}

class PropertyDeletionFailure implements Exception {
  const PropertyDeletionFailure(this.message, {this.propertyDeleted = false});

  final String message;
  final bool propertyDeleted;

  @override
  String toString() => message;
}

class PropertyUpdateFailure implements Exception {
  const PropertyUpdateFailure(this.message);

  final String message;

  @override
  String toString() => message;
}

/// Sorts property images by their position.
List<T> _sortPropertyImages<T>(
  List<T>? images,
  int Function(T image) getPosition,
) {
  if (images == null) {
    return [];
  }

  final sortedImages = List<T>.from(images);
  sortedImages.sort(
    (first, second) => getPosition(first).compareTo(getPosition(second)),
  );
  return sortedImages;
}

class PropertyService {
  PropertyService([SupabaseClient? client])
    : _client = client ?? Supabase.instance.client;

  final SupabaseClient _client;

  /// Creates a property owned by the currently authenticated user.
  Future<Property> createProperty({
    required String title,
    String? description,
    required ListingType listingType,
    required PropertyType propertyType,
    required double price,
    int? surfaceM2,
    int? rooms,
    required String city,
    required double latitude,
    required double longitude,
  }) async {
    final user = _client.auth.currentUser;
    if (user == null) {
      throw const PropertyCreationFailure(
        'Please sign in again to publish a property.',
      );
    }

    final normalizedTitle = title.trim();
    final normalizedCity = city.trim();
    final normalizedDescription = description?.trim();
    if (normalizedTitle.isEmpty || normalizedCity.isEmpty) {
      throw const PropertyCreationFailure(
        'A title and city are required to publish a property.',
      );
    }
    if (!price.isFinite || price < 0) {
      throw const PropertyCreationFailure('Enter a valid non-negative price.');
    }
    if (!latitude.isFinite ||
        latitude < -90 ||
        latitude > 90 ||
        !longitude.isFinite ||
        longitude < -180 ||
        longitude > 180) {
      throw const PropertyCreationFailure(
        'Select a valid location on the map.',
      );
    }

    final payload = {
      'owner_id': user.id,
      'title': normalizedTitle,
      'description':
          normalizedDescription == null || normalizedDescription.isEmpty
          ? null
          : normalizedDescription,
      'listing_type': listingType.value,
      'property_type': propertyType.value,
      'price': price,
      'surface_m2': surfaceM2,
      'rooms': rooms,
      'city': normalizedCity,
      'latitude': latitude,
      'longitude': longitude,
    };

    try {
      final response = await _client
          .from('properties')
          .insert(payload)
          .select()
          .single();

      return Property.fromJson(response);
    } on PostgrestException catch (error) {
      if (error.code == '42501') {
        throw const PropertyCreationFailure(
          'You do not have permission to publish this property.',
        );
      }
      if (error.code == '23514' ||
          error.code == '23502' ||
          error.code == '22003') {
        throw const PropertyCreationFailure(
          'Some property details do not meet the database requirements.',
        );
      }
      throw const PropertyCreationFailure(
        'The property could not be saved. Please try again.',
      );
    }
  }

  /// Uploads an image for an existing property, reusing its path on retries.
  Future<void> uploadPropertyImage({
    required String propertyId,
    required String imageId,
    required Uint8List bytes,
    required String fileName,
    required String? contentType,
    required int position,
  }) async {
    final user = _client.auth.currentUser;
    if (user == null) {
      throw const PropertyCreationFailure(
        'Please sign in again to upload property photos.',
      );
    }

    final extension = fileName.contains('.')
        ? fileName.split('.').last.toLowerCase()
        : 'jpg';
    final safeExtension = RegExp(r'^[a-z0-9]+$').hasMatch(extension)
        ? extension
        : 'jpg';
    final storagePath = '${user.id}/$propertyId/$imageId.$safeExtension';

    final existingImage = await _client
        .from('property_images')
        .select('id')
        .eq('property_id', propertyId)
        .eq('storage_path', storagePath)
        .limit(1)
        .maybeSingle();
    if (existingImage != null) return;

    final storage = _client.storage.from(SupabaseConfig.propertyImagesBucket);
    await storage.uploadBinary(
      storagePath,
      bytes,
      fileOptions: FileOptions(
        contentType: contentType ?? _contentTypeFor(safeExtension),
        upsert: true,
      ),
    );

    await _client.from('property_images').insert({
      'property_id': propertyId,
      'image_url': storage.getPublicUrl(storagePath),
      'storage_path': storagePath,
      'position': position,
    });
  }

  String _contentTypeFor(String extension) {
    return switch (extension) {
      'png' => 'image/png',
      'webp' => 'image/webp',
      'gif' => 'image/gif',
      'heic' => 'image/heic',
      'heif' => 'image/heif',
      _ => 'image/jpeg',
    };
  }

  /// Retrieves active properties matching every provided filter.
  Future<List<PropertySearchResult>> getFilteredProperties(
    PropertyFilters filters,
  ) async {
    var query = _client
        .from('properties')
        .select('''
          id, owner_id, title, description, listing_type, property_type,
          price, surface_m2, rooms, bathrooms, city, address, latitude,
          longitude, status, created_at, updated_at,
          property_images (image_url, position),
          profiles!properties_owner_id_fkey (full_name, phone, avatar_url)
        ''')
        .eq('status', 'active');

    final city = filters.city?.trim();
    if (city != null && city.isNotEmpty) {
      query = query.ilike('city', '%$city%');
    }
    if (filters.minPrice != null) {
      query = query.gte('price', filters.minPrice!);
    }
    if (filters.maxPrice != null) {
      query = query.lte('price', filters.maxPrice!);
    }
    if (filters.propertyType != null) {
      query = query.eq('property_type', filters.propertyType!.value);
    }
    if (filters.listingType != null) {
      query = query.eq('listing_type', filters.listingType!.value);
    }

    final response = await query
        .order('created_at', ascending: false)
        .limit(30);
    final rows = List<Map<String, dynamic>>.from(response);

    return rows.map((propertyJson) {
      final property = PropertySearchResult.fromJson(propertyJson);
      final sortedImages = _sortPropertyImages(
        property.propertyImages,
        (image) => image.position,
      );

      return PropertySearchResult(
        id: property.id,
        ownerId: property.ownerId,
        title: property.title,
        description: property.description,
        listingType: property.listingType,
        propertyType: property.propertyType,
        price: property.price,
        surfaceM2: property.surfaceM2,
        rooms: property.rooms,
        bathrooms: property.bathrooms,
        city: property.city,
        address: property.address,
        latitude: property.latitude,
        longitude: property.longitude,
        status: property.status,
        createdAt: property.createdAt,
        updatedAt: property.updatedAt,
        propertyImages: sortedImages.take(1).toList(),
        profiles: property.profiles,
      );
    }).toList();
  }

  /// Retrieves every property owned by the currently authenticated user.
  Future<List<PropertyWithRelations>> getMyProperties() async {
    final user = _client.auth.currentUser;
    if (user == null) {
      throw const PropertyQueryFailure(
        'Please sign in again to view your properties.',
      );
    }

    final List<dynamic> response;
    try {
      response = await _client
          .from('properties')
          .select('*, property_images (*)')
          .eq('owner_id', user.id)
          .order('created_at', ascending: false);
    } on PostgrestException catch (error) {
      throw PropertyQueryFailure(
        'Unable to load your properties: ${error.message}',
      );
    }

    final rows = List<Map<String, dynamic>>.from(response);

    return rows.map((row) {
      final property = PropertyWithRelations.fromJson(row);
      property.propertyImages.sort(
        (first, second) => first.position.compareTo(second.position),
      );
      return property;
    }).toList();
  }

  /// Retrieves one property only when it belongs to the current user.
  Future<PropertyWithRelations> getMyPropertyById(String id) async {
    final user = _client.auth.currentUser;
    if (user == null) {
      throw const PropertyQueryFailure(
        'Please sign in again to edit this property.',
      );
    }

    final propertyId = id.trim();
    if (propertyId.isEmpty) {
      throw const PropertyQueryFailure('A valid property ID is required.');
    }

    final Map<String, dynamic>? response;
    try {
      response = await _client
          .from('properties')
          .select('*, property_images (*)')
          .eq('id', propertyId)
          .eq('owner_id', user.id)
          .maybeSingle();
    } on PostgrestException catch (error) {
      throw PropertyQueryFailure(
        'Unable to load this property: ${error.message}',
      );
    }

    if (response == null) {
      throw const PropertyQueryFailure(
        'This property could not be found or you do not have permission to edit it.',
      );
    }

    final property = PropertyWithRelations.fromJson(response);
    property.propertyImages.sort(
      (first, second) => first.position.compareTo(second.position),
    );
    return property;
  }

  /// Updates supported property fields without changing the owner or ID.
  Future<Property> updateProperty({
    required String id,
    required String title,
    String? description,
    required ListingType listingType,
    required PropertyType propertyType,
    required double price,
    int? surfaceM2,
    int? rooms,
    required String city,
    required double latitude,
    required double longitude,
  }) async {
    final user = _client.auth.currentUser;
    if (user == null) {
      throw const PropertyUpdateFailure(
        'Please sign in again to update this property.',
      );
    }

    final propertyId = id.trim();
    final normalizedTitle = title.trim();
    final normalizedCity = city.trim();
    final normalizedDescription = description?.trim();
    if (propertyId.isEmpty ||
        normalizedTitle.runes.length < 3 ||
        normalizedTitle.runes.length > 120 ||
        normalizedCity.isEmpty ||
        !price.isFinite ||
        price < 0 ||
        price >= 10000000000 ||
        !latitude.isFinite ||
        latitude < -90 ||
        latitude > 90 ||
        !longitude.isFinite ||
        longitude < -180 ||
        longitude > 180 ||
        (surfaceM2 != null && surfaceM2 <= 0) ||
        (rooms != null && rooms < 0)) {
      throw const PropertyUpdateFailure(
        'Some property details do not meet the requirements.',
      );
    }

    final payload = {
      'title': normalizedTitle,
      'description':
          normalizedDescription == null || normalizedDescription.isEmpty
          ? null
          : normalizedDescription,
      'listing_type': listingType.value,
      'property_type': propertyType.value,
      'price': price,
      'surface_m2': surfaceM2,
      'rooms': rooms,
      'city': normalizedCity,
      'latitude': latitude,
      'longitude': longitude,
    };

    try {
      final response = await _client
          .from('properties')
          .update(payload)
          .eq('id', propertyId)
          .eq('owner_id', user.id)
          .select()
          .maybeSingle();

      if (response == null) {
        throw const PropertyUpdateFailure(
          'This property could not be found or you do not have permission to update it.',
        );
      }

      return Property.fromJson(response);
    } on PostgrestException catch (error) {
      if (error.code == '42501') {
        throw const PropertyUpdateFailure(
          'You do not have permission to update this property.',
        );
      }
      if (error.code == '23514' ||
          error.code == '23502' ||
          error.code == '22003') {
        throw const PropertyUpdateFailure(
          'Some property details do not meet the database requirements.',
        );
      }
      throw PropertyUpdateFailure(
        'The property could not be updated: ${error.message}',
      );
    }
  }

  /// Permanently deletes a property owned by the currently authenticated user.
  Future<void> deleteProperty(String id) async {
    final user = _client.auth.currentUser;
    if (user == null) {
      throw const PropertyDeletionFailure(
        'Please sign in again to delete this property.',
      );
    }

    final propertyId = id.trim();
    if (propertyId.isEmpty) {
      throw const PropertyDeletionFailure('A valid property ID is required.');
    }

    final Map<String, dynamic>? property;
    try {
      property = await _client
          .from('properties')
          .select('id, property_images (storage_path)')
          .eq('id', propertyId)
          .eq('owner_id', user.id)
          .maybeSingle();
    } on PostgrestException catch (error) {
      throw PropertyDeletionFailure(
        'Unable to prepare property deletion: ${error.message}',
      );
    }

    if (property == null) {
      throw const PropertyDeletionFailure(
        'This property could not be found or you do not have permission to delete it.',
      );
    }

    final imageRows = property['property_images'] as List<dynamic>? ?? [];
    final storagePaths = imageRows
        .map((row) => (row as Map<String, dynamic>)['storage_path'] as String)
        .toSet()
        .toList();
    final propertyStoragePrefix = '${user.id}/$propertyId/';
    if (storagePaths.any((path) => !path.startsWith(propertyStoragePrefix))) {
      throw const PropertyDeletionFailure(
        'The property contains an invalid photo storage path and cannot be deleted safely.',
      );
    }

    try {
      final deletedProperty = await _client
          .from('properties')
          .delete()
          .eq('id', propertyId)
          .eq('owner_id', user.id)
          .select('id')
          .maybeSingle();
      if (deletedProperty == null) {
        throw const PropertyDeletionFailure(
          'This property could not be found or you do not have permission to delete it.',
        );
      }
    } on PostgrestException catch (error) {
      throw PropertyDeletionFailure(
        'Unable to delete this property: ${error.message}',
      );
    }

    if (storagePaths.isEmpty) return;

    try {
      await _client.storage
          .from(SupabaseConfig.propertyImagesBucket)
          .remove(storagePaths);
    } on StorageException catch (error) {
      throw PropertyDeletionFailure(
        'The property was deleted, but some photos could not be removed from storage: ${error.message}',
        propertyDeleted: true,
      );
    } catch (error) {
      throw PropertyDeletionFailure(
        'The property was deleted, but some photos could not be removed from storage: $error',
        propertyDeleted: true,
      );
    }
  }

  /// Retrieves a property and its relations by ID.
  Future<PropertyWithRelations> getPropertyById(String id) async {
    final propertyId = id.trim();

    if (propertyId.isEmpty) {
      throw Exception('A valid property ID is required.');
    }

    final response = await _client
        .from('properties')
        .select('''
          *,
          property_images (*),
          profiles!properties_owner_id_fkey (*)
        ''')
        .eq('id', propertyId)
        .maybeSingle();

    if (response == null) {
      throw Exception('Property not found.');
    }

    final property = PropertyWithRelations.fromJson(response);
    final sortedImages = _sortPropertyImages(
      property.propertyImages,
      (image) => image.position,
    );

    return PropertyWithRelations(
      id: property.id,
      ownerId: property.ownerId,
      title: property.title,
      description: property.description,
      listingType: property.listingType,
      propertyType: property.propertyType,
      price: property.price,
      surfaceM2: property.surfaceM2,
      rooms: property.rooms,
      bathrooms: property.bathrooms,
      city: property.city,
      address: property.address,
      latitude: property.latitude,
      longitude: property.longitude,
      status: property.status,
      createdAt: property.createdAt,
      updatedAt: property.updatedAt,
      propertyImages: sortedImages,
      profiles: property.profiles,
    );
  }
}
