import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:latlong2/latlong.dart';
import 'package:immobilier/models/property.dart';
import 'package:immobilier/screens/property/add_property_screen.dart';

void main() {
  testWidgets('prefills and updates the existing property without photos', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(800, 1200);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

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
                  required latitude,
                  required longitude,
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
                    latitude: latitude,
                    longitude: longitude,
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

    final mapFinder = find.byType(FlutterMap);
    final mapRect = tester.getRect(mapFinder);
    final map = tester.widget<FlutterMap>(mapFinder);
    expect(
      tester.widget<MarkerLayer>(find.byType(MarkerLayer)).markers.single.point,
      const LatLng(36.8065, 10.1815),
    );

    final firstTapOffset = Offset(
      mapRect.width / 2 - 30,
      mapRect.height / 2 - 20,
    );
    final firstSelectedPoint = map.mapController!.camera.screenOffsetToLatLng(
      firstTapOffset,
    );
    await tester.tapAt(mapRect.topLeft + firstTapOffset);
    await tester.pump(const Duration(milliseconds: 300));

    expect(
      tester.widget<MarkerLayer>(find.byType(MarkerLayer)).markers.single.point,
      firstSelectedPoint,
    );

    final updatedMapRect = tester.getRect(mapFinder);
    final updatedMap = tester.widget<FlutterMap>(mapFinder);
    final secondTapOffset = Offset(
      updatedMapRect.width / 2 + 30,
      updatedMapRect.height / 2 + 20,
    );
    final secondSelectedPoint = updatedMap.mapController!.camera
        .screenOffsetToLatLng(secondTapOffset);
    await tester.tapAt(updatedMapRect.topLeft + secondTapOffset);
    await tester.pump(const Duration(milliseconds: 300));

    expect(secondSelectedPoint, isNot(firstSelectedPoint));
    expect(
      tester.widget<MarkerLayer>(find.byType(MarkerLayer)).markers.single.point,
      secondSelectedPoint,
    );

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
    await tester.tap(find.text('Save changes'));
    await tester.pumpAndSettle();

    expect(updatedProperty?.id, 'owned-property');
    expect(updatedProperty?.ownerId, 'authenticated-user');
    expect(updatedProperty?.title, 'Renovated apartment');
    expect(updatedProperty?.price, 225000);
    expect(updatedProperty?.latitude, secondSelectedPoint.latitude);
    expect(updatedProperty?.longitude, secondSelectedPoint.longitude);
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
  latitude: 36.8065,
  longitude: 10.1815,
  status: 'active',
  createdAt: '2026-11-12T10:00:00Z',
  updatedAt: '2026-11-12T10:00:00Z',
  propertyImages: const [],
);
