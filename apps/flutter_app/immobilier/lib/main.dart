import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';

import 'core/router.dart';
import 'core/theme.dart';
import 'widgets/property_card.dart';

void main() {
  runApp(const ImmobilierApp());
}

class ImmobilierApp extends StatelessWidget {
  const ImmobilierApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: 'Immobilier',
      debugShowCheckedModeBanner: false,
      routerConfig: appRouter,
      theme: ThemeData(
        useMaterial3: true,
        fontFamily: AppFontConfig.fontFamily,
        scaffoldBackgroundColor: AppColors.background,
        colorScheme: const ColorScheme.light(
          primary: AppColors.primary,
          onPrimary: AppColors.onPrimary,
          secondary: AppColors.secondary,
          onSecondary: AppColors.onSecondary,
          surface: AppColors.surface,
          onSurface: AppColors.onSurface,
          error: AppColors.error,
        ),
      ),
    );
  }
}

// --------------------------------------------------
// Types
// --------------------------------------------------

@immutable
class HomeProperty extends PropertyCardData {
  const HomeProperty({
    required super.id,
    required super.title,
    required super.listingType,
    required super.propertyType,
    required super.price,
    required super.surfaceM2,
    required super.rooms,
    required super.city,
    required this.address,
    required this.bathrooms,
    required this.variant,
  });

  final String? address;
  final int? bathrooms;
  final PropertyCardVariant variant;
}

// --------------------------------------------------
// Mock Properties
// Based on the Supabase properties table
// --------------------------------------------------

const List<HomeProperty> fakeProperties = [
  HomeProperty(
    id: '00000000-0000-4000-8000-000000000001',
    title: 'Bright 3-room apartment',
    listingType: ListingType.sale,
    propertyType: PropertyType.apartment,
    price: 250000.0,
    surfaceM2: 120,
    rooms: 3,
    bathrooms: 2,
    city: 'Tunis',
    address: 'Les Berges du Lac, Tunis',
    variant: PropertyCardVariant.featured,
  ),
  HomeProperty(
    id: '00000000-0000-4000-8000-000000000002',
    title: 'Modern family villa',
    listingType: ListingType.sale,
    propertyType: PropertyType.villa,
    price: 650000.0,
    surfaceM2: 250,
    rooms: 5,
    bathrooms: 3,
    city: 'La Marsa',
    address: 'La Marsa, Tunis',
    variant: PropertyCardVariant.newListing,
  ),
  HomeProperty(
    id: '00000000-0000-4000-8000-000000000003',
    title: 'Cozy apartment for rent',
    listingType: ListingType.rent,
    propertyType: PropertyType.apartment,
    price: 1200.0,
    surfaceM2: 85,
    rooms: 2,
    bathrooms: 1,
    city: 'Ariana',
    address: 'Ennasr 2, Ariana',
    variant: PropertyCardVariant.standard,
  ),
  HomeProperty(
    id: '00000000-0000-4000-8000-000000000004',
    title: 'Spacious traditional house',
    listingType: ListingType.sale,
    propertyType: PropertyType.house,
    price: 320000.0,
    surfaceM2: 180,
    rooms: 4,
    bathrooms: 2,
    city: 'Bizerte',
    address: 'Centre Ville, Bizerte',
    variant: PropertyCardVariant.standard,
  ),
];

// --------------------------------------------------
// Home Screen
// --------------------------------------------------

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final Set<String> _favorites = <String>{};

  @override
  void initState() {
    super.initState();
    fakeLoggedIn.addListener(_clearFavoritesOnLogout);
  }

  @override
  void dispose() {
    fakeLoggedIn.removeListener(_clearFavoritesOnLogout);
    super.dispose();
  }

  void _clearFavoritesOnLogout() {
    if (!fakeLoggedIn.value && _favorites.isNotEmpty) {
      setState(_favorites.clear);
    }
  }

  void _toggleFavorite(String id) {
    if (!fakeLoggedIn.value) {
      context.push(AppRoutes.loginLocation(from: AppRoutes.home));
      return;
    }

    setState(() {
      if (_favorites.contains(id)) {
        _favorites.remove(id);
      } else {
        _favorites.add(id);
      }
    });
  }

  // -----------------------------------------------
  // Render Property
  // -----------------------------------------------

  Widget _buildProperty(BuildContext context, int index) {
    final item = fakeProperties[index];

    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Center(
        child: PropertyCard(
          property: item,
          variant: item.variant,
          currencyLabel: 'DT',
          period: item.listingType == ListingType.rent ? '/ mois' : null,
          favorite: _favorites.contains(item.id),
          onFavoritePress: () => _toggleFavorite(item.id),
          onPress: () {
            debugPrint('Selected property: ${item.id}');
          },
        ),
      ),
    );
  }

  // -----------------------------------------------
  // Screen
  // -----------------------------------------------

  @override
  Widget build(BuildContext context) {
    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: SystemUiOverlayStyle.dark,
      child: Scaffold(
        backgroundColor: AppColors.background,
        body: SafeArea(
          child: Column(
            children: [
              // Header

              Padding(
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Padding(
                            padding: EdgeInsets.only(bottom: 4),
                            child: Text(
                              'Find your next home',
                              style: TextStyle(
                                fontFamily: AppFontConfig.fontFamily,
                                fontSize: 14,
                                fontWeight: FontWeight.w400,
                                height: 20 / 14,
                                color: AppColors.secondary,
                              ),
                            ),
                          ),
                          Text(
                            'Immobilier',
                            style: Theme.of(context)
                                .textTheme
                                .headlineMedium
                                ?.copyWith(color: AppColors.primary),
                          ),
                        ],
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 8,
                      ),
                      decoration: BoxDecoration(
                        color: AppColors.surfaceVariant,
                        borderRadius: BorderRadius.circular(999),
                      ),
                      child: Text(
                        '${fakeProperties.length} biens',
                        style: const TextStyle(
                          fontFamily: AppFontConfig.fontFamily,
                          fontSize: 13,
                          fontWeight: FontWeight.w500,
                          color: AppColors.secondary,
                        ),
                      ),
                    ),
                  ],
                ),
              ),

              // Section Header

              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Container(
                  margin: const EdgeInsets.only(bottom: 16),
                  width: double.infinity,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Padding(
                        padding: EdgeInsets.only(bottom: 4),
                        child: Text(
                          'Nos propriétés',
                          style: TextStyle(
                            fontFamily: AppFontConfig.fontFamily,
                            fontSize: 22,
                            fontWeight: FontWeight.w500,
                            height: 28 / 22,
                            color: AppColors.onBackground,
                          ),
                        ),
                      ),
                      const Text(
                        'Découvrez nos dernières annonces',
                        style: TextStyle(
                          fontFamily: AppFontConfig.fontFamily,
                          fontSize: 14,
                          fontWeight: FontWeight.w400,
                          height: 20 / 14,
                          letterSpacing: 0.25,
                          color: AppColors.secondary,
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              // Properties List

              Expanded(
                child: ListView.builder(
                  itemCount: fakeProperties.length,
                  itemBuilder: _buildProperty,
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 32),
                  physics: const BouncingScrollPhysics(),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}