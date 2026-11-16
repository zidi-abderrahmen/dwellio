import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:immobilier/models/property.dart';
import 'package:immobilier/screens/property/add_property_screen.dart';

void main() {
  testWidgets('prefills and updates the existing property without photos', (
    tester,
  ) async {
    Property? updatedProperty;
    var loadedPropertyId = '';
    final router = GoRouter(
      initialLocation: '/list',
      routes: [
        GoRoute(
          path: '/list',
          builder: (context, state) => Scaffold(
            body: Builder(
              builder: (context) => TextButton(
                onPressed: () => context.push('/edit'),
                child: const Text('Open editor'),
              ),
            ),
          ),
        ),
        GoRoute(
          path: '/edit',
          builder: (context, state) => AddPropertyScreen(
            propertyId: 'owned-property',
            loadPropertyForEditing: (propertyId) async {
              loadedPropertyId = propertyId;
              return _property;
            },
            updateProperty:
                ({
                  required id,
                  required title,
                  description,
                  required listingType,
                  required propertyType,
                  required price,
                  surfaceM2,
                  rooms,
                  required city,
                }) async {
                  updatedProperty = Property(
                    id: id,
                    ownerId: 'authenticated-user',
                    title: title,
                    description: description,
                    listingType: listingType.value,
                    propertyType: propertyType.value,
                    price: price,
                    surfaceM2: surfaceM2?.toDouble(),
                    rooms: rooms,
                    city: city,
                    status: 'active',
                    createdAt: _property.createdAt,
                    updatedAt: _property.updatedAt,
                  );
                  return updatedProperty!;
                },
          ),
        ),
      ],
    );
    addTearDown(router.dispose);

    await tester.pumpWidget(
      ProviderScope(child: MaterialApp.router(routerConfig: router)),
    );
    await tester.tap(find.text('Open editor'));
    await tester.pumpAndSettle();

    expect(loadedPropertyId, 'owned-property');
    final fields = find.byType(TextFormField);
    expect(
      tester.widget<TextFormField>(fields.at(0)).controller!.text,
      'Cozy apartment',
    );
    expect(
      tester.widget<TextFormField>(fields.at(1)).controller!.text,
      '180000',
    );
    expect(
      tester.widget<TextFormField>(fields.at(2)).controller!.text,
      'Tunis',
    );
    expect(find.text('Photos (optional, up to 5)'), findsNothing);

    await tester.enterText(fields.at(0), 'Renovated apartment');
    await tester.enterText(fields.at(1), '225000');
    await tester.ensureVisible(find.text('Save changes'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Save changes'));
    await tester.pumpAndSettle();

    expect(updatedProperty?.id, 'owned-property');
    expect(updatedProperty?.ownerId, 'authenticated-user');
    expect(updatedProperty?.title, 'Renovated apartment');
    expect(updatedProperty?.price, 225000);
    expect(find.text('Open editor'), findsOneWidget);
  });
}

final _property = PropertyWithRelations(
  id: 'owned-property',
  ownerId: 'authenticated-user',
  title: 'Cozy apartment',
  description: 'Near the city center',
  listingType: 'sale',
  propertyType: 'apartment',
  price: 180000,
  surfaceM2: 90,
  rooms: 3,
  city: 'Tunis',
  status: 'active',
  createdAt: '2026-11-12T10:00:00Z',
  updatedAt: '2026-11-12T10:00:00Z',
  propertyImages: const [],
);