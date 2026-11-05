import 'package:flutter/material.dart';

import '../core/theme.dart';

class PropertyCard extends StatelessWidget {
  const PropertyCard({
    super.key,
    this.image,
    required this.price,
    this.period = '',
    required this.title,
    required this.location,
    this.surface,
    this.rooms,
    required this.propertyType,
    this.favorite = false,
    this.onFavoritePress,
    this.onPress,
  });

  final ImageProvider? image;
  final String price;
  final String period;
  final String title;
  final String location;
  final num? surface;
  final int? rooms;
  final String propertyType;
  final bool favorite;
  final VoidCallback? onFavoritePress;
  final VoidCallback? onPress;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;

    return Semantics(
      button: true,
      label: '$title, $price',
      child: Container(
        // Card: 328 x 334 dp
        width: 328,
        height: 334,
        clipBehavior: Clip.antiAlias,
        decoration: appCardDecoration,
        child: Material(
          type: MaterialType.transparency,
          child: InkWell(
            onTap: onPress,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                _buildMedia(),
                Expanded(child: _buildContent(textTheme)),
              ],
            ),
          ),
        ),
      ),
    );
  }

  // Media: 326 x 184 dp
  Widget _buildMedia() {
    return SizedBox(
      height: 184,
      width: double.infinity,
      child: ColoredBox(
        color: AppColors.outlineVariant,
        child: Stack(
          fit: StackFit.expand,
          children: [
            if (image != null)
              Image(image: image!, fit: BoxFit.cover)
            else
              const Center(
                child: Icon(
                  Icons.image_outlined,
                  size: 48,
                  color: AppColors.placeholder,
                ),
              ),

            // Favorite button: 48 x 48 dp touch target
            Positioned(
              top: 4,
              right: 2,
              child: Semantics(
                button: true,
                label: favorite ? 'Remove from favorites' : 'Add to favorites',
                child: SizedBox(
                  width: 48,
                  height: 48,
                  child: InkResponse(
                    // Inner tap wins over the card tap (same as stopPropagation)
                    onTap: onFavoritePress,
                    radius: 24,
                    child: Center(
                      child: Container(
                        width: 40,
                        height: 40,
                        decoration: const BoxDecoration(
                          color: AppColors.surface,
                          shape: BoxShape.circle,
                        ),
                        child: Icon(
                          favorite ? Icons.favorite : Icons.favorite_border,
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
          ],
        ),
      ),
    );
  }

  // Content: padding 12 / 16 / 16, gap 8
  Widget _buildContent(TextTheme textTheme) {
    final bodyStyle = textTheme.bodyMedium?.copyWith(color: AppColors.secondary);

    return Padding(
      padding: const EdgeInsets.fromLTRB(
        AppSpacing.lg,
        AppSpacing.md,
        AppSpacing.lg,
        AppSpacing.lg,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        spacing: AppSpacing.sm, // needs Flutter 3.27+
        children: [
          // Price row
          SizedBox(
            height: 28,
            child: Row(
              spacing: AppSpacing.xs,
              crossAxisAlignment: CrossAxisAlignment.baseline,
              textBaseline: TextBaseline.alphabetic,
              children: [
                Flexible(
                  child: Text(
                    price,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: textTheme.titleLarge?.copyWith(
                      color: AppColors.primary,
                    ),
                  ),
                ),
                if (period.isNotEmpty)
                  Text(
                    period,
                    style: textTheme.bodySmall?.copyWith(
                      color: AppColors.secondary,
                    ),
                  ),
              ],
            ),
          ),

          // Title
          SizedBox(
            height: 24,
            child: Text(
              title,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: textTheme.titleMedium?.copyWith(
                color: AppColors.onBackground,
              ),
            ),
          ),

          // Location row
          SizedBox(
            height: 20,
            child: Row(
              spacing: AppSpacing.xs,
              children: [
                const Icon(
                  Icons.location_on_outlined,
                  size: 16,
                  color: AppColors.secondary,
                ),
                Expanded(
                  child: Text(
                    location,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: bodyStyle,
                  ),
                ),
              ],
            ),
          ),

          // Specs row
          SizedBox(
            height: 24,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              spacing: AppSpacing.sm,
              children: [
                Row(
                  spacing: AppSpacing.md,
                  children: [
                    if (surface != null)
                      _SpecItem(
                        icon: Icons.open_in_full,
                        text: '$surface m²',
                        style: bodyStyle,
                      ),
                    if (rooms != null)
                      _SpecItem(
                        icon: Icons.bed_outlined,
                        text: '$rooms rooms',
                        style: bodyStyle,
                      ),
                  ],
                ),

                // Property type chip
                Flexible(
                  child: Container(
                    height: 24,
                    padding: const EdgeInsets.symmetric(
                      horizontal: AppSpacing.sm,
                    ),
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      color: AppColors.surfaceVariant,
                      borderRadius: BorderRadius.circular(AppRadius.full),
                    ),
                    child: Text(
                      propertyType,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: textTheme.labelMedium?.copyWith(
                        color: AppColors.secondary,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _SpecItem extends StatelessWidget {
  const _SpecItem({
    required this.icon,
    required this.text,
    required this.style,
  });

  final IconData icon;
  final String text;
  final TextStyle? style;

  @override
  Widget build(BuildContext context) {
    return Row(
      spacing: AppSpacing.xs,
      children: [
        Icon(icon, size: 16, color: AppColors.secondary),
        Text(text, style: style),
      ],
    );
  }
}

// Usage:
// PropertyCard(
//   image: const NetworkImage('https://...'),
//   price: '\$1,200',
//   period: '/ month',
//   title: 'Modern apartment',
//   location: 'La Marsa, Tunis',
//   surface: 85,
//   rooms: 3,
//   propertyType: 'Apartment',
//   favorite: isFavorite,
//   onFavoritePress: () => setState(() => isFavorite = !isFavorite),
//   onPress: () {},
// )