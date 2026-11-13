import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { getPropertyById } from '../../services/propertyService';
import type { PropertyWithRelations } from '../../types/property';
import { theme, spacing, radius, typography } from '../../theme';

const colors = theme.colors;
const screenWidth = Dimensions.get('window').width;

function formatPrice(price: number): string {
  const formattedPrice = new Intl.NumberFormat('fr-TN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
    useGrouping: true,
  })
    .format(price)
    .replace(/[\u00A0\u202F]/g, ' ');

  return `${formattedPrice} TND`;
}

function formatNullable(value: number | null, suffix = ''): string {
  return value === null ? '—' : `${value}${suffix}`;
}

function getPropertyTypeLabel(type: PropertyWithRelations['property_type']): string {
  const labels: Record<PropertyWithRelations['property_type'], string> = {
    apartment: 'Apartment',
    house: 'House',
    villa: 'Villa',
    land: 'Land',
    office: 'Office',
    shop: 'Shop',
  };

  return labels[type];
}

export default function PropertyDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [property, setProperty] = useState<PropertyWithRelations | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const loadProperty = useCallback(async () => {
    if (!id || Array.isArray(id)) {
      setLoadError('The property ID is invalid.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError(null);

    try {
      const result = await getPropertyById(id);
      setProperty(result);
      setActiveImageIndex(0);
    } catch (error) {
      console.error('Failed to load property details:', error);
      setLoadError(
        error instanceof Error && error.message === 'Property not found.'
          ? 'This property could not be found.'
          : 'Unable to load this property. Please check your connection and try again.',
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadProperty();
  }, [loadProperty]);

  if (loading) {
    return (
      <SafeAreaView style={styles.stateScreen}>
        <StatusBar style="dark" />
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.stateText}>Loading property details...</Text>
      </SafeAreaView>
    );
  }

  if (loadError || !property) {
    return (
      <SafeAreaView style={styles.stateScreen}>
        <StatusBar style="dark" />
        <Ionicons name="alert-circle-outline" size={42} color={colors.error} />
        <Text style={styles.errorText}>
          {loadError ?? 'This property could not be found.'}
        </Text>
        <Pressable style={styles.primaryButton} onPress={() => void loadProperty()}>
          <Text style={styles.primaryButtonText}>Try again</Text>
        </Pressable>
        <Pressable style={styles.backTextButton} onPress={() => router.back()}>
          <Text style={styles.backText}>Go back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const owner = property.profiles;
  const images = [...property.property_images].sort(
    (first, second) => first.position - second.position,
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="dark" />

      <View style={styles.topBar}>
        <Pressable
          onPress={() => router.back()}
          style={styles.iconButton}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={22} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.topBarTitle}>Property details</Text>
        <View style={styles.topBarSpacer} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {images.length > 0 ? (
          <View style={styles.imageGalleryContainer}>
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              style={styles.imageGallery}
              onMomentumScrollEnd={(event) => {
                const nextIndex = Math.round(
                  event.nativeEvent.contentOffset.x / screenWidth,
                );
                setActiveImageIndex(
                  Math.max(0, Math.min(nextIndex, images.length - 1)),
                );
              }}
            >
              {images.map((image) => (
                <Image
                  key={image.id}
                  source={{ uri: image.image_url }}
                  style={styles.propertyImage}
                  contentFit="cover"
                  alt={`${property.title} photo ${image.position + 1}`}
                />
              ))}
            </ScrollView>

            {images.length > 1 ? (
              <View style={styles.pagination} accessibilityLabel="Image pagination">
                {images.map((image, index) => (
                  <View
                    key={image.id}
                    style={[
                      styles.paginationDot,
                      index === activeImageIndex && styles.paginationDotActive,
                    ]}
                  />
                ))}
              </View>
            ) : null}
          </View>
        ) : (
          <View style={styles.imagePlaceholder}>
            <Ionicons name="home-outline" size={56} color={colors.placeholder} />
            <Text style={styles.placeholderText}>No images available</Text>
          </View>
        )}

        <View style={styles.detailsContent}>
          <View style={styles.priceRow}>
            <Text style={styles.price}>{formatPrice(property.price)}</Text>
            {property.listing_type === 'rent' ? (
              <Text style={styles.period}>/ month</Text>
            ) : null}
          </View>

          <Text style={styles.title}>{property.title}</Text>

          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={18} color={colors.secondary} />
            <Text style={styles.location}>
              {property.address ? `${property.address}, ${property.city}` : property.city}
            </Text>
          </View>

          <View style={styles.tagsRow}>
            <View style={styles.tag}>
              <Text style={styles.tagText}>{getPropertyTypeLabel(property.property_type)}</Text>
            </View>
            <View style={styles.tag}>
              <Text style={styles.tagText}>
                {property.listing_type === 'sale' ? 'For sale' : 'For rent'}
              </Text>
            </View>
            <View style={styles.tag}>
              <Text style={styles.tagText}>{property.status}</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Property overview</Text>
            <View style={styles.specifications}>
              <Specification icon="resize-outline" label="Surface" value={formatNullable(property.surface_m2, ' m²')} />
              <Specification icon="bed-outline" label="Rooms" value={formatNullable(property.rooms)} />
              <Specification icon="water-outline" label="Bathrooms" value={formatNullable(property.bathrooms)} />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.description}>
              {property.description?.trim() || 'No description provided.'}
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Owner</Text>
            <View style={styles.ownerCard}>
              {owner?.avatar_url ? (
                <Image
                  source={{ uri: owner.avatar_url }}
                  style={styles.ownerAvatar}
                  contentFit="cover"
                  alt="Property owner avatar"
                />
              ) : (
                <View style={styles.ownerAvatarPlaceholder}>
                  <Ionicons name="person" size={22} color={colors.secondary} />
                </View>
              )}
              <View style={styles.ownerInfo}>
                <Text style={styles.ownerName}>{owner?.full_name || 'Property owner'}</Text>
                {owner?.phone ? <Text style={styles.ownerPhone}>{owner.phone}</Text> : null}
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Specification({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.specification}>
      <Ionicons name={icon} size={22} color={colors.primary} />
      <Text style={styles.specificationValue}>{value}</Text>
      <Text style={styles.specificationLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  stateScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
    backgroundColor: colors.background,
  },
  stateText: {
    ...typography.body,
    color: colors.secondary,
  },
  errorText: {
    ...typography.body,
    color: colors.error,
    textAlign: 'center',
  },
  primaryButton: {
    minHeight: 44,
    paddingHorizontal: spacing.xl,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.md,
  },
  primaryButtonText: {
    ...theme.fonts.labelLarge,
    color: colors.onPrimary,
  },
  backTextButton: {
    padding: spacing.sm,
  },
  backText: {
    ...theme.fonts.labelLarge,
    color: colors.primary,
  },
  topBar: {
    minHeight: 56,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceVariant,
  },
  topBarTitle: {
    ...theme.fonts.titleMedium,
    color: colors.onBackground,
  },
  topBarSpacer: {
    width: 40,
  },
  scrollContent: {
    paddingBottom: spacing.xxl,
  },
  imageGalleryContainer: {
    width: '100%',
    backgroundColor: colors.outlineVariant,
  },
  imageGallery: {
    width: '100%',
    height: 280,
  },
  pagination: {
    minHeight: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.background,
  },
  paginationDot: {
    width: 7,
    height: 7,
    borderRadius: radius.full,
    backgroundColor: colors.outline,
  },
  paginationDotActive: {
    width: 18,
    backgroundColor: colors.primary,
  },
  propertyImage: {
    width: screenWidth,
    height: 280,
  },
  imagePlaceholder: {
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.outlineVariant,
  },
  placeholderText: {
    ...typography.body,
    color: colors.secondary,
  },
  detailsContent: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs,
  },
  price: {
    ...theme.fonts.headlineSmall,
    color: colors.primary,
  },
  period: {
    ...typography.body,
    color: colors.secondary,
  },
  title: {
    ...theme.fonts.headlineSmall,
    color: colors.onBackground,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  location: {
    ...typography.body,
    color: colors.secondary,
    flex: 1,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  tag: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceVariant,
  },
  tagText: {
    ...theme.fonts.labelMedium,
    color: colors.secondary,
    textTransform: 'capitalize',
  },
  section: {
    gap: spacing.md,
  },
  sectionTitle: {
    ...theme.fonts.titleLarge,
    color: colors.onBackground,
  },
  specifications: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  specification: {
    flex: 1,
    minHeight: 104,
    padding: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  specificationValue: {
    ...theme.fonts.titleMedium,
    color: colors.onSurface,
  },
  specificationLabel: {
    ...typography.caption,
    color: colors.secondary,
  },
  description: {
    ...typography.body,
    color: colors.onBackground,
    lineHeight: 24,
  },
  ownerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  ownerAvatar: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
  },
  ownerAvatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceVariant,
  },
  ownerInfo: {
    flex: 1,
    gap: 2,
  },
  ownerName: {
    ...theme.fonts.titleMedium,
    color: colors.onSurface,
  },
  ownerPhone: {
    ...typography.body,
    color: colors.secondary,
  },
});