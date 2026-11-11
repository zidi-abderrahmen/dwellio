import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:immobilier/models/property_models.dart';
import 'package:immobilier/screens/property/property_filter_sheet.dart';

void main() {
  const initialFilters = PropertyFilters(
    city: 'Tunis',
    minPrice: 50000,
    propertyType: PropertyType.apartment,
    listingType: ListingType.sale,
  );

  testWidgets('closing the sheet does not apply its draft', (tester) async {
    final navigatorKey = GlobalKey<NavigatorState>();
    PropertyFilters? result;

    await tester.pumpWidget(
      MaterialApp(
        navigatorKey: navigatorKey,
        home: Scaffold(
          body: Builder(
            builder: (context) => TextButton(
              onPressed: () async {
                result = await showModalBottomSheet<PropertyFilters>(
                  context: context,
                  isScrollControlled: true,
                  builder: (context) =>
                      const PropertyFilterSheet(initialFilters: initialFilters),
                );
              },
              child: const Text('Open filters'),
            ),
          ),
        ),
      ),
    );

    await tester.tap(find.text('Open filters'));
    await tester.pumpAndSettle();
    navigatorKey.currentState!.pop();
    await tester.pumpAndSettle();

    expect(result, isNull);
  });

  testWidgets('validates price range and applies filters', (tester) async {
    PropertyFilters? result;

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: Builder(
            builder: (context) => TextButton(
              onPressed: () async {
                result = await showModalBottomSheet<PropertyFilters>(
                  context: context,
                  isScrollControlled: true,
                  builder: (context) => const PropertyFilterSheet(
                    initialFilters: PropertyFilters(),
                  ),
                );
              },
              child: const Text('Open filters'),
            ),
          ),
        ),
      ),
    );

    await tester.tap(find.text('Open filters'));
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextFormField).at(1), '200000');
    await tester.enterText(find.byType(TextFormField).at(2), '50000');
    await tester.tap(find.text('Apply Filters'));
    await tester.pumpAndSettle();

    expect(result, isNull);
    expect(
      find.text('Minimum price cannot exceed maximum price.'),
      findsOneWidget,
    );

    await tester.enterText(find.byType(TextFormField).at(2), '250000');
    await tester.tap(find.text('Apply Filters'));
    await tester.pumpAndSettle();

    expect(result?.minPrice, 200000);
    expect(result?.maxPrice, 250000);
  });

  testWidgets('reset returns empty filters', (tester) async {
    PropertyFilters? result;

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: Builder(
            builder: (context) => TextButton(
              onPressed: () async {
                result = await showModalBottomSheet<PropertyFilters>(
                  context: context,
                  isScrollControlled: true,
                  builder: (context) =>
                      const PropertyFilterSheet(initialFilters: initialFilters),
                );
              },
              child: const Text('Open filters'),
            ),
          ),
        ),
      ),
    );

    await tester.tap(find.text('Open filters'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Reset'));
    await tester.pumpAndSettle();

    expect(result?.hasActiveFilters, isFalse);
    expect(result?.city, isNull);
    expect(result?.minPrice, isNull);
    expect(result?.maxPrice, isNull);
    expect(result?.propertyType, isNull);
    expect(result?.listingType, isNull);
  });
}