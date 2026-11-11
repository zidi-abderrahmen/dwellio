import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme.dart';
import '../../models/property_models.dart';
import '../../services/property_service.dart';

// --------------------------------------------------
// Formatting helpers
// --------------------------------------------------

String formatPrice(double price) {
  final fixedPrice = price.toStringAsFixed(2);
  final parts = fixedPrice.split('.');

  final integerPart = parts[0];
  final decimalPart = parts[1].replaceFirst(RegExp(r'0+$'), '');

  final groupedInteger = integerPart.replaceAllMapped(
    RegExp(r'\B(?=(\d{3})+(?!\d))'),
    (_) => ' ',
  );

  final formattedPrice = decimalPart.isEmpty
      ? groupedInteger
      : '$groupedInteger,$decimalPart';

  return '$formattedPrice TND';
}

String formatNullable(num? value, [String suffix = '']) {
  return value == null ? '—' : '$value$suffix';
}

String getPropertyTypeLabel(String type) {
  const labels = <String, String>{
    'apartment': 'Apartment',
    'house': 'House',
    'villa': 'Villa',
    'land': 'Land',
    'office': 'Office',
    'shop': 'Shop',
  };

  return labels[type] ?? type;
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
  final PropertyService _propertyService = PropertyService();

  PropertyWithRelations? _property;

  bool _loading = true;

  String? _loadError;

  int _activeImageIndex = 0;

  final PageController _imageController = PageController();

  // -----------------------------------------------
  // Lifecycle
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

  @override
  void dispose() {
    _imageController.dispose();
    super.dispose();
  }

  // -----------------------------------------------
  // Load property from Supabase
  // -----------------------------------------------

  Future<void> _loadProperty() async {
    if (widget.propertyId.trim().isEmpty) {
      setState(() {
        _loadError = 'The property ID is invalid.';
        _loading = false;
      });
      return;
    }

    setState(() {
      _loading = true;
      _loadError = null;
    });

    try {
      final result = await _propertyService.getPropertyById(widget.propertyId);

      if (!mounted) return;

      setState(() {
        _property = result;
        _activeImageIndex = 0;
      });

      if (_imageController.hasClients) {
        _imageController.jumpToPage(0);
      }
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
  // Back navigation
  // -----------------------------------------------

  void _goBack() {
    if (context.canPop()) {
      context.pop();
    }
  }

  // -----------------------------------------------
  // Loading screen
  // -----------------------------------------------

  Widget _buildLoadingScreen() {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const CircularProgressIndicator(
                color: AppColors.primary,
              ),
              const SizedBox(height: 16),
              Text(
                'Loading property details...',
                style: TextStyle(
                  fontFamily: AppFontConfig.fontFamily,
                  fontSize: 14,
                  color: AppColors.secondary,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // -----------------------------------------------
  // Error screen
  // -----------------------------------------------

  Widget _buildErrorScreen() {
    return Scaffold(
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
                const SizedBox(height: 16),
                Text(
                  _loadError ?? 'This property could not be found.',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontFamily: AppFontConfig.fontFamily,
                    fontSize: 14,
                    color: AppColors.error,
                  ),
                ),
                const SizedBox(height: 20),
                SizedBox(
                  height: 44,
                  child: ElevatedButton(
                    onPressed: _loadProperty,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      foregroundColor: AppColors.onPrimary,
                      padding: const EdgeInsets.symmetric(
                        horizontal: 24,
                      ),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    child: Text(
                      'Try again',
                      style: TextStyle(
                        fontFamily: AppFontConfig.fontFamily,
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ),
                TextButton(
                  onPressed: _goBack,
                  child: Text(
                    'Go back',
                    style: TextStyle(
                      fontFamily: AppFontConfig.fontFamily,
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: AppColors.primary,
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

  // -----------------------------------------------
  // Top bar
  // -----------------------------------------------

  Widget _buildTopBar() {
    return Container(
      constraints: const BoxConstraints(minHeight: 56),
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Material(
            color: AppColors.surface,
            shape: const CircleBorder(),
            child: InkWell(
              onTap: _goBack,
              customBorder: const CircleBorder(),
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
          Text(
            'Property details',
            style: TextStyle(
              fontFamily: AppFontConfig.fontFamily,
              fontSize: 18,
              fontWeight: FontWeight.w600,
              color: AppColors.onSurface,
            ),
          ),
          const SizedBox(width: 40, height: 40),
        ],
      ),
    );
  }

  // -----------------------------------------------
  // Property image gallery
  // -----------------------------------------------

  Widget _buildImageGallery(List<PropertyImage> images) {
    if (images.isEmpty) {
      return Container(
        height: 220,
        width: double.infinity,
        color: AppColors.surface,
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.home_outlined,
              size: 56,
              color: AppColors.secondary,
            ),
            const SizedBox(height: 8),
            Text(
              'No images available',
              style: TextStyle(
                fontFamily: AppFontConfig.fontFamily,
                fontSize: 14,
                color: AppColors.secondary,
              ),
            ),
          ],
        ),
      );
    }

    return Container(
      width: double.infinity,
      color: AppColors.surface,
      child: Column(
        children: [
          SizedBox(
            height: 280,
            child: PageView.builder(
              controller: _imageController,
              itemCount: images.length,
              onPageChanged: (index) {
                setState(() {
                  _activeImageIndex = index;
                });
              },
              itemBuilder: (context, index) {
                return SizedBox(
                  width: double.infinity,
                  height: 280,
                  child: Image.network(
                    images[index].imageUrl,
                    fit: BoxFit.cover,
                    errorBuilder: (context, error, stackTrace) {
                      return Container(
                        color: AppColors.surface,
                        child: const Center(
                          child: Icon(
                            Icons.broken_image_outlined,
                            size: 48,
                            color: AppColors.secondary,
                          ),
                        ),
                      );
                    },
                    loadingBuilder: (context, child, loadingProgress) {
                      if (loadingProgress == null) return child;

                      return const Center(
                        child: CircularProgressIndicator(
                          color: AppColors.primary,
                        ),
                      );
                    },
                  ),
                );
              },
            ),
          ),

          if (images.length > 1)
            Container(
              constraints: const BoxConstraints(minHeight: 30),
              color: AppColors.background,
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: List.generate(
                  images.length,
                  (index) {
                    final isActive = index == _activeImageIndex;

                    return AnimatedContainer(
                      duration: const Duration(milliseconds: 200),
                      margin: const EdgeInsets.symmetric(horizontal: 3),
                      width: isActive ? 18 : 7,
                      height: 7,
                      decoration: BoxDecoration(
                        color: isActive
                            ? AppColors.primary
                            : AppColors.secondary.withValues(alpha: 0.3),
                        borderRadius: BorderRadius.circular(100),
                      ),
                    );
                  },
                ),
              ),
            ),
        ],
      ),
    );
  }

  // -----------------------------------------------
  // Price and title
  // -----------------------------------------------

  Widget _buildPriceAndTitle(PropertyWithRelations property) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          crossAxisAlignment: CrossAxisAlignment.baseline,
          textBaseline: TextBaseline.alphabetic,
          children: [
            Text(
              formatPrice(property.price),
              style: TextStyle(
                fontFamily: AppFontConfig.fontFamily,
                fontSize: 24,
                fontWeight: FontWeight.bold,
                color: AppColors.primary,
              ),
            ),
            if (property.listingType == 'rent') ...[
              const SizedBox(width: 4),
              Text(
                '/ month',
                style: TextStyle(
                  fontFamily: AppFontConfig.fontFamily,
                  fontSize: 14,
                  color: AppColors.secondary,
                ),
              ),
            ],
          ],
        ),
        const SizedBox(height: 12),
        Text(
          property.title,
          style: TextStyle(
            fontFamily: AppFontConfig.fontFamily,
            fontSize: 24,
            fontWeight: FontWeight.bold,
            color: AppColors.onSurface,
          ),
        ),
      ],
    );
  }

  // -----------------------------------------------
  // Location
  // -----------------------------------------------

  Widget _buildLocation(PropertyWithRelations property) {
    final location = property.address != null
        ? '${property.address}, ${property.city}'
        : property.city;

    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Icon(
          Icons.location_on_outlined,
          size: 18,
          color: AppColors.secondary,
        ),
        const SizedBox(width: 6),
        Expanded(
          child: Text(
            location,
            style: TextStyle(
              fontFamily: AppFontConfig.fontFamily,
              fontSize: 14,
              color: AppColors.secondary,
            ),
          ),
        ),
      ],
    );
  }

  // -----------------------------------------------
  // Property tags
  // -----------------------------------------------

  Widget _buildTags(PropertyWithRelations property) {
    final tags = [
      getPropertyTypeLabel(property.propertyType),
      property.listingType == 'sale' ? 'For sale' : 'For rent',
      property.status,
    ];

    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: tags.map((tag) {
        return Container(
          padding: const EdgeInsets.symmetric(
            horizontal: 12,
            vertical: 6,
          ),
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(100),
          ),
          child: Text(
            tag,
            style: TextStyle(
              fontFamily: AppFontConfig.fontFamily,
              fontSize: 12,
              fontWeight: FontWeight.w500,
              color: AppColors.secondary,
            ),
          ),
        );
      }).toList(),
    );
  }

  // -----------------------------------------------
  // Property specifications
  // -----------------------------------------------

  Widget _buildSpecification({
    required IconData icon,
    required String label,
    required String value,
  }) {
    return Expanded(
      child: Container(
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
            const SizedBox(height: 6),
            Text(
              value,
              style: TextStyle(
                fontFamily: AppFontConfig.fontFamily,
                fontSize: 16,
                fontWeight: FontWeight.w600,
                color: AppColors.onSurface,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              label,
              style: TextStyle(
                fontFamily: AppFontConfig.fontFamily,
                fontSize: 12,
                color: AppColors.secondary,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSpecifications(PropertyWithRelations property) {
    return Row(
      children: [
        _buildSpecification(
          icon: Icons.aspect_ratio_outlined,
          label: 'Surface',
          value: formatNullable(property.surfaceM2, ' m²'),
        ),
        const SizedBox(width: 8),
        _buildSpecification(
          icon: Icons.bed_outlined,
          label: 'Rooms',
          value: formatNullable(property.rooms),
        ),
        const SizedBox(width: 8),
        _buildSpecification(
          icon: Icons.water_drop_outlined,
          label: 'Bathrooms',
          value: formatNullable(property.bathrooms),
        ),
      ],
    );
  }

  // -----------------------------------------------
  // Description
  // -----------------------------------------------

  Widget _buildDescription(PropertyWithRelations property) {
    final description = property.description?.trim().isNotEmpty == true
        ? property.description!.trim()
        : 'No description provided.';

    return Text(
      description,
      style: TextStyle(
        fontFamily: AppFontConfig.fontFamily,
        fontSize: 14,
        height: 1.7,
        color: AppColors.onSurface,
      ),
    );
  }

  // -----------------------------------------------
  // Owner
  // -----------------------------------------------

  Widget _buildOwner(PropertyWithRelations property) {
    final owner = property.profiles;

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          if (owner?.avatarUrl != null &&
              owner!.avatarUrl!.isNotEmpty)
            ClipOval(
              child: Image.network(
                owner.avatarUrl!,
                width: 48,
                height: 48,
                fit: BoxFit.cover,
                errorBuilder: (context, error, stackTrace) {
                  return _buildOwnerAvatarPlaceholder();
                },
              ),
            )
          else
            _buildOwnerAvatarPlaceholder(),

          const SizedBox(width: 12),

          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  owner?.fullName?.isNotEmpty == true
                      ? owner!.fullName!
                      : 'Property owner',
                  style: TextStyle(
                    fontFamily: AppFontConfig.fontFamily,
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    color: AppColors.onSurface,
                  ),
                ),
                if (owner?.phone != null && owner!.phone!.isNotEmpty) ...[
                  const SizedBox(height: 4),
                  Text(
                    owner.phone!,
                    style: TextStyle(
                      fontFamily: AppFontConfig.fontFamily,
                      fontSize: 14,
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

  Widget _buildOwnerAvatarPlaceholder() {
    return Container(
      width: 48,
      height: 48,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: AppColors.background,
      ),
      child: const Icon(
        Icons.person,
        size: 22,
        color: AppColors.secondary,
      ),
    );
  }

  // -----------------------------------------------
  // Section
  // -----------------------------------------------

  Widget _buildSection({
    required String title,
    required Widget child,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: TextStyle(
            fontFamily: AppFontConfig.fontFamily,
            fontSize: 20,
            fontWeight: FontWeight.w600,
            color: AppColors.onSurface,
          ),
        ),
        const SizedBox(height: 12),
        child,
      ],
    );
  }

  // -----------------------------------------------
  // Build
  // -----------------------------------------------

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return AnnotatedRegion<SystemUiOverlayStyle>(
        value: SystemUiOverlayStyle.dark,
        child: _buildLoadingScreen(),
      );
    }

    if (_loadError != null || _property == null) {
      return AnnotatedRegion<SystemUiOverlayStyle>(
        value: SystemUiOverlayStyle.dark,
        child: _buildErrorScreen(),
      );
    }

    final property = _property!;

    final images = List<PropertyImage>.from(property.propertyImages)
      ..sort(
        (first, second) => first.position.compareTo(second.position),
      );

    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: SystemUiOverlayStyle.dark,
      child: Scaffold(
        backgroundColor: AppColors.background,
        body: SafeArea(
          top: true,
          bottom: false,
          child: Column(
            children: [
              _buildTopBar(),

              Expanded(
                child: SingleChildScrollView(
                  physics: const BouncingScrollPhysics(),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _buildImageGallery(images),

                      Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            _buildPriceAndTitle(property),

                            const SizedBox(height: 16),

                            _buildLocation(property),

                            const SizedBox(height: 16),

                            _buildTags(property),

                            const SizedBox(height: 24),

                            _buildSection(
                              title: 'Property overview',
                              child: _buildSpecifications(property),
                            ),

                            const SizedBox(height: 24),

                            _buildSection(
                              title: 'Description',
                              child: _buildDescription(property),
                            ),

                            const SizedBox(height: 24),

                            _buildSection(
                              title: 'Owner',
                              child: _buildOwner(property),
                            ),

                            const SizedBox(height: 32),
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
    );
  }
}