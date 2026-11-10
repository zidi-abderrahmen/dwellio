import 'package:supabase_flutter/supabase_flutter.dart';

import '../models/property_models.dart';

final SupabaseClient _supabase = Supabase.instance.client;

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

/// --------------------------------------------------
/// Get Properties
/// --------------------------------------------------

Future<List<PropertySearchResult>> getProperties() async {
  final response = await _supabase
      .from('properties')
      .select('''
        id, owner_id, title, description, listing_type, property_type,
        price, surface_m2, rooms, bathrooms, city, address, latitude,
        longitude, status, created_at, updated_at,
        property_images (image_url, position),
        profiles!properties_owner_id_fkey (full_name, phone, avatar_url)
      ''')
      .eq('status', 'active')
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

/// --------------------------------------------------
/// Get Property By ID
/// --------------------------------------------------

Future<PropertyWithRelations> getPropertyById(String id) async {
  final propertyId = id.trim();

  if (propertyId.isEmpty) {
    throw Exception('A valid property ID is required.');
  }

  final response = await _supabase
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