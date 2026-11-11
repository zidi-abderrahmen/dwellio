enum ListingType {
  sale,
  rent;

  String get value => name;
}

enum PropertyType {
  apartment,
  house,
  villa,
  land,
  office,
  shop;

  String get value => name;
}

enum PropertyStatus {
  active,
  sold,
  rented,
  hidden;

  String get value => name;
}

class PropertyFilters {
  const PropertyFilters({
    this.city,
    this.minPrice,
    this.maxPrice,
    this.propertyType,
    this.listingType,
  });

  final String? city;
  final double? minPrice;
  final double? maxPrice;
  final PropertyType? propertyType;
  final ListingType? listingType;

  bool get hasActiveFilters =>
      city?.trim().isNotEmpty == true ||
      minPrice != null ||
      maxPrice != null ||
      propertyType != null ||
      listingType != null;

  PropertyFilters copyWithCity(String? city) {
    return PropertyFilters(
      city: city,
      minPrice: minPrice,
      maxPrice: maxPrice,
      propertyType: propertyType,
      listingType: listingType,
    );
  }
}

/// --------------------------------------------------
/// Helpers
/// --------------------------------------------------

double _toDouble(dynamic value) {
  if (value is num) return value.toDouble();
  return double.parse(value.toString());
}

int? _toIntOrNull(dynamic value) {
  if (value == null) return null;
  if (value is num) return value.toInt();
  return int.tryParse(value.toString());
}

double? _toDoubleOrNull(dynamic value) {
  if (value == null) return null;
  if (value is num) return value.toDouble();
  return double.tryParse(value.toString());
}

Map<String, dynamic>? _relationToMap(dynamic value) {
  if (value == null) return null;

  if (value is Map<String, dynamic>) {
    return value;
  }

  if (value is List && value.isNotEmpty) {
    final first = value.first;
    if (first is Map<String, dynamic>) return first;
  }

  return null;
}

/// --------------------------------------------------
/// Property — matches the public.properties row
/// --------------------------------------------------

class Property {
  final String id;
  final String ownerId;
  final String title;
  final String? description;
  final String listingType;
  final String propertyType;
  final double price;
  final double? surfaceM2;
  final int? rooms;
  final int? bathrooms;
  final String city;
  final String? address;
  final double? latitude;
  final double? longitude;
  final String status;
  final String createdAt;
  final String updatedAt;

  const Property({
    required this.id,
    required this.ownerId,
    required this.title,
    this.description,
    required this.listingType,
    required this.propertyType,
    required this.price,
    this.surfaceM2,
    this.rooms,
    this.bathrooms,
    required this.city,
    this.address,
    this.latitude,
    this.longitude,
    required this.status,
    required this.createdAt,
    required this.updatedAt,
  });

  factory Property.fromJson(Map<String, dynamic> json) {
    return Property(
      id: json['id'] as String,
      ownerId: json['owner_id'] as String,
      title: json['title'] as String,
      description: json['description'] as String?,
      listingType: json['listing_type'] as String,
      propertyType: json['property_type'] as String,
      price: _toDouble(json['price']),
      surfaceM2: _toDoubleOrNull(json['surface_m2']),
      rooms: _toIntOrNull(json['rooms']),
      bathrooms: _toIntOrNull(json['bathrooms']),
      city: json['city'] as String,
      address: json['address'] as String?,
      latitude: _toDoubleOrNull(json['latitude']),
      longitude: _toDoubleOrNull(json['longitude']),
      status: json['status'] as String,
      createdAt: json['created_at'] as String,
      updatedAt: json['updated_at'] as String,
    );
  }
}

/// Kept as an alias for code that already uses the old PropertyRow name.
typedef PropertyRow = Property;

/// --------------------------------------------------
/// PropertyImage — matches the public.propertyImages row
/// --------------------------------------------------

class PropertyImage {
  final String id;
  final String propertyId;
  final String imageUrl;
  final String storagePath;
  final int position;
  final String createdAt;

  const PropertyImage({
    required this.id,
    required this.propertyId,
    required this.imageUrl,
    required this.storagePath,
    required this.position,
    required this.createdAt,
  });

  factory PropertyImage.fromJson(Map<String, dynamic> json) {
    return PropertyImage(
      id: json['id'] as String,
      propertyId: json['property_id'] as String,
      imageUrl: json['image_url'] as String,
      storagePath: json['storage_path'] as String,
      position: (json['position'] as num).toInt(),
      createdAt: json['created_at'] as String,
    );
  }
}

/// --------------------------------------------------
/// OwnerProfile — matches the public.profiles row
/// --------------------------------------------------

class OwnerProfile {
  final String id;
  final String? fullName;
  final String? phone;
  final String? avatarUrl;
  final String? bio;
  final String createdAt;
  final String updatedAt;

  const OwnerProfile({
    required this.id,
    this.fullName,
    this.phone,
    this.avatarUrl,
    this.bio,
    required this.createdAt,
    required this.updatedAt,
  });

  factory OwnerProfile.fromJson(Map<String, dynamic> json) {
    return OwnerProfile(
      id: json['id'] as String,
      fullName: json['full_name'] as String?,
      phone: json['phone'] as String?,
      avatarUrl: json['avatar_url'] as String?,
      bio: json['bio'] as String?,
      createdAt: json['created_at'] as String,
      updatedAt: json['updated_at'] as String,
    );
  }
}

/// --------------------------------------------------
/// Property relations returned by Supabase joins
/// --------------------------------------------------

class PropertyWithRelations extends Property {
  final List<PropertyImage> propertyImages;
  final OwnerProfile? profiles;

  const PropertyWithRelations({
    required super.id,
    required super.ownerId,
    required super.title,
    super.description,
    required super.listingType,
    required super.propertyType,
    required super.price,
    super.surfaceM2,
    super.rooms,
    super.bathrooms,
    required super.city,
    super.address,
    super.latitude,
    super.longitude,
    required super.status,
    required super.createdAt,
    required super.updatedAt,
    required this.propertyImages,
    this.profiles,
  });

  factory PropertyWithRelations.fromJson(Map<String, dynamic> json) {
    final images = (json['property_images'] as List<dynamic>? ?? [])
        .map(
          (image) => PropertyImage.fromJson(
            Map<String, dynamic>.from(image as Map),
          ),
        )
        .toList();

    final profileJson = _relationToMap(json['profiles']);

    return PropertyWithRelations(
      id: json['id'] as String,
      ownerId: json['owner_id'] as String,
      title: json['title'] as String,
      description: json['description'] as String?,
      listingType: json['listing_type'] as String,
      propertyType: json['property_type'] as String,
      price: _toDouble(json['price']),
      surfaceM2: _toDoubleOrNull(json['surface_m2']),
      rooms: _toIntOrNull(json['rooms']),
      bathrooms: _toIntOrNull(json['bathrooms']),
      city: json['city'] as String,
      address: json['address'] as String?,
      latitude: _toDoubleOrNull(json['latitude']),
      longitude: _toDoubleOrNull(json['longitude']),
      status: json['status'] as String,
      createdAt: json['created_at'] as String,
      updatedAt: json['updated_at'] as String,
      propertyImages: images,
      profiles: profileJson == null
          ? null
          : OwnerProfile.fromJson(profileJson),
    );
  }
}

/// --------------------------------------------------
/// Narrow relation types for list/search queries
/// --------------------------------------------------

class PropertyImagePreview {
  final String imageUrl;
  final int position;

  const PropertyImagePreview({
    required this.imageUrl,
    required this.position,
  });

  factory PropertyImagePreview.fromJson(Map<String, dynamic> json) {
    return PropertyImagePreview(
      imageUrl: json['image_url'] as String,
      position: (json['position'] as num).toInt(),
    );
  }
}

class OwnerProfilePreview {
  final String? fullName;
  final String? phone;
  final String? avatarUrl;

  const OwnerProfilePreview({
    this.fullName,
    this.phone,
    this.avatarUrl,
  });

  factory OwnerProfilePreview.fromJson(Map<String, dynamic> json) {
    return OwnerProfilePreview(
      fullName: json['full_name'] as String?,
      phone: json['phone'] as String?,
      avatarUrl: json['avatar_url'] as String?,
    );
  }
}

class PropertySearchResult extends Property {
  final List<PropertyImagePreview> propertyImages;
  final OwnerProfilePreview? profiles;

  const PropertySearchResult({
    required super.id,
    required super.ownerId,
    required super.title,
    super.description,
    required super.listingType,
    required super.propertyType,
    required super.price,
    super.surfaceM2,
    super.rooms,
    super.bathrooms,
    required super.city,
    super.address,
    super.latitude,
    super.longitude,
    required super.status,
    required super.createdAt,
    required super.updatedAt,
    required this.propertyImages,
    this.profiles,
  });

  factory PropertySearchResult.fromJson(Map<String, dynamic> json) {
    final images = (json['property_images'] as List<dynamic>? ?? [])
        .map(
          (image) => PropertyImagePreview.fromJson(
            Map<String, dynamic>.from(image as Map),
          ),
        )
        .toList();

    final profileJson = _relationToMap(json['profiles']);

    return PropertySearchResult(
      id: json['id'] as String,
      ownerId: json['owner_id'] as String,
      title: json['title'] as String,
      description: json['description'] as String?,
      listingType: json['listing_type'] as String,
      propertyType: json['property_type'] as String,
      price: _toDouble(json['price']),
      surfaceM2: _toDoubleOrNull(json['surface_m2']),
      rooms: _toIntOrNull(json['rooms']),
      bathrooms: _toIntOrNull(json['bathrooms']),
      city: json['city'] as String,
      address: json['address'] as String?,
      latitude: _toDoubleOrNull(json['latitude']),
      longitude: _toDoubleOrNull(json['longitude']),
      status: json['status'] as String,
      createdAt: json['created_at'] as String,
      updatedAt: json['updated_at'] as String,
      propertyImages: images,
      profiles: profileJson == null
          ? null
          : OwnerProfilePreview.fromJson(profileJson),
    );
  }
}

/// --------------------------------------------------
/// PropertyCard — only the fields displayed by the card
/// --------------------------------------------------

class PropertyCardData {
  final String id;
  final String title;
  final String listingType;
  final String propertyType;
  final double price;
  final double? surfaceM2;
  final int? rooms;
  final String city;

  const PropertyCardData({
    required this.id,
    required this.title,
    required this.listingType,
    required this.propertyType,
    required this.price,
    this.surfaceM2,
    this.rooms,
    required this.city,
  });
}