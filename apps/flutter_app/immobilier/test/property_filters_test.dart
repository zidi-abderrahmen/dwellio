import 'package:flutter_test/flutter_test.dart';
import 'package:immobilier/models/property_models.dart';

void main() {
  group('PropertyFilters', () {
    test('has no active filters when every value is unset', () {
      expect(const PropertyFilters().hasActiveFilters, isFalse);
    });

    test('treats a blank city as inactive', () {
      expect(const PropertyFilters(city: '  ').hasActiveFilters, isFalse);
    });

    test('represents all selected filters together', () {
      const filters = PropertyFilters(
        city: 'Tozeur',
        minPrice: 50000,
        maxPrice: 200000,
        propertyType: PropertyType.apartment,
        listingType: ListingType.sale,
      );

      expect(filters.hasActiveFilters, isTrue);
      expect(filters.city, 'Tozeur');
      expect(filters.minPrice, 50000);
      expect(filters.maxPrice, 200000);
      expect(filters.propertyType, PropertyType.apartment);
      expect(filters.listingType, ListingType.sale);
    });

    test('updates or clears city without changing other filters', () {
      const filters = PropertyFilters(
        city: 'Tunis',
        minPrice: 50000,
        maxPrice: 200000,
        propertyType: PropertyType.apartment,
        listingType: ListingType.sale,
      );

      final updated = filters.copyWithCity('Tozeur');
      expect(updated.city, 'Tozeur');
      expect(updated.minPrice, filters.minPrice);
      expect(updated.maxPrice, filters.maxPrice);
      expect(updated.propertyType, filters.propertyType);
      expect(updated.listingType, filters.listingType);

      final cleared = updated.copyWithCity(null);
      expect(cleared.city, isNull);
      expect(cleared.minPrice, filters.minPrice);
      expect(cleared.maxPrice, filters.maxPrice);
      expect(cleared.propertyType, filters.propertyType);
      expect(cleared.listingType, filters.listingType);
    });
  });
}