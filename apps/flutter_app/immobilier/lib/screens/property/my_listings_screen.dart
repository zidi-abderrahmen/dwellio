import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../core/router.dart';
import '../../core/theme.dart';
import '../../models/property_models.dart';
import '../../services/property_service.dart';

class MyListingsScreen extends StatefulWidget {
  const MyListingsScreen({
    super.key,
    this.loadProperties,
    this.deleteProperty,
    this.currentUserId,
  });

  final Future<List<PropertyWithRelations>> Function()? loadProperties;
  final Future<void> Function(String propertyId)? deleteProperty;
  final String? currentUserId;

  @override
  State<MyListingsScreen> createState() => _MyListingsScreenState();
}

class _MyListingsScreenState extends State<MyListingsScreen> {
  late final PropertyService _propertyService = PropertyService();
  late final Future<List<PropertyWithRelations>> Function() _loadMyProperties;
  late final Future<void> Function(String propertyId) _deleteProperty;
  late final String? _currentUserId;

  List<PropertyWithRelations> _properties = [];
  bool _loading = true;
  String? _loadError;
  String? _deletingPropertyId;

  @override
  void initState() {
    super.initState();
    _loadMyProperties =
        widget.loadProperties ?? () => _propertyService.getMyProperties();
    _deleteProperty =
        widget.deleteProperty ??
        (propertyId) => _propertyService.deleteProperty(propertyId);
    _currentUserId =
        widget.currentUserId ?? Supabase.instance.client.auth.currentUser?.id;
    _loadProperties();
  }

  Future<void> _loadProperties() async {
    setState(() {
      _loading = true;
      _loadError = null;
    });

    try {
      final properties = await _loadMyProperties();
      if (!mounted) return;
      setState(() {
        _properties = properties;
      });
    } on PropertyQueryFailure catch (error) {
      if (!mounted) return;
      setState(() {
        _loadError = error.message;
      });
    } catch (error) {
      debugPrint('Failed to load user properties: $error');
      if (!mounted) return;
      setState(() {
        _loadError = 'Unable to load your properties. Please check your connection and try again.';
      });
    } finally {
      if (mounted) {
        setState(() => _loading = false);
      }
    }
  }

  Future<void> _confirmDelete(PropertyWithRelations property) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete property?'),
        content: Text(
          'Do you really want to permanently delete "${property.title}"?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('Delete'),
          ),
        ],
      ),
    );

    if (confirmed != true || !mounted) return;

    setState(() => _deletingPropertyId = property.id);
    try {
      await _deleteProperty(property.id);
      if (!mounted) return;
      _showMessage('Property deleted successfully.');
      await _loadProperties();
    } on PropertyDeletionFailure catch (error) {
      if (mounted) {
        _showMessage(error.message);
        if (error.propertyDeleted) {
          await _loadProperties();
        }
      }
    } catch (error) {
      debugPrint('Failed to delete property ${property.id}: $error');
      if (mounted) {
        _showMessage('Unable to delete this property. Please try again.');
      }
    } finally {
      if (mounted) {
        setState(() => _deletingPropertyId = null);
      }
    }
  }

  Future<void> _editProperty(PropertyWithRelations property) async {
    final updated = await context.push<bool>(
      AppRoutes.editPropertyLocation(property.id),
    );
    if (updated == true && mounted) {
      await _loadProperties();
    }
  }

  void _showMessage(String message) {
    ScaffoldMessenger.of(context)
        .showSnackBar(SnackBar(content: Text(message)));
  }

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
        title: const Text(
          'My listings',
          style: TextStyle(
            fontFamily: AppFontConfig.fontFamily,
            fontSize: 22,
            fontWeight: FontWeight.w500,
            height: 28 / 22,
            color: AppColors.onBackground,
          ),
        ),
      ),
      body: SafeArea(child: _buildBody()),
    );
  }

  Widget _buildBody() {
    if (_loading) {
      return const Center(
        child: CircularProgressIndicator(color: AppColors.primary),
      );
    }

    if (_loadError != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.error_outline, size: 40, color: AppColors.error),
              const SizedBox(height: 12),
              Text(_loadError!, textAlign: TextAlign.center),
              const SizedBox(height: 16),
              FilledButton(
                onPressed: _loadProperties,
                child: const Text('Try again'),
              ),
            ],
          ),
        ),
      );
    }

    if (_properties.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(
                Icons.home_work_outlined,
                size: 48,
                color: AppColors.placeholder,
              ),
              const SizedBox(height: 16),
              const Text(
                'You have not published any properties yet.',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontFamily: AppFontConfig.fontFamily,
                  fontSize: 16,
                  color: AppColors.onBackground,
                ),
              ),
              const SizedBox(height: 16),
              FilledButton.icon(
                onPressed: () => context.push(AppRoutes.add),
                icon: const Icon(Icons.add),
                label: const Text('Publish a property'),
              ),
            ],
          ),
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _loadProperties,
      color: AppColors.primary,
      child: ListView.separated(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
        itemCount: _properties.length,
        separatorBuilder: (context, index) => const SizedBox(height: 12),
        itemBuilder: (context, index) {
          final property = _properties[index];
          return _MyListingCard(
            property: property,
            canManage: property.ownerId == _currentUserId,
            deleting: _deletingPropertyId == property.id,
            onEdit: () => _editProperty(property),
            onDelete: () => _confirmDelete(property),
            onTap: () =>
                context.push(AppRoutes.propertyDetailsLocation(property.id)),
          );
        },
      ),
    );
  }
}

class _MyListingCard extends StatelessWidget {
  const _MyListingCard({
    required this.property,
    required this.canManage,
    required this.deleting,
    required this.onEdit,
    required this.onDelete,
    required this.onTap,
  });

  final PropertyWithRelations property;
  final bool canManage;
  final bool deleting;
  final VoidCallback onEdit;
  final VoidCallback onDelete;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final imageUrl = property.propertyImages.isEmpty
        ? null
        : property.propertyImages.first.imageUrl;

    return Card(
      margin: EdgeInsets.zero,
      clipBehavior: Clip.antiAlias,
      color: AppColors.surface,
      child: InkWell(
        onTap: onTap,
        child: Row(
          children: [
            SizedBox(
              width: 112,
              height: 132,
              child: imageUrl == null
                  ? _imagePlaceholder()
                  : Image.network(
                      imageUrl,
                      fit: BoxFit.cover,
                      errorBuilder: (context, error, stackTrace) =>
                          _imagePlaceholder(),
                    ),
            ),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Wrap(
                      spacing: 6,
                      runSpacing: 4,
                      children: [
                        _StatusChip(status: property.status),
                        _ListingTypeChip(listingType: property.listingType),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(
                      property.title,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontFamily: AppFontConfig.fontFamily,
                        fontSize: 16,
                        fontWeight: FontWeight.w500,
                        color: AppColors.onBackground,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '${_formatPrice(property.price)}'
                      '${property.listingType == 'rent' ? ' / month' : ''}',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontFamily: AppFontConfig.fontFamily,
                        fontSize: 16,
                        fontWeight: FontWeight.w500,
                        color: AppColors.primary,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '${property.city} · ${_propertyTypeLabel(property.propertyType)}',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontFamily: AppFontConfig.fontFamily,
                        fontSize: 14,
                        color: AppColors.secondary,
                      ),
                    ),
                  ],
                ),
              ),
            ),
            if (canManage)
              Padding(
                padding: const EdgeInsets.only(right: 4),
                child: deleting
                    ? const SizedBox(
                        width: 48,
                        height: 48,
                        child: Padding(
                          padding: EdgeInsets.all(14),
                          child: CircularProgressIndicator(strokeWidth: 2),
                        ),
                      )
                    : PopupMenuButton<_ListingAction>(
                        tooltip: 'Listing actions',
                        onSelected: (action) {
                          switch (action) {
                            case _ListingAction.edit:
                              onEdit();
                              break;
                            case _ListingAction.delete:
                              onDelete();
                              break;
                          }
                        },
                        itemBuilder: (context) => const [
                          PopupMenuItem(
                            value: _ListingAction.edit,
                            child: Text('Edit'),
                          ),
                          PopupMenuItem(
                            value: _ListingAction.delete,
                            child: Text('Delete'),
                          ),
                        ],
                        icon: const Icon(
                          Icons.more_vert,
                          color: AppColors.secondary,
                        ),
                      ),
              )
            else
              const Padding(
                padding: EdgeInsets.only(right: 12),
                child: Icon(Icons.chevron_right, color: AppColors.secondary),
              ),
          ],
        ),
      ),
    );
  }

  Widget _imagePlaceholder() {
    return ColoredBox(
      color: AppColors.outlineVariant,
      child: const Center(
        child: Icon(Icons.home_filled, size: 36, color: AppColors.placeholder),
      ),
    );
  }

  String _propertyTypeLabel(String propertyType) => switch (propertyType) {
    'apartment' => 'Apartment',
    'house' => 'House',
    'villa' => 'Villa',
    'land' => 'Land',
    'office' => 'Office',
    'shop' => 'Shop',
    _ => propertyType,
  };

  String _formatPrice(double price) {
    final parts = price.toStringAsFixed(2).split('.');
    final integerPart = parts.first.replaceAllMapped(
      RegExp(r'\B(?=(\d{3})+(?!\d))'),
      (_) => '\u202F',
    );
    final decimalPart = parts.last.replaceFirst(RegExp(r'0+$'), '');

    return '$integerPart${decimalPart.isEmpty ? '' : ',$decimalPart'} DT';
  }
}

enum _ListingAction { edit, delete }

class _StatusChip extends StatelessWidget {
  const _StatusChip({required this.status});

  final String status;

  @override
  Widget build(BuildContext context) {
    final (label, color) = switch (status) {
      'active' => ('Active', AppColors.success),
      'sold' => ('Sold', AppColors.secondary),
      'rented' => ('Rented', AppColors.secondary),
      'hidden' => ('Hidden', AppColors.placeholder),
      _ => (status, AppColors.secondary),
    };

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontFamily: AppFontConfig.fontFamily,
          fontSize: 12,
          fontWeight: FontWeight.w500,
          color: color,
        ),
      ),
    );
  }
}

class _ListingTypeChip extends StatelessWidget {
  const _ListingTypeChip({required this.listingType});

  final String listingType;

  @override
  Widget build(BuildContext context) {
    final label = switch (listingType) {
      'sale' => 'For sale',
      'rent' => 'For rent',
      _ => listingType,
    };

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: AppColors.surfaceVariant,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: const TextStyle(
          fontFamily: AppFontConfig.fontFamily,
          fontSize: 12,
          fontWeight: FontWeight.w500,
          color: AppColors.secondary,
        ),
      ),
    );
  }
}