import 'package:supabase_flutter/supabase_flutter.dart';

import '../models/property_models.dart';

final supabase = Supabase.instance.client;

// --------------------------------------------------
// Helper: Sort property images by display position
// --------------------------------------------------

List<Map<String, dynamic>> _sortPropertyImages(Object? images) {
  if (images is! List) {
    return [];
  }

  final sortedImages = images
      .map((image) => Map<String, dynamic>.from(image as Map))
      .toList();

  sortedImages.sort((first, second) {
    final firstPosition = (first['position'] as num?) ?? 0;
    final secondPosition = (second['position'] as num?) ?? 0;

    return firstPosition.compareTo(secondPosition);
  });

  return sortedImages;
}

// --------------------------------------------------
// Get Properties
// Loads active properties for home/explore list.
// Only the first image is needed for each property card.
// --------------------------------------------------

Future<List<PropertySearchResult>> getProperties() async {
  try {
    final data = await supabase
        .from('properties')
        .select('''
          id,
          owner_id,
          title,
          description,
          listing_type,
          property_type,
          price,
          surface_m2,
          rooms,
          bathrooms,
          city,
          address,
          latitude,
          longitude,
          status,
          created_at,
          updated_at,
          property_images (
            image_url,
            position
          ),
          profiles!properties_owner_id_fkey (
            full_name,
            phone,
            avatar_url
          )
        ''')
        .eq('status', 'active')
        .order('created_at', ascending: false)
        .limit(30);

    final rows = (data as List)
        .map((row) => Map<String, dynamic>.from(row as Map))
        .toList();

    return rows.map((property) {
      // Sort images by position.
      final sortedImages = _sortPropertyImages(
        property['property_images'],
      );

      // Keep only the first image for the property card.
      property['property_images'] = sortedImages.take(1).toList();

      // Keep owner profile nullable.
      return PropertySearchResult.fromJson(property);
    }).toList();
  } catch (error) {
    throw Exception('Failed to load properties: $error');
  }
}

// --------------------------------------------------
// Get Property By ID
// Loads one property with all images and owner profile.
// All images are sorted by position for the details carousel.
// --------------------------------------------------

Future<PropertyWithRelations> getPropertyById(String id) async {
  final propertyId = id.trim();

  if (propertyId.isEmpty) {
    throw Exception('A valid property ID is required.');
  }

  try {
    final data = await supabase
        .from('properties')
        .select('''
          *,
          property_images (*),
          profiles!properties_owner_id_fkey (*)
        ''')
        .eq('id', propertyId)
        .maybeSingle();

    if (data == null) {
      throw Exception('Property not found.');
    }

    final property = Map<String, dynamic>.from(data);

    // Sort all property images.
    property['property_images'] = _sortPropertyImages(
      property['property_images'],
    );

    // Owner profile can be null.
    return PropertyWithRelations.fromJson(property);
  } catch (error) {
    if (error.toString().contains('Property not found')) {
      rethrow;
    }

    throw Exception('Failed to load property details: $error');
  }
}