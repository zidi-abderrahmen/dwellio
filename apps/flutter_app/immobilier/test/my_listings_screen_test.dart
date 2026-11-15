import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:immobilier/models/property_models.dart';
import 'package:immobilier/screens/property/my_listings_screen.dart';
import 'package:immobilier/services/property_service.dart';

void main() {
  testWidgets('shows the signed-in user listings and their statuses', (
    tester,
  ) async {
    final properties = [
      _property(id: 'active-property', title: 'Sunny apartment'),
      _property(
        id: 'hidden-property',
        title: 'Quiet house',
        listingType: 'rent',
        status: 'hidden',
      ),
    ];

    await tester.pumpWidget(
      MaterialApp(
        home: MyListingsScreen(
          loadProperties: () async => properties,
          currentUserId: 'authenticated-user',
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Sunny apartment'), findsOneWidget);
    expect(find.text('Quiet house'), findsOneWidget);
    expect(find.text('Active'), findsOneWidget);
    expect(find.text('Hidden'), findsOneWidget);
    expect(find.text('For sale'), findsOneWidget);
    expect(find.text('For rent'), findsOneWidget);
  });

  testWidgets('shows an empty state when the user has no listings', (
    tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        home: MyListingsScreen(
          loadProperties: () async => [],
          currentUserId: 'authenticated-user',
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(
      find.text('You have not published any properties yet.'),
      findsOneWidget,
    );
    expect(find.text('Publish a property'), findsOneWidget);
  });

  testWidgets('shows a retryable error state when loading fails', (
    tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        home: MyListingsScreen(
          loadProperties: () async => throw Exception('Network unavailable'),
          currentUserId: 'authenticated-user',
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(
      find.text(
        'Unable to load your properties. Please check your connection and try again.',
      ),
      findsOneWidget,
    );
    expect(find.text('Try again'), findsOneWidget);
  });

  testWidgets('requires confirmation before deleting an owned property', (
    tester,
  ) async {
    final properties = [_property(id: 'owned-property', title: 'My property')];
    var deletionCount = 0;

    await tester.pumpWidget(
      MaterialApp(
        home: MyListingsScreen(
          loadProperties: () async => properties,
          deleteProperty: (id) async {
            deletionCount++;
            properties.removeWhere((property) => property.id == id);
          },
          currentUserId: 'authenticated-user',
        ),
      ),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.byTooltip('Listing actions'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Delete'));
    await tester.pumpAndSettle();
    expect(
      find.text('Do you really want to permanently delete "My property"?'),
      findsOneWidget,
    );

    await tester.tap(find.text('Cancel'));
    await tester.pumpAndSettle();
    expect(deletionCount, 0);
    expect(find.text('My property'), findsOneWidget);

    await tester.tap(find.byTooltip('Listing actions'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Delete'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Delete'));
    await tester.pumpAndSettle();

    expect(deletionCount, 1);
    expect(find.text('Property deleted successfully.'), findsOneWidget);
    expect(find.text('My property'), findsNothing);
  });

  testWidgets('hides delete action for another user property', (tester) async {
    final property = _property(
      id: 'another-users-property',
      title: 'Not mine',
      ownerId: 'different-user',
    );

    await tester.pumpWidget(
      MaterialApp(
        home: MyListingsScreen(
          loadProperties: () async => [property],
          deleteProperty: (id) async {},
          currentUserId: 'authenticated-user',
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Not mine'), findsOneWidget);
    expect(find.byTooltip('Listing actions'), findsNothing);
  });

  testWidgets('shows a loading indicator while deletion is in progress', (
    tester,
  ) async {
    final properties = [_property(id: 'owned-property', title: 'My property')];
    final deletion = Completer<void>();

    await tester.pumpWidget(
      MaterialApp(
        home: MyListingsScreen(
          loadProperties: () async => properties,
          deleteProperty: (id) async {
            await deletion.future;
            properties.removeWhere((property) => property.id == id);
          },
          currentUserId: 'authenticated-user',
        ),
      ),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.byTooltip('Listing actions'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Delete'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Delete'));
    await tester.pump();

    expect(find.byType(CircularProgressIndicator), findsOneWidget);

    deletion.complete();
    await tester.pumpAndSettle();
    expect(find.text('My property'), findsNothing);
  });

  testWidgets('refreshes after database deletion when storage cleanup fails', (
    tester,
  ) async {
    final property = _property(id: 'owned-property', title: 'My property');
    var deletionAttempted = false;
    var loadCount = 0;

    await tester.pumpWidget(
      MaterialApp(
        home: MyListingsScreen(
          loadProperties: () async {
            loadCount++;
            return deletionAttempted ? [] : [property];
          },
          deleteProperty: (id) async {
            deletionAttempted = true;
            throw const PropertyDeletionFailure(
              'The property was deleted, but some photos could not be removed from storage.',
              propertyDeleted: true,
            );
          },
          currentUserId: 'authenticated-user',
        ),
      ),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.byTooltip('Listing actions'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Delete'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Delete'));
    await tester.pumpAndSettle();

    expect(loadCount, 2);
    expect(find.text('My property'), findsNothing);
    expect(
      find.text(
        'The property was deleted, but some photos could not be removed from storage.',
      ),
      findsOneWidget,
    );
  });
}

PropertyWithRelations _property({
  required String id,
  required String title,
  String ownerId = 'authenticated-user',
  String listingType = 'sale',
  String status = 'active',
}) {
  return PropertyWithRelations(
    id: id,
    ownerId: ownerId,
    title: title,
    listingType: listingType,
    propertyType: 'apartment',
    price: 180000,
    city: 'Tunis',
    status: status,
    createdAt: '2026-11-12T10:00:00Z',
    updatedAt: '2026-11-12T10:00:00Z',
    propertyImages: const [],
  );
}