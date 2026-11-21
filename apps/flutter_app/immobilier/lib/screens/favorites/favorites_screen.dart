import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/router.dart';
import '../../core/theme.dart';
import '../../models/property_models.dart' as property_models;
import '../../providers/auth_providers.dart';
import '../../providers/favorite_providers.dart';
import '../../services/favorite_service.dart';
import '../../widgets/property_card.dart';

class FavoritesScreen extends ConsumerStatefulWidget {
  const FavoritesScreen({super.key});

  @override
  ConsumerState<FavoritesScreen> createState() => _FavoritesScreenState();
}

class _FavoritesScreenState extends ConsumerState<FavoritesScreen> {
  final FavoriteService _favoriteService = FavoriteService();

  List<property_models.PropertyWithRelations> _properties = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadFavorites();
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
  }

  Future<void> _loadFavorites() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final properties = await _favoriteService.getFavoriteProperties();

      if (!mounted) return;

      setState(() {
        _properties = properties;
        _loading = false;
      });
    } catch (error) {
      if (!mounted) return;

      setState(() {
        _loading = false;
        _error = error.toString().startsWith('Exception:')
            ? error.toString().substring('Exception:'.length).trim()
            : error.toString();
      });
    }
  }

  Future<void> _removeFavorite(String id) async {
    final notifier = ref.read(favoritePropertyIdsProvider.notifier);

    final removed = _properties.firstWhere((property) => property.id == id);

    setState(() {
      _properties.removeWhere((property) => property.id == id);
    });

    try {
      await notifier.remove(id);
    } catch (error) {
      if (!mounted) return;

      setState(() {
        _properties.add(removed);
      });

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            error.toString().startsWith('Exception:')
                ? error.toString().substring('Exception:'.length).trim()
                : error.toString(),
          ),
        ),
      );
    }
  }

  Widget _buildPropertyCard(property_models.PropertyWithRelations property) {
    final imageUrl = property.propertyImages.isNotEmpty
        ? property.propertyImages.first.imageUrl
        : null;

    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Center(
        child: PropertyCard(
          image: imageUrl != null ? NetworkImage(imageUrl) : null,
          property: PropertyCardData(
            id: property.id,
            title: property.title,
            listingType: ListingType.values.byName(property.listingType),
            propertyType: PropertyType.values.byName(property.propertyType),
            price: property.price,
            surfaceM2: property.surfaceM2?.toInt(),
            rooms: property.rooms,
            city: property.city,
          ),
          variant: PropertyCardVariant.standard,
          currencyLabel: 'DT',
          period: property.listingType == 'rent' ? '/ mois' : null,
          favorite: true,
          onFavoritePress: () => _removeFavorite(property.id),
          onPress: () {
            context.push(
              AppRoutes.propertyDetailsLocation(property.id),
            );
          },
        ),
      ),
    );
  }

  Widget _buildLoadingScreen() {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const CircularProgressIndicator(color: AppColors.primary),
              const SizedBox(height: 16),
              Text(
                'Loading your favorites...',
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
                  _error ?? 'Unable to load your favorites.',
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
                    onPressed: _loadFavorites,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      foregroundColor: AppColors.onPrimary,
                      padding: const EdgeInsets.symmetric(horizontal: 24),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    child: const Text(
                      'Try again',
                      style: TextStyle(
                        fontFamily: AppFontConfig.fontFamily,
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: AppColors.onPrimary,
                      ),
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

  Widget _buildEmptyScreen() {
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
                  Icons.favorite_border,
                  size: 64,
                  color: AppColors.secondary,
                ),
                const SizedBox(height: 16),
                Text(
                  'You haven\'t saved any properties yet',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontFamily: AppFontConfig.fontFamily,
                    fontSize: 16,
                    fontWeight: FontWeight.w500,
                    color: AppColors.onBackground,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'Properties you favorite will appear here.',
                  textAlign: TextAlign.center,
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
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    // Reload whenever the favorite IDs set changes (e.g. favorited from Home).
    ref.listen(favoritePropertyIdsProvider, (previous, next) {
      if (mounted && next != previous) {
        _loadFavorites();
      }
    });

    // Reload favorites when the user logs in.
    ref.listen(sessionProvider, (previous, next) {
      if (previous == null && next != null) {
        _loadFavorites();
      }
    });

    if (_loading) {
      return _buildLoadingScreen();
    }

    if (_error != null) {
      return _buildErrorScreen();
    }

    if (_properties.isEmpty) {
      return _buildEmptyScreen();
    }

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.background,
        surfaceTintColor: Colors.transparent,
        foregroundColor: AppColors.onSurface,
        elevation: 0,
        scrolledUnderElevation: 0,
        centerTitle: false,
        title: Text(
          'Favorites',
          style: TextStyle(
            fontFamily: AppFontConfig.fontFamily,
            fontSize: 22,
            fontWeight: FontWeight.w500,
            height: 28 / 22,
            color: AppColors.onBackground,
          ),
        ),
      ),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: _loadFavorites,
          color: AppColors.primary,
          child: ListView.builder(
            itemCount: _properties.length,
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
            physics: const BouncingScrollPhysics(
              parent: AlwaysScrollableScrollPhysics(),
            ),
            itemBuilder: (context, index) {
              return _buildPropertyCard(_properties[index]);
            },
          ),
        ),
      ),
    );
  }
}