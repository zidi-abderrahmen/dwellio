import 'package:flutter/material.dart';

import 'core/theme.dart';
import 'models/property.dart';
import 'widgets/property_card.dart';

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Properties',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light,
      home: const PropertyListScreen(),
    );
  }
}


const _ownerId = '9b1f0c52-6a3e-4c0e-8d57-2f6c1a7e4b10';

final List<Property> fakeProperties = [
  Property(
    id: 'a1c1e0f2-1111-4a1b-9c01-000000000001',
    ownerId: _ownerId,
    title: 'Modern apartment with sea view',
    description: 'Bright apartment close to the beach and cafés.',
    listingType: 'rent',
    propertyType: 'apartment',
    price: 1800,
    surfaceM2: 95,
    rooms: 3,
    bathrooms: 2,
    city: 'La Marsa',
    address: 'Avenue Taieb Mhiri',
    latitude: 36.8782,
    longitude: 10.3247,
    createdAt: DateTime(2026, 10, 28),
    updatedAt: DateTime(2026, 10, 28),
  ),
  Property(
    id: 'a1c1e0f2-2222-4a1b-9c02-000000000002',
    ownerId: _ownerId,
    title: 'Luxury villa with private pool',
    description: 'Spacious villa with a garden and a pool.',
    listingType: 'sale',
    propertyType: 'villa',
    price: 1250000,
    surfaceM2: 320,
    rooms: 6,
    bathrooms: 4,
    city: 'Hammamet',
    address: 'Route de Yasmine',
    latitude: 36.4,
    longitude: 10.6167,
    createdAt: DateTime(2026, 10, 20),
    updatedAt: DateTime(2026, 10, 25),
  ),
  Property(
    id: 'a1c1e0f2-3333-4a1b-9c03-000000000003',
    ownerId: _ownerId,
    title: 'Family house near the beach',
    description: 'Quiet neighborhood, two floors, small terrace.',
    listingType: 'sale',
    propertyType: 'house',
    price: 480000,
    surfaceM2: 180,
    rooms: 4,
    bathrooms: 2,
    city: 'Sousse',
    address: 'Boulevard 14 Janvier',
    latitude: 35.8256,
    longitude: 10.6084,
    createdAt: DateTime(2026, 10, 12),
    updatedAt: DateTime(2026, 10, 12),
  ),
  Property(
    id: 'a1c1e0f2-4444-4a1b-9c04-000000000004',
    ownerId: _ownerId,
    title: 'Open space office, Lac 2',
    description: 'Ready-to-use office in a business district.',
    listingType: 'rent',
    propertyType: 'office',
    price: 2500,
    surfaceM2: 70,
    rooms: 3,
    bathrooms: 1,
    city: 'Tunis',
    address: 'Les Berges du Lac 2',
    latitude: 36.8462,
    longitude: 10.2733,
    createdAt: DateTime(2026, 11, 1),
    updatedAt: DateTime(2026, 11, 1),
  ),
];

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

class PropertyListScreen extends StatefulWidget {
  const PropertyListScreen({super.key});

  @override
  State<PropertyListScreen> createState() => _PropertyListScreenState();
}

class _PropertyListScreenState extends State<PropertyListScreen> {
  final Set<String> _favoriteIds = {};

  void _toggleFavorite(String id) {
    setState(() {
      if (!_favoriteIds.remove(id)) _favoriteIds.add(id);
    });
  }

  void _openProperty(Property property) {
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(SnackBar(content: Text('Opened: ${property.title}')));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Properties'),
        backgroundColor: AppColors.background,
        surfaceTintColor: Colors.transparent,
      ),
      body: ListView.separated(
        padding: const EdgeInsets.all(AppSpacing.lg),
        itemCount: fakeProperties.length,
        separatorBuilder: (_, __) => const SizedBox(height: AppSpacing.lg),
        itemBuilder: (context, index) {
          final p = fakeProperties[index];

          // The card is a fixed 328 x 334, so center it on wide screens.
          return Center(
            child: PropertyCard(
              // image: const NetworkImage('https://...'), // add later
              price: p.formattedPrice,
              period: p.period,
              title: p.title,
              location: p.locationLabel,
              surface: p.surfaceM2,
              rooms: p.rooms,
              propertyType: p.propertyTypeLabel,
              favorite: _favoriteIds.contains(p.id),
              onFavoritePress: () => _toggleFavorite(p.id),
              onPress: () => _openProperty(p),
            ),
          );
        },
      ),
    );
  }
}