class Property {
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
    required this.createdAt,
    required this.updatedAt,
  });

  final String id;
  final String ownerId;
  final String title;
  final String? description;
  final String listingType;
  final String propertyType;
  final num price;
  final int? surfaceM2;
  final int? rooms;
  final int? bathrooms;
  final String city;
  final String? address;
  final double? latitude;
  final double? longitude;
  final DateTime createdAt;
  final DateTime updatedAt;

  String get formattedPrice => '${price.toStringAsFixed(0)} TND';

  String get period => listingType == 'rent' ? '/ month' : '';

  String get locationLabel =>
      address == null || address!.isEmpty ? city : '$city, $address';

  String get propertyTypeLabel =>
      '${propertyType[0].toUpperCase()}${propertyType.substring(1)}';
}
