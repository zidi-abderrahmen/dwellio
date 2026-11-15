import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:uuid/uuid.dart';

import '../../core/router.dart';
import '../../core/theme.dart';
import '../../models/property.dart';
import '../../providers/property_providers.dart';
import '../../services/property_service.dart';
import '../../widgets/auth_form_widgets.dart';

class _SelectedPropertyImage {
  const _SelectedPropertyImage({
    required this.id,
    required this.file,
    required this.bytes,
  });

  final String id;
  final XFile file;
  final Uint8List bytes;
}

typedef PropertyEditUpdater = Future<Property> Function({
  required String id,
  required String title,
  String? description,
  required ListingType listingType,
  required PropertyType propertyType,
  required double price,
  int? surfaceM2,
  int? rooms,
  required String city,
});

class AddPropertyScreen extends ConsumerStatefulWidget {
  const AddPropertyScreen({
    super.key,
    this.propertyId,
    this.loadPropertyForEditing,
    this.updateProperty,
  });

  final String? propertyId;
  final Future<PropertyWithRelations> Function(String propertyId)?
  loadPropertyForEditing;
  final PropertyEditUpdater? updateProperty;

  bool get isEditing => propertyId != null;

  @override
  ConsumerState<AddPropertyScreen> createState() => _AddPropertyScreenState();
}

class _AddPropertyScreenState extends ConsumerState<AddPropertyScreen> {
  static const _maxPropertyImages = 5;

  GlobalKey<FormState> _formKey = GlobalKey<FormState>();
  final _titleController = TextEditingController();
  final _priceController = TextEditingController();
  final _cityController = TextEditingController();
  final _descriptionController = TextEditingController();
  final _surfaceController = TextEditingController();
  final _roomsController = TextEditingController();
  late final _propertyService = PropertyService();
  final _imagePicker = ImagePicker();
  final _uuid = const Uuid();
  final List<_SelectedPropertyImage> _selectedImages = [];

  PropertyType? _propertyType;
  ListingType? _listingType;
  Property? _createdProperty;
  bool _loadingProperty = false;
  String? _loadError;
  bool _pickingImages = false;
  bool _submitting = false;

  @override
  void initState() {
    super.initState();
    if (widget.isEditing) {
      _loadingProperty = true;
      _loadExistingProperty();
    }
  }

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

  Future<void> _loadExistingProperty() async {
    final propertyId = widget.propertyId;
    if (propertyId == null) return;

    if (!_loadingProperty) {
      setState(() {
        _loadingProperty = true;
        _loadError = null;
      });
    }

    try {
      final loader = widget.loadPropertyForEditing;
      final property = loader == null
          ? await _propertyService.getMyPropertyById(propertyId)
          : await loader(propertyId);
      if (!mounted) return;

      _titleController.text = property.title;
      _priceController.text = property.price
          .toStringAsFixed(2)
          .replaceFirst(RegExp(r'\.00$'), '');
      _cityController.text = property.city;
      _descriptionController.text = property.description ?? '';
      _surfaceController.text = property.surfaceM2?.toInt().toString() ?? '';
      _roomsController.text = property.rooms?.toString() ?? '';
      setState(() {
        _propertyType = PropertyType.values.byName(property.propertyType);
        _listingType = ListingType.values.byName(property.listingType);
        _loadError = null;
      });
    } on PropertyQueryFailure catch (error) {
      if (mounted) setState(() => _loadError = error.message);
    } catch (error) {
      debugPrint('Failed to load property for editing: $error');
      if (mounted) {
        setState(() {
          _loadError = 'Unable to load this property. Check your connection and try again.';
        });
      }
    } finally {
      if (mounted) {
        setState(() => _loadingProperty = false);
      }
    }
  }

  void _resetForm() {
    _titleController.clear();
    _priceController.clear();
    _cityController.clear();
    _descriptionController.clear();
    _surfaceController.clear();
    _roomsController.clear();

    setState(() {
      _formKey = GlobalKey<FormState>();
      _propertyType = null;
      _listingType = null;
      _createdProperty = null;
      _selectedImages.clear();
      _submitting = false;
    });
  }

  Future<void> _pickPropertyImages() async {
    if (_pickingImages) return;
    final remaining = _maxPropertyImages - _selectedImages.length;
    if (remaining <= 0) return;

    setState(() => _pickingImages = true);
    try {
      final files = await _imagePicker.pickMultiImage(
        maxWidth: 2000,
        maxHeight: 2000,
        imageQuality: 85,
      );
      if (files.isEmpty || !mounted) return;

      final selectedFiles = files.take(remaining).toList();
      final images = await Future.wait(
        selectedFiles.map(
          (file) async => _SelectedPropertyImage(
            id: _uuid.v4(),
            file: file,
            bytes: await file.readAsBytes(),
          ),
        ),
      );
      if (!mounted) return;

      setState(() => _selectedImages.addAll(images));
      if (files.length > remaining) {
        _showMessage('You can select up to 5 photos per property.');
      }
    } on PlatformException {
      _showMessage('Could not open your photo gallery.');
    } catch (error) {
      debugPrint('Failed to read selected property photos: $error');
      _showMessage('Could not load the selected photos.');
    } finally {
      if (mounted) {
        setState(() => _pickingImages = false);
      }
    }
  }

  Future<void> _publishProperty() async {
    if (_submitting) return;
    if (widget.isEditing) {
      await _updateProperty();
      return;
    }

    final existingProperty = _createdProperty;
    if (existingProperty == null) {
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
      try {
        _createdProperty = await _propertyService.createProperty(
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
    }

    final property = _createdProperty ?? existingProperty;
    if (property == null || !mounted) return;
    if (!_submitting) {
      setState(() => _submitting = true);
    }

    try {
      for (var index = 0; index < _selectedImages.length; index++) {
        final image = _selectedImages[index];
        await _propertyService.uploadPropertyImage(
          propertyId: property.id,
          imageId: image.id,
          bytes: image.bytes,
          fileName: image.file.name,
          contentType: image.file.mimeType,
          position: index,
        );
      }
    } catch (error) {
      debugPrint('Failed to upload property photos: $error');
      if (mounted) {
        setState(() => _submitting = false);
        _showMessage(
          'Property saved, but some photos could not be uploaded. '
          'Tap Retry photo upload to try again.',
        );
      }
      return;
    }

    if (!mounted) return;
    final uploadedPhotos = _selectedImages.isNotEmpty;
    _resetForm();
    _showMessage(
      uploadedPhotos
          ? 'Property and photos published successfully.'
          : 'Property published successfully.',
    );

    await context.push<void>(AppRoutes.propertyDetailsLocation(property.id));

    if (!mounted) return;
    ref.read(homePropertyRefreshProvider.notifier).refresh();
    context.go(AppRoutes.home);
  }

  Future<void> _updateProperty() async {
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
    try {
      final update = widget.updateProperty;
      if (update == null) {
        await _propertyService.updateProperty(
          id: widget.propertyId!,
          title: title,
          description: description.isEmpty ? null : description,
          listingType: listingType,
          propertyType: propertyType,
          price: price,
          surfaceM2: surfaceM2,
          rooms: rooms,
          city: _cityController.text.trim(),
        );
      } else {
        await update(
          id: widget.propertyId!,
          title: title,
          description: description.isEmpty ? null : description,
          listingType: listingType,
          propertyType: propertyType,
          price: price,
          surfaceM2: surfaceM2,
          rooms: rooms,
          city: _cityController.text.trim(),
        );
      }
      if (!mounted) return;
      ref.read(homePropertyRefreshProvider.notifier).refresh();
      _showMessage('Property updated successfully.');
      context.pop(true);
    } on PropertyUpdateFailure catch (error) {
      if (mounted) _showMessage(error.message);
    } catch (error) {
      debugPrint('Failed to update property ${widget.propertyId}: $error');
      if (mounted) {
        _showMessage(
          'Unable to update property. Check your connection and try again.',
        );
      }
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
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
          widget.isEditing ? 'Edit Property' : 'Add Property',
          style: Theme.of(context).textTheme.titleLarge?.copyWith(
            color: AppColors.onSurface,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
      body: SafeArea(
        child: _loadingProperty
            ? const Center(
                child: CircularProgressIndicator(color: AppColors.primary),
              )
            : _loadError != null
            ? Center(
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(_loadError!, textAlign: TextAlign.center),
                      const SizedBox(height: 16),
                      FilledButton(
                        onPressed: _loadExistingProperty,
                        child: const Text('Try again'),
                      ),
                    ],
                  ),
                ),
              )
            : Form(
                key: _formKey,
                child: SingleChildScrollView(
                  keyboardDismissBehavior:
                      ScrollViewKeyboardDismissBehavior.onDrag,
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
                              readOnly: _createdProperty != null,
                              textCapitalization: TextCapitalization.sentences,
                              textInputAction: TextInputAction.next,
                              maxLength: 120,
                              maxLengthEnforcement:
                                  MaxLengthEnforcement.enforced,
                              validator: _validateTitle,
                              decoration: _decoration('Title', Icons.title)
                                  .copyWith(
                                    hintText: 'Modern apartment in Tozeur',
                                  ),
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
                              onChanged: _submitting || _createdProperty != null
                                  ? null
                                  : (value) =>
                                        setState(() => _propertyType = value),
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
                                  onSelectionChanged:
                                      _submitting || _createdProperty != null
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
                              readOnly: _createdProperty != null,
                              keyboardType:
                                  const TextInputType.numberWithOptions(
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
                              readOnly: _createdProperty != null,
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
                              readOnly: _createdProperty != null,
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
                              readOnly: _createdProperty != null,
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
                              readOnly: _createdProperty != null,
                              keyboardType: TextInputType.number,
                              textInputAction: TextInputAction.done,
                              validator: _validateRooms,
                              decoration: _decoration(
                                'Rooms (optional)',
                                Icons.meeting_room_outlined,
                              ),
                            ),
                            if (!widget.isEditing) ...[
                              const SizedBox(height: 24),
                              Align(
                                alignment: Alignment.centerLeft,
                                child: Text(
                                  'Photos (optional, up to 5)',
                                  style: Theme.of(context).textTheme.titleSmall,
                                ),
                              ),
                              const SizedBox(height: 8),
                              OutlinedButton.icon(
                                onPressed:
                                    _submitting ||
                                        _pickingImages ||
                                        _createdProperty != null ||
                                        _selectedImages.length >=
                                            _maxPropertyImages
                                    ? null
                                    : _pickPropertyImages,
                                icon: const Icon(
                                  Icons.add_photo_alternate_outlined,
                                ),
                                label: Text(
                                  'Select photos (${_selectedImages.length}/$_maxPropertyImages)',
                                ),
                              ),
                              if (_selectedImages.isNotEmpty) ...[
                                const SizedBox(height: 12),
                                SizedBox(
                                  height: 88,
                                  child: ListView.separated(
                                    scrollDirection: Axis.horizontal,
                                    itemCount: _selectedImages.length,
                                    separatorBuilder: (context, index) =>
                                        const SizedBox(width: 8),
                                    itemBuilder: (context, index) => Stack(
                                      children: [
                                        ClipRRect(
                                          borderRadius: BorderRadius.circular(
                                            8,
                                          ),
                                          child: Image.memory(
                                            _selectedImages[index].bytes,
                                            width: 88,
                                            height: 88,
                                            fit: BoxFit.cover,
                                          ),
                                        ),
                                        if (_createdProperty == null)
                                          Positioned(
                                            top: 2,
                                            right: 2,
                                            child: InkWell(
                                              onTap: _submitting
                                                  ? null
                                                  : () => setState(
                                                      () => _selectedImages
                                                          .removeAt(index),
                                                    ),
                                              child: const CircleAvatar(
                                                radius: 12,
                                                backgroundColor: Colors.black54,
                                                child: Icon(
                                                  Icons.close,
                                                  size: 15,
                                                  color: Colors.white,
                                                ),
                                              ),
                                            ),
                                          ),
                                      ],
                                    ),
                                  ),
                                ),
                              ],
                              if (_createdProperty != null) ...[
                                const SizedBox(height: 12),
                                const Text(
                                  'Property details and photos are locked while '
                                  'photo uploads are retried.',
                                ),
                              ],
                            ],
                            const SizedBox(height: 24),
                            SizedBox(
                              height: 52,
                              child: FilledButton(
                                onPressed: _submitting
                                    ? null
                                    : _publishProperty,
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
                                    : Text(
                                        widget.isEditing
                                            ? 'Save changes'
                                            : _createdProperty == null
                                            ? 'Publish Property'
                                            : 'Retry photo upload',
                                      ),
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