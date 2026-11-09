import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:intl/intl.dart';

import '../../core/theme.dart';
import '../../models/property_models.dart';
import '../../services/property_service.dart';

// --------------------------------------------------
// Helpers
// --------------------------------------------------

String formatPrice(num price) {
  final formattedPrice = NumberFormat('#,##0.##', 'fr_TN')
      .format(price)
      .replaceAll(RegExp(r'[\u00A0\u202F]'), ' ');

  return '$formattedPrice TND';
}

String formatNullable(num? value, [String suffix = '']) {
  return value == null ? '—' : '$value$suffix';
}

String getPropertyTypeLabel(PropertyType type) {
  const labels = <PropertyType, String>{
    PropertyType.apartment: 'Apartment',
    PropertyType.house: 'House',
    PropertyType.villa: 'Villa',
    PropertyType.land: 'Land',
    PropertyType.office: 'Office',
    PropertyType.shop: 'Shop',
  };

  return labels[type]!;
}

// --------------------------------------------------
// Property Details Screen
// --------------------------------------------------

class PropertyDetailsScreen extends StatefulWidget {
  const PropertyDetailsScreen({
    super.key,
    required this.propertyId,
  });

  final String propertyId;

  @override
  State<PropertyDetailsScreen> createState() =>
      _PropertyDetailsScreenState();
}

class _PropertyDetailsScreenState extends State<PropertyDetailsScreen> {
  PropertyWithRelations? _property;
  bool _loading = true;
  String? _loadError;
  int _activeImageIndex = 0;

  // -----------------------------------------------
  // Load Property
  // -----------------------------------------------

  @override
  void initState() {
    super.initState();
    _loadProperty();
  }

  @override
  void didUpdateWidget(covariant PropertyDetailsScreen oldWidget) {
    super.didUpdateWidget(oldWidget);

    if (oldWidget.propertyId != widget.propertyId) {
      _loadProperty();
    }
  }

  Future<void> _loadProperty() async {
    final id = widget.propertyId.trim();

    if (id.isEmpty) {
      if (!mounted) return;

      setState(() {
        _loadError = 'The property ID is invalid.';
        _loading = false;
      });
      return;
    }

    if (mounted) {
      setState(() {
        _loading = true;
        _loadError = null;
      });
    }

    try {
      final result = await getPropertyById(id);

      if (!mounted) return;

      setState(() {
        _property = result;
        _activeImageIndex = 0;
      });
    } catch (error) {
      debugPrint('Failed to load property details: $error');

      if (!mounted) return;

      setState(() {
        _loadError = error.toString().contains('Property not found.')
            ? 'This property could not be found.'
            : 'Unable to load this property. Please check your connection and try again.';
      });
    } finally {
      if (mounted) {
        setState(() {
          _loading = false;
        });
      }
    }
  }

  // -----------------------------------------------
  // Back Navigation
  // -----------------------------------------------

  void _goBack() {
    Navigator.of(context).maybePop();
  }

  // -----------------------------------------------
  // Screen
  // -----------------------------------------------

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return _buildLoadingScreen();
    }

    if (_loadError != null || _property == null) {
      return _buildErrorScreen();
    }

    final property = _property!;
    final owner = property.profiles;
    final images = List<PropertyImage>.from(property.propertyImages)
      ..sort((first, second) => first.position.compareTo(second.position));

    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: SystemUiOverlayStyle.dark,
      child: Scaffold(
        backgroundColor: AppColors.background,
        body: SafeArea(
          top: true,
          bottom: false,
          left: false,
          right: false,
          child: Column(
            children: [
              _buildTopBar(),
              Expanded(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.only(bottom: 32),
                  physics: const ClampingScrollPhysics(),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _buildImageGallery(images),
                      _buildDetailsContent(property, owner),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // -----------------------------------------------
  // Loading State
  // -----------------------------------------------

  Widget _buildLoadingScreen() {
    final textTheme = Theme.of(context).textTheme;

    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: SystemUiOverlayStyle.dark,
      child: Scaffold(
        backgroundColor: AppColors.background,
        body: SafeArea(
          child: Center(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const CircularProgressIndicator(
                    color: AppColors.primary,
                  ),
                  const SizedBox(height: 12),
                  Text(
                    'Loading property details...',
                    style: textTheme.bodyMedium?.copyWith(
                      color: AppColors.secondary,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  // -----------------------------------------------
  // Error State
  // -----------------------------------------------

  Widget _buildErrorScreen() {
    final textTheme = Theme.of(context).textTheme;

    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: SystemUiOverlayStyle.dark,
      child: Scaffold(
        backgroundColor: AppColors.background,
        body: SafeArea(
          child: Center(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(
                    Icons.error_outline,
                    size: 42,
                    color: AppColors.error,
                  ),
                  const SizedBox(height: 12),
                  Text(
                    _loadError ?? 'This property could not be found.',
                    textAlign: TextAlign.center,
                    style: textTheme.bodyMedium?.copyWith(
                      color: AppColors.error,
                    ),
                  ),
                  const SizedBox(height: 12),
                  SizedBox(
                    height: 44,
                    child: ElevatedButton(
                      onPressed: _loadProperty,
                      style: ElevatedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(horizontal: 24),
                        backgroundColor: AppColors.primary,
                        foregroundColor: AppColors.onPrimary,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                      child: Text(
                        'Try again',
                        style: textTheme.labelLarge?.copyWith(
                          color: AppColors.onPrimary,
                        ),
                      ),
                    ),
                  ),
                  TextButton(
                    onPressed: _goBack,
                    style: TextButton.styleFrom(
                      padding: const EdgeInsets.all(8),
                      foregroundColor: AppColors.primary,
                    ),
                    child: Text(
                      'Go back',
                      style: textTheme.labelLarge?.copyWith(
                        color: AppColors.primary,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  // -----------------------------------------------
  // Top Bar
  // -----------------------------------------------

  Widget _buildTopBar() {
    final textTheme = Theme.of(context).textTheme;

    return SizedBox(
      height: 56,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Semantics(
              button: true,
              label: 'Go back',
              child: Material(
                color: AppColors.surfaceVariant,
                shape: const CircleBorder(),
                child: InkWell(
                  customBorder: const CircleBorder(),
                  onTap: _goBack,
                  child: const SizedBox(
                    width: 40,
                    height: 40,
                    child: Icon(
                      Icons.arrow_back,
                      size: 22,
                      color: AppColors.onSurface,
                    ),
                  ),
                ),
              ),
            ),
            Text(
              'Property details',
              style: textTheme.titleMedium?.copyWith(
                color: AppColors.onBackground,
              ),
            ),
            const SizedBox(width: 40, height: 40),
          ],
        ),
      ),
    );
  }

  // -----------------------------------------------
  // Image Gallery
  // -----------------------------------------------

  Widget _buildImageGallery(List<PropertyImage> images) {
    final colorScheme = Theme.of(context).colorScheme;

    if (images.isEmpty) {
      return Container(
        height: 220,
        width: double.infinity,
        alignment: Alignment.center,
        color: colorScheme.outlineVariant,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              Icons.home_outlined,
              size: 56,
              color: colorScheme.outline,
            ),
            const SizedBox(height: 8),
            Text(
              'No images available',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: AppColors.secondary,
                  ),
            ),
          ],
        ),
      );
    }

    return Container(
      width: double.infinity,
      color: colorScheme.outlineVariant,
      child: Column(
        children: [
          SizedBox(
            width: double.infinity,
            height: 280,
            child: PageView.builder(
              itemCount: images.length,
              onPageChanged: (index) {
                setState(() {
                  _activeImageIndex = index;
                });
              },
              itemBuilder: (context, index) {
                return Image.network(
                  images[index].imageUrl,
                  width: double.infinity,
                  height: 280,
                  fit: BoxFit.cover,
                );
              },
            ),
          ),
          if (images.length > 1)
            Semantics(
              label: 'Image pagination',
              child: Container(
                constraints: const BoxConstraints(minHeight: 30),
                width: double.infinity,
                color: AppColors.background,
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: List.generate(images.length, (index) {
                    final isActive = index == _activeImageIndex;

                    return Container(
                      width: isActive ? 18 : 7,
                      height: 7,
                      margin: EdgeInsets.only(
                        right: index == images.length - 1 ? 0 : 4,
                      ),
                      decoration: BoxDecoration(
                        color: isActive
                            ? AppColors.primary
                            : colorScheme.outline,
                        borderRadius: BorderRadius.circular(999),
                      ),
                    );
                  }),
                ),
              ),
            ),
        ],
      ),
    );
  }

  // -----------------------------------------------
  // Property Details Content
  // -----------------------------------------------

  Widget _buildDetailsContent(
    PropertyWithRelations property,
    OwnerProfile? owner,
  ) {
    final textTheme = Theme.of(context).textTheme;

    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Price
          Row(
            crossAxisAlignment: CrossAxisAlignment.baseline,
            textBaseline: TextBaseline.alphabetic,
            children: [
              Text(
                formatPrice(property.price),
                style: textTheme.headlineSmall?.copyWith(
                  color: AppColors.primary,
                ),
              ),
              if (property.listingType == ListingType.rent) ...[
                const SizedBox(width: 4),
                Text(
                  '/ month',
                  style: textTheme.bodyMedium?.copyWith(
                    color: AppColors.secondary,
                  ),
                ),
              ],
            ],
          ),

          const SizedBox(height: 16),

          // Title
          Text(
            property.title,
            style: textTheme.headlineSmall?.copyWith(
              color: AppColors.onBackground,
            ),
          ),

          const SizedBox(height: 16),

          // Location
          Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              const Icon(
                Icons.location_on_outlined,
                size: 18,
                color: AppColors.secondary,
              ),
              const SizedBox(width: 4),
              Expanded(
                child: Text(
                  property.address != null && property.address!.isNotEmpty
                      ? '${property.address}, ${property.city}'
                      : property.city,
                  style: textTheme.bodyMedium?.copyWith(
                    color: AppColors.secondary,
                  ),
                ),
              ),
            ],
          ),

          const SizedBox(height: 16),

          // Tags
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              _buildTag(getPropertyTypeLabel(property.propertyType)),
              _buildTag(
                property.listingType == ListingType.sale
                    ? 'For sale'
                    : 'For rent',
              ),
              _buildTag(property.status.name),
            ],
          ),

          const SizedBox(height: 16),

          // Property Overview
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Property overview',
                style: textTheme.titleLarge?.copyWith(
                  color: AppColors.onBackground,
                ),
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: _buildSpecification(
                      Icons.aspect_ratio,
                      'Surface',
                      formatNullable(property.surfaceM2, ' m²'),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: _buildSpecification(
                      Icons.bed_outlined,
                      'Rooms',
                      formatNullable(property.rooms),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: _buildSpecification(
                      Icons.water_drop_outlined,
                      'Bathrooms',
                      formatNullable(property.bathrooms),
                    ),
                  ),
                ],
              ),
            ],
          ),

          const SizedBox(height: 16),

          // Description
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Description',
                style: textTheme.titleLarge?.copyWith(
                  color: AppColors.onBackground,
                ),
              ),
              const SizedBox(height: 12),
              Text(
                property.description?.trim().isNotEmpty == true
                    ? property.description!.trim()
                    : 'No description provided.',
                style: textTheme.bodyMedium?.copyWith(
                  color: AppColors.onBackground,
                  height: 24 / 14,
                ),
              ),
            ],
          ),

          const SizedBox(height: 16),

          // Owner
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Owner',
                style: textTheme.titleLarge?.copyWith(
                  color: AppColors.onBackground,
                ),
              ),
              const SizedBox(height: 12),
              _buildOwnerCard(owner),
            ],
          ),
        ],
      ),
    );
  }

  // -----------------------------------------------
  // Tag
  // -----------------------------------------------

  Widget _buildTag(String label) {
    final textTheme = Theme.of(context).textTheme;

    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: 12,
        vertical: 4,
      ),
      decoration: BoxDecoration(
        color: AppColors.surfaceVariant,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: textTheme.labelMedium?.copyWith(
          color: AppColors.secondary,
        ),
      ),
    );
  }

  // -----------------------------------------------
  // Specification
  // -----------------------------------------------

  Widget _buildSpecification(
    IconData icon,
    String label,
    String value,
  ) {
    final textTheme = Theme.of(context).textTheme;

    return Container(
      constraints: const BoxConstraints(minHeight: 104),
      padding: const EdgeInsets.all(8),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            icon,
            size: 22,
            color: AppColors.primary,
          ),
          const SizedBox(height: 4),
          Text(
            value,
            textAlign: TextAlign.center,
            style: textTheme.titleMedium?.copyWith(
              color: AppColors.onSurface,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            label,
            textAlign: TextAlign.center,
            style: textTheme.bodySmall?.copyWith(
              color: AppColors.secondary,
            ),
          ),
        ],
      ),
    );
  }

  // -----------------------------------------------
  // Owner Card
  // -----------------------------------------------

  Widget _buildOwnerCard(OwnerProfile? owner) {
    final textTheme = Theme.of(context).textTheme;
    final avatarUrl = owner?.avatarUrl;
    final ownerName = owner?.fullName;
    final ownerPhone = owner?.phone;

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          if (avatarUrl != null && avatarUrl.isNotEmpty)
            ClipOval(
              child: Image.network(
                avatarUrl,
                width: 48,
                height: 48,
                fit: BoxFit.cover,
              ),
            )
          else
            Container(
              width: 48,
              height: 48,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: AppColors.surfaceVariant,
                borderRadius: BorderRadius.circular(999),
              ),
              child: const Icon(
                Icons.person,
                size: 22,
                color: AppColors.secondary,
              ),
            ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  ownerName != null && ownerName.isNotEmpty
                      ? ownerName
                      : 'Property owner',
                  style: textTheme.titleMedium?.copyWith(
                    color: AppColors.onSurface,
                  ),
                ),
                if (ownerPhone != null && ownerPhone.isNotEmpty) ...[
                  const SizedBox(height: 2),
                  Text(
                    ownerPhone,
                    style: textTheme.bodyMedium?.copyWith(
                      color: AppColors.secondary,
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}