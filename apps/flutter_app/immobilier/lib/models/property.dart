// --------------------------------------------------
// Database enum types — public.properties
// --------------------------------------------------

enum ListingType {
  sale,
  rent,
}

enum PropertyType {
  apartment,
  house,
  villa,
  land,
  office,
  shop,
}

enum PropertyStatus {
  active,
  sold,
  rented,
  hidden,
}

// --------------------------------------------------
// Enum JSON helper
// --------------------------------------------------

T _enumFromJson<T extends Enum>(
  List<T> values,
  Object? value,
  String field,
) {
  if (value is! String) {
    throw FormatException('Invalid value for $field: $value');
  }

  return values.firstWhere(
    (item) => item.name == value,
    orElse: () => throw FormatException(
      'Unknown value "$value" for $field',
    ),
  );
}

// --------------------------------------------------
// Property — matches the public.properties row
// --------------------------------------------------

class Property {
  final String id;
  final String ownerId;
  final String title;
  final String? description;
  final ListingType listingType;
  final PropertyType propertyType;
  final num price;
  final num? surfaceM2;
  final int? rooms;
  final int? bathrooms;
  final String city;
  final String? address;
  final num? latitude;
  final num? longitude;
  final PropertyStatus status;
  final DateTime createdAt;
  final DateTime updatedAt;

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

  Property.fromJson(Map<String, dynamic> json)
      : id = json['id'] as String,
        ownerId = json['owner_id'] as String,
        title = json['title'] as String,
        description = json['description'] as String?,
        listingType = _enumFromJson(
          ListingType.values,
          json['listing_type'],
          'listing_type',
        ),
        propertyType = _enumFromJson(
          PropertyType.values,
          json['property_type'],
          'property_type',
        ),
        price = json['price'] as num,
        surfaceM2 = json['surface_m2'] as num?,
        rooms = (json['rooms'] as num?)?.toInt(),
        bathrooms = (json['bathrooms'] as num?)?.toInt(),
        city = json['city'] as String,
        address = json['address'] as String?,
        latitude = json['latitude'] as num?,
        longitude = json['longitude'] as num?,
        status = _enumFromJson(
          PropertyStatus.values,
          json['status'],
          'status',
        ),
        createdAt = DateTime.parse(json['created_at'] as String),
        updatedAt = DateTime.parse(json['updated_at'] as String);

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'owner_id': ownerId,
      'title': title,
      'description': description,
      'listing_type': listingType.name,
      'property_type': propertyType.name,
      'price': price,
      'surface_m2': surfaceM2,
      'rooms': rooms,
      'bathrooms': bathrooms,
      'city': city,
      'address': address,
      'latitude': latitude,
      'longitude': longitude,
      'status': status.name,
      'created_at': createdAt.toIso8601String(),
      'updated_at': updatedAt.toIso8601String(),
    };
  }
}

// Equivalent to the old TypeScript PropertyRow alias.
typedef PropertyRow = Property;

// --------------------------------------------------
// PropertyImage — matches public.property_images
// --------------------------------------------------

class PropertyImage {
  final String id;
  final String propertyId;
  final String imageUrl;
  final String storagePath;
  final int position;
  final DateTime createdAt;

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
      createdAt: DateTime.parse(json['created_at'] as String),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'property_id': propertyId,
      'image_url': imageUrl,
      'storage_path': storagePath,
      'position': position,
      'created_at': createdAt.toIso8601String(),
    };
  }
}

// --------------------------------------------------
// OwnerProfile — matches public.profiles
// --------------------------------------------------

class OwnerProfile {
  final String id;
  final String? fullName;
  final String? phone;
  final String? avatarUrl;
  final String? bio;
  final DateTime createdAt;
  final DateTime updatedAt;

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
      createdAt: DateTime.parse(json['created_at'] as String),
      updatedAt: DateTime.parse(json['updated_at'] as String),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'full_name': fullName,
      'phone': phone,
      'avatar_url': avatarUrl,
      'bio': bio,
      'created_at': createdAt.toIso8601String(),
      'updated_at': updatedAt.toIso8601String(),
    };
  }
}

// --------------------------------------------------
// PropertyImagePreview
// Pick<PropertyImage, 'image_url' | 'position'>
// --------------------------------------------------

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

  Map<String, dynamic> toJson() {
    return {
      'image_url': imageUrl,
      'position': position,
    };
  }
}

// --------------------------------------------------
// OwnerProfilePreview
// Pick<OwnerProfile, 'full_name' | 'phone' | 'avatar_url'>
// --------------------------------------------------

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

  Map<String, dynamic> toJson() {
    return {
      'full_name': fullName,
      'phone': phone,
      'avatar_url': avatarUrl,
    };
  }
}

// --------------------------------------------------
// PropertyWithRelations
// Property + property_images + profiles
// --------------------------------------------------

class PropertyWithRelations extends Property {
  final List<PropertyImage> propertyImages;
  final OwnerProfile? profiles;

  PropertyWithRelations.fromJson(Map<String, dynamic> json)
      : propertyImages = (json['property_images'] as List<dynamic>)
            .map(
              (item) => PropertyImage.fromJson(
                Map<String, dynamic>.from(item as Map),
              ),
            )
            .toList(),
        profiles = json['profiles'] == null
            ? null
            : OwnerProfile.fromJson(
                Map<String, dynamic>.from(json['profiles'] as Map),
              ),
        super.fromJson(json);

  @override
  Map<String, dynamic> toJson() {
    return {
      ...super.toJson(),
      'property_images': propertyImages
          .map((image) => image.toJson())
          .toList(),
      'profiles': profiles?.toJson(),
    };
  }
}

// --------------------------------------------------
// PropertySearchResult
// Property + preview relations
// --------------------------------------------------

class PropertySearchResult extends Property {
  final List<PropertyImagePreview> propertyImages;
  final OwnerProfilePreview? profiles;

  PropertySearchResult.fromJson(Map<String, dynamic> json)
      : propertyImages = (json['property_images'] as List<dynamic>)
            .map(
              (item) => PropertyImagePreview.fromJson(
                Map<String, dynamic>.from(item as Map),
              ),
            )
            .toList(),
        profiles = json['profiles'] == null
            ? null
            : OwnerProfilePreview.fromJson(
                Map<String, dynamic>.from(json['profiles'] as Map),
              ),
        super.fromJson(json);

  @override
  Map<String, dynamic> toJson() {
    return {
      ...super.toJson(),
      'property_images': propertyImages
          .map((image) => image.toJson())
          .toList(),
      'profiles': profiles?.toJson(),
    };
  }
}

// --------------------------------------------------
// PropertyCardData
// Pick<Property, fields displayed by the card>
// --------------------------------------------------

class PropertyCardData {
  final String id;
  final String title;
  final ListingType listingType;
  final PropertyType propertyType;
  final num price;
  final num? surfaceM2;
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

  factory PropertyCardData.fromJson(Map<String, dynamic> json) {
    return PropertyCardData(
      id: json['id'] as String,
      title: json['title'] as String,
      listingType: _enumFromJson(
        ListingType.values,
        json['listing_type'],
        'listing_type',
      ),
      propertyType: _enumFromJson(
        PropertyType.values,
        json['property_type'],
        'property_type',
      ),
      price: json['price'] as num,
      surfaceM2: json['surface_m2'] as num?,
      rooms: (json['rooms'] as num?)?.toInt(),
      city: json['city'] as String,
    );
  }

  factory PropertyCardData.fromProperty(Property property) {
    return PropertyCardData(
      id: property.id,
      title: property.title,
      listingType: property.listingType,
      propertyType: property.propertyType,
      price: property.price,
      surfaceM2: property.surfaceM2,
      rooms: property.rooms,
      city: property.city,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'listing_type': listingType.name,
      'property_type': propertyType.name,
      'price': price,
      'surface_m2': surfaceM2,
      'rooms': rooms,
      'city': city,
    };
  }
}