import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/router.dart';
import '../../core/theme.dart';
import '../../models/property.dart';
import '../../providers/property_providers.dart';
import '../../services/property_service.dart';
import '../../widgets/auth_form_widgets.dart';

class AddPropertyScreen extends ConsumerStatefulWidget {
  const AddPropertyScreen({super.key});

  @override
  ConsumerState<AddPropertyScreen> createState() => _AddPropertyScreenState();
}

class _AddPropertyScreenState extends ConsumerState<AddPropertyScreen> {
  final _formKey = GlobalKey<FormState>();
  final _titleController = TextEditingController();
  final _priceController = TextEditingController();
  final _cityController = TextEditingController();
  final _descriptionController = TextEditingController();
  final _surfaceController = TextEditingController();
  final _roomsController = TextEditingController();
  final _propertyService = PropertyService();

  PropertyType? _propertyType;
  ListingType? _listingType;
  bool _submitting = false;

  @override
  void dispose() {
    _titleController.dispose();
    _priceController.dispose();
    _cityController.dispose();
    _descriptionController.dispose();
    _surfaceController.dispose();
    _roomsController.dispose();
    super.dispose();
  }

  String? _validateTitle(String? value) {
    final title = value?.trim() ?? '';
    if (title.isEmpty) return 'Title is required.';
    if (title.runes.length < 3) {
      return 'Title must contain at least 3 characters.';
    }
    if (title.runes.length > 120) {
      return 'Title cannot exceed 120 characters.';
    }
    return null;
  }

  String? _validatePrice(String? value) {
    final price = value?.trim() ?? '';
    if (price.isEmpty) return 'Price is required.';
    if (!RegExp(r'^-?(?:\d+(?:\.\d{0,2})?|\.\d{1,2})$').hasMatch(price)) {
      return 'Enter a valid amount with up to 2 decimal places.';
    }
    final amount = double.tryParse(price);
    if (amount == null || !amount.isFinite) {
      return 'Enter a valid price.';
    }
    if (amount < 0) return 'Price cannot be negative.';
    if (amount >= 10000000000) {
      return 'Price must be less than 10,000,000,000 TND.';
    }
    return null;
  }

  String? _validateCity(String? value) {
    if (value?.trim().isNotEmpty != true) return 'City is required.';
    return null;
  }

  String? _validateSurface(String? value) {
    final surface = value?.trim() ?? '';
    if (surface.isEmpty) return null;
    if (!RegExp(r'^-?\d+$').hasMatch(surface) ||
        int.tryParse(surface) == null) {
      return 'Enter a whole number of square metres.';
    }
    if (int.parse(surface) < 0) {
      return 'Surface cannot be negative.';
    }
    if (int.parse(surface) == 0) {
      return 'Surface must be greater than 0.';
    }
    return null;
  }

  String? _validateRooms(String? value) {
    final rooms = value?.trim() ?? '';
    if (rooms.isEmpty) return null;
    if (!RegExp(r'^-?\d+$').hasMatch(rooms) || int.tryParse(rooms) == null) {
      return 'Enter a non-negative whole number.';
    }
    if (int.parse(rooms) < 0) return 'Rooms cannot be negative.';
    return null;
  }

  void _showMessage(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context)
        .showSnackBar(SnackBar(content: Text(message)));
  }

  Future<void> _publishProperty() async {
    if (_submitting) return;

    FocusScope.of(context).unfocus();
    if (!_formKey.currentState!.validate()) return;

    final propertyType = _propertyType;
    final listingType = _listingType;
    if (propertyType == null || listingType == null) {
      _showMessage('Select a property type and listing type.');
      return;
    }

    final title = _titleController.text.trim();
    final description = _descriptionController.text.trim();
    final surfaceText = _surfaceController.text.trim();
    final roomsText = _roomsController.text.trim();
    final price = double.tryParse(_priceController.text.trim());
    final surfaceM2 = surfaceText.isEmpty ? null : int.tryParse(surfaceText);
    final rooms = roomsText.isEmpty ? null : int.tryParse(roomsText);
    if (price == null ||
        surfaceM2 == null && surfaceText.isNotEmpty ||
        rooms == null && roomsText.isNotEmpty) {
      _showMessage('Please correct the highlighted form fields.');
      return;
    }

    setState(() => _submitting = true);
    late final Property property;
    try {
      property = await _propertyService.createProperty(
        title: title,
        description: description.isEmpty ? null : description,
        listingType: listingType,
        propertyType: propertyType,
        price: price,
        surfaceM2: surfaceM2,
        rooms: rooms,
        city: _cityController.text.trim(),
      );
    } on PropertyCreationFailure catch (error) {
      if (mounted) {
        setState(() => _submitting = false);
        _showMessage(error.message);
      }
      return;
    } catch (error) {
      debugPrint('Failed to publish property: $error');
      if (mounted) {
        setState(() => _submitting = false);
        _showMessage(
          'Unable to publish property. Check your connection and try again.',
        );
      }
      return;
    }

    if (!mounted) return;
    setState(() => _submitting = false);
    _showMessage('Property published successfully.');

    await context.push<void>(AppRoutes.propertyDetailsLocation(property.id));

    if (!mounted) return;
    ref.read(homePropertyRefreshProvider.notifier).refresh();
    context.go(AppRoutes.home);
  }

  InputDecoration _decoration(String label, IconData icon) =>
      authInputDecoration(label: label, icon: icon);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.background,
        surfaceTintColor: Colors.transparent,
        foregroundColor: AppColors.onSurface,
        elevation: 0,
        scrolledUnderElevation: 0,
        leading: IconButton(
          tooltip: 'Back',
          onPressed: () {
            if (context.canPop()) {
              context.pop();
            } else {
              context.go(AppRoutes.home);
            }
          },
          icon: const Icon(Icons.arrow_back),
        ),
        title: Text(
          'Add Property',
          style: Theme.of(context).textTheme.titleLarge?.copyWith(
            color: AppColors.onSurface,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
      body: SafeArea(
        child: Form(
          key: _formKey,
          child: SingleChildScrollView(
            keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
            child: Center(
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 520),
                child: AuthCard(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      TextFormField(
                        controller: _titleController,
                        textCapitalization: TextCapitalization.sentences,
                        textInputAction: TextInputAction.next,
                        maxLength: 120,
                        maxLengthEnforcement: MaxLengthEnforcement.enforced,
                        validator: _validateTitle,
                        decoration: _decoration(
                          'Title',
                          Icons.title,
                        ).copyWith(hintText: 'Modern apartment in Tozeur'),
                      ),
                      const SizedBox(height: 16),
                      DropdownButtonFormField<PropertyType>(
                        initialValue: _propertyType,
                        validator: (value) => value == null
                            ? 'Please select a property type.'
                            : null,
                        decoration: _decoration(
                          'Property type',
                          Icons.apartment_outlined,
                        ),
                        items: const [
                          DropdownMenuItem(
                            value: PropertyType.apartment,
                            child: Text('Apartment'),
                          ),
                          DropdownMenuItem(
                            value: PropertyType.house,
                            child: Text('House'),
                          ),
                          DropdownMenuItem(
                            value: PropertyType.villa,
                            child: Text('Villa'),
                          ),
                          DropdownMenuItem(
                            value: PropertyType.land,
                            child: Text('Land'),
                          ),
                          DropdownMenuItem(
                            value: PropertyType.office,
                            child: Text('Office'),
                          ),
                          DropdownMenuItem(
                            value: PropertyType.shop,
                            child: Text('Shop'),
                          ),
                        ],
                        onChanged: _submitting
                            ? null
                            : (value) => setState(() => _propertyType = value),
                      ),
                      const SizedBox(height: 16),
                      FormField<ListingType>(
                        validator: (value) => value == null
                            ? 'Please select a listing type.'
                            : null,
                        builder: (field) => InputDecorator(
                          decoration: _decoration(
                            'Listing type',
                            Icons.sell_outlined,
                          ).copyWith(errorText: field.errorText),
                          child: SegmentedButton<ListingType>(
                            emptySelectionAllowed: true,
                            showSelectedIcon: false,
                            segments: const [
                              ButtonSegment(
                                value: ListingType.sale,
                                label: Text('Sale'),
                              ),
                              ButtonSegment(
                                value: ListingType.rent,
                                label: Text('Rent'),
                              ),
                            ],
                            selected: field.value == null
                                ? const <ListingType>{}
                                : {field.value!},
                            onSelectionChanged: _submitting
                                ? null
                                : (selection) {
                                    final value = selection.isEmpty
                                        ? null
                                        : selection.first;
                                    setState(() => _listingType = value);
                                    field.didChange(value);
                                  },
                          ),
                        ),
                        initialValue: _listingType,
                      ),
                      const SizedBox(height: 16),
                      TextFormField(
                        controller: _priceController,
                        keyboardType: const TextInputType.numberWithOptions(
                          decimal: true,
                        ),
                        textInputAction: TextInputAction.next,
                        validator: _validatePrice,
                        decoration: _decoration(
                          'Price (TND)',
                          Icons.payments_outlined,
                        ).copyWith(hintText: '0.00'),
                      ),
                      const SizedBox(height: 16),
                      TextFormField(
                        controller: _cityController,
                        textCapitalization: TextCapitalization.words,
                        textInputAction: TextInputAction.next,
                        validator: _validateCity,
                        decoration: _decoration(
                          'City',
                          Icons.location_city_outlined,
                        ).copyWith(hintText: 'Tozeur'),
                      ),
                      const SizedBox(height: 16),
                      TextFormField(
                        controller: _descriptionController,
                        textCapitalization: TextCapitalization.sentences,
                        keyboardType: TextInputType.multiline,
                        minLines: 3,
                        maxLines: 5,
                        decoration: _decoration(
                          'Description (optional)',
                          Icons.notes_outlined,
                        ).copyWith(hintText: 'Describe your property'),
                      ),
                      const SizedBox(height: 16),
                      TextFormField(
                        controller: _surfaceController,
                        keyboardType: TextInputType.number,
                        textInputAction: TextInputAction.next,
                        validator: _validateSurface,
                        decoration: _decoration(
                          'Surface (m², optional)',
                          Icons.square_foot,
                        ),
                      ),
                      const SizedBox(height: 16),
                      TextFormField(
                        controller: _roomsController,
                        keyboardType: TextInputType.number,
                        textInputAction: TextInputAction.done,
                        validator: _validateRooms,
                        decoration: _decoration(
                          'Rooms (optional)',
                          Icons.meeting_room_outlined,
                        ),
                      ),
                      const SizedBox(height: 24),
                      SizedBox(
                        height: 52,
                        child: FilledButton(
                          onPressed: _submitting ? null : _publishProperty,
                          style: FilledButton.styleFrom(
                            backgroundColor: AppColors.primary,
                            foregroundColor: AppColors.onPrimary,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                          ),
                          child: _submitting
                              ? const SizedBox(
                                  width: 22,
                                  height: 22,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                    color: AppColors.onPrimary,
                                  ),
                                )
                              : const Text('Publish Property'),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
