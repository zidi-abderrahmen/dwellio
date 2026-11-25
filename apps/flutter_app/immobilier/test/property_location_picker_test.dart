import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:geolocator/geolocator.dart';
import 'package:latlong2/latlong.dart';
import 'package:immobilier/screens/property/add_property_screen.dart';
import 'package:immobilier/services/location_service.dart';

void main() {
  testWidgets('uses current position and moves the map camera and marker', (
    tester,
  ) async {
    final position = Position(
      latitude: 35.123,
      longitude: 10.456,
      timestamp: DateTime.utc(2026, 11, 24),
      accuracy: 5,
      altitude: 0,
      altitudeAccuracy: 0,
      heading: 0,
      headingAccuracy: 0,
      speed: 0,
      speedAccuracy: 0,
    );
    await _pumpLocationScreen(
      tester,
      _FakeLocationService(() async => position),
    );

    await tester.tap(find.text('Use my location'));
    await tester.pumpAndSettle();

    final map = tester.widget<FlutterMap>(find.byType(FlutterMap));
    expect(map.mapController!.camera.center, const LatLng(35.123, 10.456));
    expect(
      tester.widget<MarkerLayer>(find.byType(MarkerLayer)).markers.single.point,
      const LatLng(35.123, 10.456),
    );
  });

  testWidgets('shows denied permission and still allows manual map selection', (
    tester,
  ) async {
    const message = 'Location permission was denied.';
    await _pumpLocationScreen(
      tester,
      _FakeLocationService(
        () async => throw const LocationServiceFailure(message),
      ),
    );

    await tester.tap(find.text('Use my location'));
    await tester.pump();
    expect(find.text(message), findsOneWidget);

    final mapFinder = find.byType(FlutterMap);
    await tester.tapAt(tester.getCenter(mapFinder));
    await tester.pump(const Duration(milliseconds: 300));

    final map = tester.widget<FlutterMap>(mapFinder);
    final marker = tester
        .widget<MarkerLayer>(find.byType(MarkerLayer))
        .markers
        .single;
    expect(
      marker.point.latitude,
      closeTo(map.mapController!.camera.center.latitude, 1e-6),
    );
    expect(
      marker.point.longitude,
      closeTo(map.mapController!.camera.center.longitude, 1e-6),
    );
  });

  testWidgets('shows a message when location services are disabled', (
    tester,
  ) async {
    const message =
        'Location services are disabled. Please enable them and try again.';
    await _pumpLocationScreen(
      tester,
      _FakeLocationService(
        () async => throw const LocationServiceFailure(message),
      ),
    );

    await tester.tap(find.text('Use my location'));
    await tester.pump();

    expect(find.text(message), findsOneWidget);
  });

  testWidgets('shows a readable error when GPS retrieval fails', (
    tester,
  ) async {
    await _pumpLocationScreen(
      tester,
      _FakeLocationService(() async => throw StateError('GPS unavailable')),
    );

    await tester.tap(find.text('Use my location'));
    await tester.pump();

    expect(
      find.text('Unable to get your location. Please try again.'),
      findsOneWidget,
    );
  });

  testWidgets('requires a selected location before publishing', (tester) async {
    await _pumpLocationScreen(
      tester,
      _FakeLocationService(() async => throw StateError('Not used')),
    );

    final fields = find.byType(TextFormField);
    await tester.enterText(fields.at(0), 'Test property');
    await tester.enterText(fields.at(1), '100000');
    await tester.enterText(fields.at(2), 'Tunis');

    await tester.tap(find.text('Property type'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Apartment').last);
    await tester.pumpAndSettle();
    await tester.tap(find.text('Sale'));
    await tester.pumpAndSettle();

    await tester.tap(find.text('Publish Property'));
    await tester.pump();

    expect(
      find.text('Select a location on the map or use your current location.'),
      findsOneWidget,
    );
  });
}

Future<void> _pumpLocationScreen(
  WidgetTester tester,
  LocationService locationService,
) async {
  tester.view.physicalSize = const Size(800, 1800);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);

  await tester.pumpWidget(
    ProviderScope(
      child: MaterialApp(
        home: AddPropertyScreen(locationService: locationService),
      ),
    ),
  );
  await tester.pumpAndSettle();
}

class _FakeLocationService extends LocationService {
  _FakeLocationService(this._getPosition);

  final Future<Position> Function() _getPosition;

  @override
  Future<Position> getCurrentPosition() => _getPosition();
}
