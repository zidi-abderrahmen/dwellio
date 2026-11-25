import React, { useEffect, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image, type ImageSource } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

import type {
  PropertyCardData as SharedPropertyCardData,
  PropertyType as SharedPropertyType,
} from '../types/property';
export type {
  ListingType,
  PropertyStatus,
  PropertyType,
  PropertyRow,
  PropertyCardData,
} from '../types/property';
import { theme } from '../theme';

// --------------------------------------------------
// Types
// --------------------------------------------------

export type PropertyCardVariant = 'standard' | 'featured' | 'newListing';

export interface PropertyCardProps {
  // The card accepts the actual database-shaped property fields.
  property: SharedPropertyCardData;
  image?: ImageSource | null;
  variant?: PropertyCardVariant;
  favorite?: boolean;
  currencyLabel?: string;
  period?: string | null;
  onFavoritePress?: () => void;
  onPress?: () => void;
}

// --------------------------------------------------
// Property type labels
// --------------------------------------------------

const propertyTypeLabels: Record<SharedPropertyType, string> = {
  apartment: 'Apartment',
  house: 'House',
  villa: 'Villa',
  land: 'Land',
  office: 'Office',
  shop: 'Shop',
};

// --------------------------------------------------
// Formatting helpers
// --------------------------------------------------

function formatFrenchNumber(
  value: number,
  maximumFractionDigits = 2,
): string {
  const isNegative = value < 0;
  const fixedValue = Math.abs(value).toFixed(maximumFractionDigits);
  const parts = fixedValue.split('.');
  const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '\u202F');

  let fractionPart = parts.length > 1 ? parts[1] : '';
  fractionPart = fractionPart.replace(/0+$/, '');

  const decimalPart = fractionPart.length === 0 ? '' : `,${fractionPart}`;
  const sign = isNegative ? '-' : '';

  return `${sign}${integerPart}${decimalPart}`;
}

function formatPrice(price: number, currency: string): string {
  return `${formatFrenchNumber(price)} ${currency}`;
}

function formatSurface(surface: number | null): string {
  if (surface === null) {
    return '— m²';
  }

  return `${formatFrenchNumber(surface, 0)} m²`;
}

function formatRooms(rooms: number | null): string {
  if (rooms === null) {
    return '— rooms';
  }

  return `${rooms} ${rooms === 1 ? 'room' : 'rooms'}`;
}

// --------------------------------------------------
// Property Card
// --------------------------------------------------

export function PropertyCard({
  property,
  image = null,
  variant = 'standard',
  favorite = false,
  currencyLabel = 'DT',
  period,
  onFavoritePress,
  onPress,
}: PropertyCardProps) {
  const [imageFailed, setImageFailed] = useState(false);

  // Reset the image fallback when the URL changes.
  useEffect(() => {
    setImageFailed(false);
  }, [image]);

  const priceText = formatPrice(property.price, currencyLabel);
  const periodText = period ?? (property.listing_type === 'rent' ? '/ month' : '');
  const propertyTypeLabel = propertyTypeLabels[property.property_type];

  const badgeLabel =
    variant === 'featured'
      ? 'Featured'
      : variant === 'newListing'
        ? 'New'
        : null;

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={onPress ? `View ${property.title}` : undefined}
      style={styles.card}
    >
      {/* Media */}
      <View style={styles.media}>
        {image !== null && !imageFailed ? (
          <Image
            source={image}
            style={styles.propertyImage}
            contentFit="cover"
            onError={() => setImageFailed(true)}
            accessible={false}
          />
        ) : (
          <ImagePlaceholder />
        )}

        {badgeLabel !== null && (
          <View style={styles.listingBadge}>
            <Text style={styles.listingBadgeText}>{badgeLabel}</Text>
          </View>
        )}

        {/* Favorite Button */}
        <Pressable
          onPress={(event) => {
            event.stopPropagation();
            onFavoritePress?.();
          }}
          disabled={!onFavoritePress}
          accessibilityRole="button"
          accessibilityState={{
            selected: favorite,
            disabled: !onFavoritePress,
          }}
          accessibilityLabel={
            favorite ? 'Remove from favorites' : 'Add to favorites'
          }
          style={styles.favoriteButtonTouchArea}
        >
          <View style={styles.favoriteButton}>
            <Ionicons
              name={favorite ? 'heart' : 'heart-outline'}
              size={24}
              color={favorite ? theme.colors.favorite : theme.colors.secondary}
            />
          </View>
        </Pressable>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.priceRow}>
          <Text numberOfLines={1} style={styles.priceText}>
            {priceText}
          </Text>

          {periodText.length > 0 && (
            <Text style={styles.periodText}>{periodText}</Text>
          )}
        </View>

        <Text numberOfLines={1} style={styles.titleText}>
          {property.title}
        </Text>

        <View style={styles.locationRow}>
          <Ionicons
            name="location-outline"
            size={16}
            color={theme.colors.secondary}
          />
          <Text numberOfLines={1} style={styles.locationText}>
            {property.city}
          </Text>
        </View>

        <View style={styles.specsRow}>
          <View style={styles.specsGroup}>
            <View style={styles.specItemContainer}>
              <SpecItem
                icon="resize-outline"
                text={formatSurface(property.surface_m2)}
              />
            </View>

            <View style={styles.specItemContainer}>
              <SpecItem
                icon="bed-outline"
                text={formatRooms(property.rooms)}
              />
            </View>
          </View>

          <View style={styles.propertyTypeChip}>
            <Text numberOfLines={1} style={styles.propertyTypeText}>
              {propertyTypeLabel}
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

// --------------------------------------------------
// Image placeholder
// --------------------------------------------------

function ImagePlaceholder() {
  return (
    <View style={styles.imagePlaceholder}>
      <Ionicons name="home" size={48} color={theme.colors.placeholder} />
    </View>
  );
}

// --------------------------------------------------
// Property specification item
// --------------------------------------------------

interface SpecItemProps {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  text: string;
}

function SpecItem({ icon, text }: SpecItemProps) {
  return (
    <View style={styles.specItem}>
      <Ionicons name={icon} size={16} color={theme.colors.secondary} />
      <Text numberOfLines={1} style={styles.specText}>
        {text}
      </Text>
    </View>
  );
}

// --------------------------------------------------
// Styles
// --------------------------------------------------

const styles = StyleSheet.create({
  card: {
    width: 328,
    height: 334,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.outline,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  media: {
    width: '100%',
    height: 184,
    position: 'relative',
    backgroundColor: theme.colors.outlineVariant,
  },
  propertyImage: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.outlineVariant,
  },
  listingBadge: {
    position: 'absolute',
    left: 12,
    top: 12,
    minHeight: 24,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.featured,
    borderRadius: 999,
  },
  listingBadgeText: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
    letterSpacing: 0.5,
    color: theme.colors.onFeatured,
  },
  favoriteButtonTouchArea: {
    position: 'absolute',
    top: 4,
    right: 2,
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  favoriteButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
  },
  content: {
    flex: 1,
    paddingTop: 12,
    paddingRight: 16,
    paddingBottom: 16,
    paddingLeft: 16,
    justifyContent: 'space-between',
  },
  priceRow: {
    height: 28,
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  priceText: {
    flexShrink: 1,
    minWidth: 0,
    fontSize: 22,
    fontWeight: '500',
    lineHeight: 28,
    color: theme.colors.primary,
  },
  periodText: {
    marginLeft: 4,
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 16,
    letterSpacing: 0.4,
    color: theme.colors.secondary,
  },
  titleText: {
    height: 24,
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 24,
    letterSpacing: 0.15,
    color: theme.colors.onBackground,
  },
  locationRow: {
    height: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    flex: 1,
    minWidth: 0,
    marginLeft: 4,
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
    letterSpacing: 0.25,
    color: theme.colors.secondary,
  },
  specsRow: {
    height: 24,
    flexDirection: 'row',
    alignItems: 'center',
  },
  specsGroup: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
  },
  specItemContainer: {
    flex: 1,
    minWidth: 0,
    marginRight: 12,
  },
  specItem: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
  },
  specText: {
    flexShrink: 1,
    minWidth: 0,
    marginLeft: 4,
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
    letterSpacing: 0.25,
    color: theme.colors.secondary,
  },
  propertyTypeChip: {
    maxWidth: 100,
    height: 24,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: 999,
  },
  propertyTypeText: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
    letterSpacing: 0.5,
    color: theme.colors.secondary,
  },
});

export default PropertyCard;
