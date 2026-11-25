import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../core/theme.dart';
import '../../models/property_models.dart';

class PropertyFilterSheet extends StatefulWidget {
  const PropertyFilterSheet({super.key, required this.initialFilters});

  final PropertyFilters initialFilters;

  @override
  State<PropertyFilterSheet> createState() => _PropertyFilterSheetState();
}

class _PropertyFilterSheetState extends State<PropertyFilterSheet> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _cityController;
  late final TextEditingController _minPriceController;
  late final TextEditingController _maxPriceController;
  late PropertyType? _propertyType;
  late ListingType? _listingType;
  String? _rangeError;

  @override
  void initState() {
    super.initState();
    _cityController = TextEditingController(
      text: widget.initialFilters.city ?? '',
    );
    _minPriceController = TextEditingController(
      text: widget.initialFilters.minPrice?.toString() ?? '',
    );
    _maxPriceController = TextEditingController(
      text: widget.initialFilters.maxPrice?.toString() ?? '',
    );
    _propertyType = widget.initialFilters.propertyType;
    _listingType = widget.initialFilters.listingType;
  }

  @override
  void dispose() {
    _cityController.dispose();
    _minPriceController.dispose();
    _maxPriceController.dispose();
    super.dispose();
  }

  String? _validatePrice(String? value) {
    final text = value?.trim() ?? '';
    if (text.isEmpty) return null;

    final price = double.tryParse(text);
    if (price == null || !price.isFinite || price < 0) {
      return 'Enter a valid non-negative price.';
    }

    return null;
  }

  double? _parsePrice(String value) {
    final trimmedValue = value.trim();
    return trimmedValue.isEmpty ? null : double.parse(trimmedValue);
  }

  void _applyFilters() {
    if (!_formKey.currentState!.validate()) return;

    final minPrice = _parsePrice(_minPriceController.text);
    final maxPrice = _parsePrice(_maxPriceController.text);
    if (minPrice != null && maxPrice != null && minPrice > maxPrice) {
      setState(() {
        _rangeError = 'Minimum price cannot exceed maximum price.';
      });
      return;
    }

    Navigator.of(context).pop(
      PropertyFilters(
        city: _cityController.text.trim().isEmpty
            ? null
            : _cityController.text.trim(),
        minPrice: minPrice,
        maxPrice: maxPrice,
        propertyType: _propertyType,
        listingType: _listingType,
      ),
    );
  }

  void _resetFilters() {
    Navigator.of(context).pop(const PropertyFilters());
  }

  InputDecoration _decoration(String label) {
    return InputDecoration(
      labelText: label,
      filled: true,
      fillColor: AppColors.surface,
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: const BorderSide(color: AppColors.outline),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: const BorderSide(color: AppColors.primary),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final bottomInset = MediaQuery.viewInsetsOf(context).bottom;

    return SafeArea(
      child: Padding(
        padding: EdgeInsets.fromLTRB(20, 12, 20, 20 + bottomInset),
        child: Form(
          key: _formKey,
          child: SingleChildScrollView(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              mainAxisSize: MainAxisSize.min,
              children: [
                Center(
                  child: Container(
                    width: 40,
                    height: 4,
                    decoration: BoxDecoration(
                      color: AppColors.outline,
                      borderRadius: BorderRadius.circular(99),
                    ),
                  ),
                ),
                const SizedBox(height: 20),
                Text(
                  'Filters',
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    color: AppColors.onBackground,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 20),
                TextFormField(
                  controller: _cityController,
                  textInputAction: TextInputAction.next,
                  decoration: _decoration('City'),
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(
                      child: TextFormField(
                        controller: _minPriceController,
                        keyboardType: const TextInputType.numberWithOptions(
                          decimal: true,
                        ),
                        inputFormatters: [
                          FilteringTextInputFormatter.allow(RegExp(r'[0-9.]')),
                        ],
                        validator: _validatePrice,
                        onChanged: (_) {
                          if (_rangeError != null) {
                            setState(() => _rangeError = null);
                          }
                        },
                        decoration: _decoration('Minimum price'),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: TextFormField(
                        controller: _maxPriceController,
                        keyboardType: const TextInputType.numberWithOptions(
                          decimal: true,
                        ),
                        inputFormatters: [
                          FilteringTextInputFormatter.allow(RegExp(r'[0-9.]')),
                        ],
                        validator: _validatePrice,
                        onChanged: (_) {
                          if (_rangeError != null) {
                            setState(() => _rangeError = null);
                          }
                        },
                        decoration: _decoration('Maximum price'),
                      ),
                    ),
                  ],
                ),
                if (_rangeError != null) ...[
                  const SizedBox(height: 8),
                  Text(
                    _rangeError!,
                    style: const TextStyle(
                      color: AppColors.error,
                      fontSize: 12,
                    ),
                  ),
                ],
                const SizedBox(height: 16),
                DropdownButtonFormField<PropertyType?>(
                  initialValue: _propertyType,
                  decoration: _decoration('Property type'),
                  items: [
                    const DropdownMenuItem<PropertyType?>(
                      value: null,
                      child: Text('Any type'),
                    ),
                    for (final type in PropertyType.values)
                      DropdownMenuItem<PropertyType?>(
                        value: type,
                        child: Text(_propertyTypeLabel(type)),
                      ),
                  ],
                  onChanged: (value) {
                    setState(() => _propertyType = value);
                  },
                ),
                const SizedBox(height: 16),
                DropdownButtonFormField<ListingType?>(
                  initialValue: _listingType,
                  decoration: _decoration('Listing type'),
                  items: [
                    const DropdownMenuItem<ListingType?>(
                      value: null,
                      child: Text('Any listing'),
                    ),
                    for (final type in ListingType.values)
                      DropdownMenuItem<ListingType?>(
                        value: type,
                        child: Text(_listingTypeLabel(type)),
                      ),
                  ],
                  onChanged: (value) {
                    setState(() => _listingType = value);
                  },
                ),
                const SizedBox(height: 24),
                FilledButton(
                  onPressed: _applyFilters,
                  style: FilledButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    foregroundColor: AppColors.onPrimary,
                  ),
                  child: const Text('Apply Filters'),
                ),
                const SizedBox(height: 8),
                TextButton(
                  onPressed: _resetFilters,
                  child: const Text('Reset'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  String _propertyTypeLabel(PropertyType type) {
    return switch (type) {
      PropertyType.apartment => 'Apartment',
      PropertyType.house => 'House',
      PropertyType.villa => 'Villa',
      PropertyType.land => 'Land',
      PropertyType.office => 'Office',
      PropertyType.shop => 'Shop',
    };
  }

  String _listingTypeLabel(ListingType type) {
    return switch (type) {
      ListingType.sale => 'Sale',
      ListingType.rent => 'Rent',
    };
  }
}
