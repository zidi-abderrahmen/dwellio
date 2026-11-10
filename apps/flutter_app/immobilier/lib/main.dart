import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'core/router.dart';
import 'core/supabase_config.dart';
import 'core/theme.dart';
import 'providers/auth_providers.dart';
import 'widgets/property_card.dart';
import 'models/property_models.dart' as property_models;
import 'services/property_service.dart';

// --------------------------------------------------
// Main
// --------------------------------------------------

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  await Supabase.initialize(
    url: SupabaseConfig.url,
    anonKey: SupabaseConfig.anonKey,
  );

  runApp(
    const ProviderScope(
      child: ImmobilierApp(),
    ),
  );
}

// --------------------------------------------------
// Application
// --------------------------------------------------

class ImmobilierApp extends ConsumerWidget {
  const ImmobilierApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(routerProvider);

    return MaterialApp.router(
      title: 'Immobilier',
      debugShowCheckedModeBanner: false,
      routerConfig: router,
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
// Home Property
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
    required this.imageUrl,
  });

  final String? address;
  final int? bathrooms;
  final PropertyCardVariant variant;
  final String? imageUrl;
}

// --------------------------------------------------
// Home Screen
// --------------------------------------------------

class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  final Set<String> _favorites = <String>{};

  List<property_models.PropertySearchResult> _properties = [];

  bool _loading = true;

  String? _loadError;

  // -----------------------------------------------
  // Lifecycle
  // -----------------------------------------------

  @override
  void initState() {
    super.initState();

    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) {
        _loadProperties();
      }
    });
  }

  // -----------------------------------------------
  // Load properties from Supabase
  // -----------------------------------------------

  Future<void> _loadProperties({
    bool isRefresh = false,
  }) async {
    if (!mounted) return;

    setState(() {
      if (!isRefresh) {
        _loading = true;
      }

      _loadError = null;
    });

    try {
      final result = await getProperties();

      if (!mounted) return;

      setState(() {
        _properties = result;
      });
    } catch (error) {
      debugPrint('Failed to load properties: $error');

      if (!mounted) return;

      setState(() {
        _loadError =
            'Unable to load properties. Please try again.';
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
  // Convert Supabase Property to PropertyCard data
  // -----------------------------------------------

  HomeProperty _toHomeProperty(
    property_models.PropertySearchResult item,
  ) {
    return HomeProperty(
      id: item.id,
      title: item.title,

      listingType: ListingType.values.byName(
        item.listingType,
      ),

      propertyType: PropertyType.values.byName(
        item.propertyType,
      ),

      price: item.price.toDouble(),
      surfaceM2: item.surfaceM2?.toInt(),
      rooms: item.rooms,
      city: item.city,
      address: item.address,
      bathrooms: item.bathrooms,

      variant: PropertyCardVariant.standard,

      imageUrl: item.propertyImages.isNotEmpty
        ? item.propertyImages.first.imageUrl
        : null,
    );
  }

  // -----------------------------------------------
  // Toggle Favorite
  // -----------------------------------------------

  void _toggleFavorite(String id) {
    // Guests must sign in before they can favorite a property.
    if (ref.read(sessionProvider) == null) {
      context.push(
        AppRoutes.loginLocation(from: AppRoutes.home),
      );
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

  Widget _buildProperty(
    BuildContext context,
    int index,
  ) {
    final item = _properties[index];

    final cardProperty = _toHomeProperty(item);

    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Center(
        child: PropertyCard(
          image: cardProperty.imageUrl != null
            ? NetworkImage(cardProperty.imageUrl!)
            : null,
          property: cardProperty,
          variant: PropertyCardVariant.standard,
          currencyLabel: 'DT',
          period: item.listingType == 'rent'
              ? '/ mois'
              : null,
          favorite: _favorites.contains(item.id),
          onFavoritePress: () {
            _toggleFavorite(item.id);
          },
          onPress: () {
            context.push(
              AppRoutes.propertyDetailsLocation(item.id),
            );
          },
        ),
      ),
    );
  }

  // -----------------------------------------------
  // Empty / Loading / Error Content
  // -----------------------------------------------

  Widget _buildListEmptyContent() {
    if (_loading) {
      return Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const CircularProgressIndicator(
            color: AppColors.primary,
          ),
          const SizedBox(height: 12),
          const Text(
            'Loading properties...',
            textAlign: TextAlign.center,
            style: TextStyle(
              fontFamily: AppFontConfig.fontFamily,
              fontSize: 14,
              color: AppColors.secondary,
            ),
          ),
        ],
      );
    }

    if (_loadError != null) {
      return Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            _loadError!,
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontFamily: AppFontConfig.fontFamily,
              fontSize: 14,
              color: AppColors.error,
            ),
          ),

          const SizedBox(height: 12),

          SizedBox(
            height: 44,
            child: ElevatedButton(
              onPressed: () {
                _loadProperties();
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: AppColors.onPrimary,
                padding: const EdgeInsets.symmetric(
                  horizontal: 16,
                ),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              child: const Text(
                'Try again',
                style: TextStyle(
                  fontFamily: AppFontConfig.fontFamily,
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                  color: AppColors.onPrimary,
                ),
              ),
            ),
          ),
        ],
      );
    }

    return const Text(
      'No active properties found.',
      textAlign: TextAlign.center,
      style: TextStyle(
        fontFamily: AppFontConfig.fontFamily,
        fontSize: 14,
        color: AppColors.secondary,
      ),
    );
  }

  // -----------------------------------------------
  // Screen
  // -----------------------------------------------

  @override
  Widget build(BuildContext context) {
    // Clear local favorites after logout.
    ref.listen(sessionProvider, (previous, next) {
      if (next == null && _favorites.isNotEmpty) {
        setState(() {
          _favorites.clear();
        });
      }
    });

    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: SystemUiOverlayStyle.dark,
      child: Scaffold(
        backgroundColor: AppColors.background,
        body: SafeArea(
          child: Column(
            children: [
              // --------------------------------
              // Header
              // --------------------------------

              Padding(
                padding: const EdgeInsets.fromLTRB(
                  16,
                  16,
                  16,
                  24,
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment:
                            CrossAxisAlignment.start,
                        children: [
                          const Padding(
                            padding: EdgeInsets.only(bottom: 4),
                            child: Text(
                              'Find your next home',
                              style: TextStyle(
                                fontFamily:
                                    AppFontConfig.fontFamily,
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
                                ?.copyWith(
                                  color: AppColors.primary,
                                ),
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
                        _loading
                            ? '...'
                            : '${_properties.length} biens',
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

              // --------------------------------
              // Section Header
              // --------------------------------

              Padding(
                padding: const EdgeInsets.symmetric(
                  horizontal: 16,
                ),
                child: Container(
                  margin: const EdgeInsets.only(bottom: 16),
                  width: double.infinity,
                  child: Column(
                    crossAxisAlignment:
                        CrossAxisAlignment.start,
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

              // --------------------------------
              // Supabase Properties List
              // --------------------------------

              Expanded(
                child: RefreshIndicator(
                  onRefresh: () {
                    return _loadProperties(isRefresh: true);
                  },
                  color: AppColors.primary,
                  child: LayoutBuilder(
                    builder: (context, constraints) {
                      return ListView.builder(
                        itemCount: _properties.isEmpty
                            ? 1
                            : _properties.length,

                        padding: const EdgeInsets.fromLTRB(
                          16,
                          0,
                          16,
                          32,
                        ),

                        physics: const BouncingScrollPhysics(
                          parent: AlwaysScrollableScrollPhysics(),
                        ),

                        itemBuilder: (context, index) {
                          // Empty / Loading / Error content
                          if (_properties.isEmpty) {
                            return SizedBox(
                              height: constraints.maxHeight,
                              child: Center(
                                child: Padding(
                                  padding:
                                      const EdgeInsets.symmetric(
                                    horizontal: 16,
                                    vertical: 32,
                                  ),
                                  child: _buildListEmptyContent(),
                                ),
                              ),
                            );
                          }

                          // Property Card
                          return _buildProperty(context, index);
                        },
                      );
                    },
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