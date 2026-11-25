import 'package:flutter/material.dart';

import '../core/theme.dart';

// --------------------------------------------------
// Types — Based on the Supabase properties table
// --------------------------------------------------

enum ListingType { sale, rent }

enum PropertyType { apartment, house, villa, land, office, shop }

enum PropertyStatus { active, sold, rented, hidden }

enum PropertyCardVariant { standard, featured, newListing }

@immutable
class PropertyCardData {
  const PropertyCardData({
    required this.id,
    required this.title,
    required this.listingType,
    required this.propertyType,
    required this.price,
    required this.surfaceM2,
    required this.rooms,
    required this.city,
  });

  final String id;
  final String title;
  final ListingType listingType;
  final PropertyType propertyType;
  final double price;
  final int? surfaceM2;
  final int? rooms;
  final String city;
}

@immutable
class PropertyRow extends PropertyCardData {
  const PropertyRow({
    required super.id,
    required super.title,
    required super.listingType,
    required super.propertyType,
    required super.price,
    required super.surfaceM2,
    required super.rooms,
    required super.city,
    required this.ownerId,
    required this.description,
    required this.bathrooms,
    required this.address,
    required this.latitude,
    required this.longitude,
    required this.status,
    required this.createdAt,
    required this.updatedAt,
  });

  final String ownerId;
  final String? description;
  final int? bathrooms;
  final String? address;
  final double? latitude;
  final double? longitude;
  final PropertyStatus status;
  final String createdAt;
  final String updatedAt;
}

// --------------------------------------------------
// Property type labels
// --------------------------------------------------

const Map<PropertyType, String> _propertyTypeLabels = {
  PropertyType.apartment: 'Apartment',
  PropertyType.house: 'House',
  PropertyType.villa: 'Villa',
  PropertyType.land: 'Land',
  PropertyType.office: 'Office',
  PropertyType.shop: 'Shop',
};

// --------------------------------------------------
// Formatting helpers
// --------------------------------------------------

String _formatFrenchNumber(num value, {int maximumFractionDigits = 2}) {
  final isNegative = value < 0;
  final fixedValue = value.abs().toStringAsFixed(maximumFractionDigits);
  final parts = fixedValue.split('.');

  final integerPart = parts.first.replaceAllMapped(
    RegExp(r'\B(?=(\d{3})+(?!\d))'),
    (_) => '\u202F',
  );

  var fractionPart = parts.length > 1 ? parts[1] : '';
  fractionPart = fractionPart.replaceFirst(RegExp(r'0+$'), '');

  final decimalPart = fractionPart.isEmpty ? '' : ',$fractionPart';
  final sign = isNegative ? '-' : '';

  return '$sign$integerPart$decimalPart';
}

String _formatPrice(double price, String currency) {
  return '${_formatFrenchNumber(price)} $currency';
}

String _formatSurface(int? surface) {
  if (surface == null) {
    return '— m²';
  }

  return '${_formatFrenchNumber(surface, maximumFractionDigits: 0)} m²';
}

String _formatRooms(int? rooms) {
  if (rooms == null) {
    return '— rooms';
  }

  return '$rooms ${rooms == 1 ? 'room' : 'rooms'}';
}

// --------------------------------------------------
// Property Card
// --------------------------------------------------

class PropertyCard extends StatelessWidget {
  const PropertyCard({
    super.key,
    required this.property,
    this.image,
    this.variant = PropertyCardVariant.standard,
    this.favorite = false,
    this.currencyLabel = 'DT',
    this.period,
    this.onFavoritePress,
    this.onPress,
  });

  final PropertyCardData property;
  final ImageProvider<Object>? image;
  final PropertyCardVariant variant;
  final bool favorite;
  final String currencyLabel;
  final String? period;
  final VoidCallback? onFavoritePress;
  final VoidCallback? onPress;

  @override
  Widget build(BuildContext context) {
    final priceText = _formatPrice(property.price, currencyLabel);
    final periodText =
        period ?? (property.listingType == ListingType.rent ? '/ month' : '');
    final propertyTypeLabel = _propertyTypeLabels[property.propertyType]!;

    final String? badgeLabel = switch (variant) {
      PropertyCardVariant.standard => null,
      PropertyCardVariant.featured => 'Featured',
      PropertyCardVariant.newListing => 'New',
    };

    return Container(
      width: 328,
      height: 334,
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(width: 1, color: AppColors.outlineVariant),
        boxShadow: const [
          BoxShadow(
            color: Color(0x100C3448),
            offset: Offset(0, 8),
            blurRadius: 24,
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(23),
        child: Material(
          color: AppColors.surface,
          child: InkWell(
            onTap: onPress,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // -----------------------------------------
                // Media
                // -----------------------------------------

                SizedBox(
                  width: double.infinity,
                  height: 184,
                  child: Stack(
                    fit: StackFit.expand,
                    children: [
                      if (image != null)
                        Image(
                          image: image!,
                          fit: BoxFit.cover,
                          errorBuilder: (context, error, stackTrace) {
                            return _buildImagePlaceholder();
                          },
                        )
                      else
                        _buildImagePlaceholder(),

                      // Listing Badge
                      if (badgeLabel != null)
                        Positioned(
                          left: 12,
                          top: 12,
                          child: Container(
                            constraints: const BoxConstraints(minHeight: 24),
                            padding: const EdgeInsets.symmetric(
                              horizontal: 8,
                              vertical: 4,
                            ),
                            alignment: Alignment.center,
                            decoration: BoxDecoration(
                              color: AppColors.featured,
                              borderRadius: BorderRadius.circular(999),
                            ),
                            child: Text(
                              badgeLabel,
                              style: const TextStyle(
                                fontFamily: AppFontConfig.fontFamily,
                                fontSize: 12,
                                fontWeight: FontWeight.w500,
                                height: 16 / 12,
                                letterSpacing: 0.5,
                                color: AppColors.onFeatured,
                              ),
                            ),
                          ),
                        ),

                      // Favorite Button
                      Positioned(
                        top: 4,
                        right: 2,
                        child: SizedBox(
                          width: 48,
                          height: 48,
                          child: Semantics(
                            button: true,
                            enabled: onFavoritePress != null,
                            selected: favorite,
                            label: favorite
                                ? 'Remove from favorites'
                                : 'Add to favorites',
                            child: Material(
                              color: Colors.transparent,
                              child: InkWell(
                                onTap: onFavoritePress,
                                customBorder: const CircleBorder(),
                                child: Center(
                                  child: Container(
                                    width: 40,
                                    height: 40,
                                    decoration: const BoxDecoration(
                                      color: AppColors.surface,
                                      shape: BoxShape.circle,
                                    ),
                                    alignment: Alignment.center,
                                    child: Icon(
                                      favorite
                                          ? Icons.favorite
                                          : Icons.favorite_border,
                                      size: 24,
                                      color: favorite
                                          ? AppColors.favorite
                                          : AppColors.secondary,
                                    ),
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),

                // -----------------------------------------
                // Content
                // -----------------------------------------
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Price Row

                        SizedBox(
                          height: 28,
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.baseline,
                            textBaseline: TextBaseline.alphabetic,
                            children: [
                              Flexible(
                                child: Text(
                                  priceText,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(
                                    fontFamily: AppFontConfig.fontFamily,
                                    fontSize: 22,
                                    fontWeight: FontWeight.w500,
                                    height: 28 / 22,
                                    color: AppColors.primary,
                                  ),
                                ),
                              ),
                              if (periodText.isNotEmpty) ...[
                                const SizedBox(width: 4),
                                Text(
                                  periodText,
                                  style: const TextStyle(
                                    fontFamily: AppFontConfig.fontFamily,
                                    fontSize: 12,
                                    fontWeight: FontWeight.w400,
                                    height: 16 / 12,
                                    letterSpacing: 0.4,
                                    color: AppColors.secondary,
                                  ),
                                ),
                              ],
                            ],
                          ),
                        ),

                        const SizedBox(height: 8),

                        // Title
                        SizedBox(
                          height: 24,
                          child: Text(
                            property.title,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              fontFamily: AppFontConfig.fontFamily,
                              fontSize: 16,
                              fontWeight: FontWeight.w500,
                              height: 24 / 16,
                              letterSpacing: 0.15,
                              color: AppColors.onBackground,
                            ),
                          ),
                        ),

                        const SizedBox(height: 8),

                        // Location Row
                        SizedBox(
                          height: 20,
                          child: Row(
                            children: [
                              const Icon(
                                Icons.location_on_outlined,
                                size: 16,
                                color: AppColors.secondary,
                              ),
                              const SizedBox(width: 4),
                              Expanded(
                                child: Text(
                                  property.city,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(
                                    fontFamily: AppFontConfig.fontFamily,
                                    fontSize: 14,
                                    fontWeight: FontWeight.w400,
                                    height: 20 / 14,
                                    letterSpacing: 0.25,
                                    color: AppColors.secondary,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),

                        const SizedBox(height: 8),

                        // Specs Row
                        SizedBox(
                          height: 24,
                          child: Row(
                            children: [
                              Expanded(
                                child: Row(
                                  children: [
                                    Flexible(
                                      child: _buildSpecItem(
                                        icon: Icons.open_in_full,
                                        text: _formatSurface(
                                          property.surfaceM2,
                                        ),
                                      ),
                                    ),
                                    const SizedBox(width: 12),
                                    Flexible(
                                      child: _buildSpecItem(
                                        icon: Icons.bed_outlined,
                                        text: _formatRooms(property.rooms),
                                      ),
                                    ),
                                  ],
                                ),
                              ),

                              // Property Type Chip
                              Container(
                                constraints: const BoxConstraints(
                                  maxWidth: 100,
                                ),
                                height: 24,
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 8,
                                ),
                                alignment: Alignment.center,
                                decoration: BoxDecoration(
                                  color: AppColors.surfaceVariant,
                                  borderRadius: BorderRadius.circular(999),
                                ),
                                child: Text(
                                  propertyTypeLabel,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(
                                    fontFamily: AppFontConfig.fontFamily,
                                    fontSize: 12,
                                    fontWeight: FontWeight.w500,
                                    height: 16 / 12,
                                    letterSpacing: 0.5,
                                    color: AppColors.secondary,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildImagePlaceholder() {
    return Container(
      color: AppColors.outlineVariant,
      alignment: Alignment.center,
      child: const Icon(
        Icons.home_filled,
        size: 48,
        color: AppColors.placeholder,
      ),
    );
  }

  Widget _buildSpecItem({required IconData icon, required String text}) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 16, color: AppColors.secondary),
        const SizedBox(width: 4),
        Flexible(
          child: Text(
            text,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              fontFamily: AppFontConfig.fontFamily,
              fontSize: 14,
              fontWeight: FontWeight.w400,
              height: 20 / 14,
              letterSpacing: 0.25,
              color: AppColors.secondary,
            ),
          ),
        ),
      ],
    );
  }
}
