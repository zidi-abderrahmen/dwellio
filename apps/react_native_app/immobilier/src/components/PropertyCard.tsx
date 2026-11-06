import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  ImageSourcePropType,
  Pressable,
  StyleSheet,
} from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { theme, cardTheme, spacing, radius, typography } from '../theme';

const colors = theme.colors;

// --------------------------------------------------
// Types — Based on the Supabase properties table
// --------------------------------------------------

export type ListingType = 'sale' | 'rent';

export type PropertyType =
  | 'apartment'
  | 'house'
  | 'villa'
  | 'land'
  | 'office'
  | 'shop';

export type PropertyStatus =
  | 'active'
  | 'sold'
  | 'rented'
  | 'hidden';

export type PropertyCardVariant =
  | 'standard'
  | 'featured'
  | 'new';

export interface PropertyRow {
  id: string;
  owner_id: string;
  title: string;
  description: string | null;
  listing_type: ListingType;
  property_type: PropertyType;
  price: number;
  surface_m2: number | null;
  rooms: number | null;
  bathrooms: number | null;
  city: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  status: PropertyStatus;
  created_at: string;
  updated_at: string;
}

export type PropertyCardData = Pick<
  PropertyRow,
  | 'id'
  | 'title'
  | 'listing_type'
  | 'property_type'
  | 'price'
  | 'surface_m2'
  | 'rooms'
  | 'city'
>;

interface PropertyCardProps {
  property: PropertyCardData;

  image?: ImageSourcePropType | null;

  variant?: PropertyCardVariant;

  favorite?: boolean;

  currencyLabel?: string;

  period?: string;

  onFavoritePress?: () => void;

  onPress?: () => void;
}

// --------------------------------------------------
// Property type labels
// --------------------------------------------------

const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
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

function formatPrice(price: number, currency: string): string {
  const formatted = new Intl.NumberFormat('fr-TN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(price);

  return `${formatted} ${currency}`;
}

function formatSurface(surface: number | null): string {
  if (surface === null) {
    return '— m²';
  }

  return `${new Intl.NumberFormat('fr-TN', {
    maximumFractionDigits: 0,
  }).format(surface)} m²`;
}

function formatRooms(rooms: number | null): string {
  if (rooms === null) {
    return '— rooms';
  }

  return `${rooms} ${rooms === 1 ? 'room' : 'rooms'}`;
}

// --------------------------------------------------
// SVG Icons
// --------------------------------------------------

type PropertyIconName =
  | 'placeholder'
  | 'heart'
  | 'heart-outline'
  | 'location'
  | 'area'
  | 'bed';

interface PropertyIconProps {
  name: PropertyIconName;
  size: number;
  color: string;
}

function PropertyIcon({
  name,
  size,
  color,
}: PropertyIconProps) {
  const strokeProps = {
    stroke: color,
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };

  if (name === 'placeholder') {
    return (
      <Svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        accessible={false}
      >
        <Path
          d="M3 10.5L12 3L21 10.5H19V21H14V15H10V21H5V10.5H3Z"
          fill={color}
        />
      </Svg>
    );
  }

  if (name === 'heart' || name === 'heart-outline') {
    return (
      <Svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        accessible={false}
      >
        <Path
          d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78Z"
          fill={name === 'heart' ? color : 'none'}
          stroke={color}
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    );
  }

  if (name === 'location') {
    return (
      <Svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        accessible={false}
      >
        <Path
          d="M20 10C20 16 12 22 12 22S4 16 4 10a8 8 0 1 1 16 0Z"
          fill="none"
          {...strokeProps}
        />
        <Circle
          cx={12}
          cy={10}
          r={2.5}
          fill="none"
          {...strokeProps}
        />
      </Svg>
    );
  }

  if (name === 'area') {
    return (
      <Svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        accessible={false}
      >
        <Path
          d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M21 16v3a2 2 0 0 1-2 2h-3M8 21H5a2 2 0 0 1-2-2v-3"
          fill="none"
          {...strokeProps}
        />
      </Svg>
    );
  }

  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      accessible={false}
    >
      <Path
        d="M3 18V6M3 14H21V18M21 18V9M3 11H8A3 3 0 0 1 11 14"
        fill="none"
        {...strokeProps}
      />
    </Svg>
  );
}

// --------------------------------------------------
// Property Card
// --------------------------------------------------

export default function PropertyCard({
  property,
  image,
  variant = 'standard',
  favorite = false,
  currencyLabel = 'DT',
  period,
  onFavoritePress,
  onPress,
}: PropertyCardProps) {
  const [imageError, setImageError] = useState(false);

  // Reset image error when the source changes.
  useEffect(() => {
    setImageError(false);
  }, [image]);

  const priceText = formatPrice(property.price, currencyLabel);

  const periodText =
    period ??
    (property.listing_type === 'rent' ? '/ month' : '');

  const propertyTypeLabel =
    PROPERTY_TYPE_LABELS[property.property_type];

  const badgeLabel =
    variant === 'featured'
      ? 'Featured'
      : variant === 'new'
        ? 'New'
        : null;

  const hasImage = image !== null && image !== undefined && !imageError;

  return (
    <View style={styles.shadowContainer}>
      <Pressable
        style={({ pressed }) => [
          styles.card,
          pressed && onPress ? styles.cardPressed : undefined,
        ]}
        onPress={onPress}
        accessibilityRole={onPress ? 'button' : undefined}
        accessibilityLabel={`${property.title}, ${priceText}, ${property.city}`}
        accessibilityHint={
          onPress ? 'Opens the property details.' : undefined
        }
      >
        {/* ----------------------------------------- */}
        {/* Media */}
        {/* ----------------------------------------- */}

        <View style={styles.media}>
          {hasImage ? (
            <Image
              source={image}
              style={styles.image}
              resizeMode="cover"
              onError={() => setImageError(true)}
              accessible={false}
            />
          ) : (
            <View style={styles.imagePlaceholder}>
              <PropertyIcon
                name="placeholder"
                size={48}
                color={colors.placeholder}
              />
            </View>
          )}

          {/* Listing Badge */}

          {badgeLabel ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {badgeLabel}
              </Text>
            </View>
          ) : null}

          {/* Favorite Button */}

          <Pressable
            style={styles.favoriteButton}
            onPress={(event) => {
              event.stopPropagation();
              onFavoritePress?.();
            }}
            disabled={!onFavoritePress}
            hitSlop={4}
            accessibilityRole="button"
            accessibilityLabel={
              favorite
                ? 'Remove from favorites'
                : 'Add to favorites'
            }
            accessibilityState={{
              selected: favorite,
              disabled: !onFavoritePress,
            }}
          >
            <View style={styles.favoriteCircle}>
              <PropertyIcon
                name={favorite ? 'heart' : 'heart-outline'}
                size={24}
                color={
                  favorite
                    ? colors.favorite
                    : colors.secondary
                }
              />
            </View>
          </Pressable>
        </View>

        {/* ----------------------------------------- */}
        {/* Content */}
        {/* ----------------------------------------- */}

        <View style={styles.content}>
          {/* Price Row */}

          <View style={styles.priceRow}>
            <Text
              style={styles.price}
              numberOfLines={1}
            >
              {priceText}
            </Text>

            {periodText ? (
              <Text style={styles.period}>
                {periodText}
              </Text>
            ) : null}
          </View>

          {/* Title */}

          <Text
            style={styles.title}
            numberOfLines={1}
          >
            {property.title}
          </Text>

          {/* Location Row */}

          <View style={styles.locationRow}>
            <PropertyIcon
              name="location"
              size={16}
              color={colors.secondary}
            />

            <Text
              style={styles.location}
              numberOfLines={1}
            >
              {property.city}
            </Text>
          </View>

          {/* Specs Row */}

          <View style={styles.specsRow}>
            <View style={styles.specs}>
              {/* Surface */}

              <View style={styles.specItem}>
                <PropertyIcon
                  name="area"
                  size={16}
                  color={colors.secondary}
                />

                <Text style={styles.specText} numberOfLines={1}>
                  {formatSurface(property.surface_m2)}
                </Text>
              </View>

              {/* Rooms */}

              <View style={styles.specItem}>
                <PropertyIcon
                  name="bed"
                  size={16}
                  color={colors.secondary}
                />

                <Text style={styles.specText} numberOfLines={1}>
                  {formatRooms(property.rooms)}
                </Text>
              </View>
            </View>

            {/* Property Type Chip */}

            <View style={styles.propertyTypeChip}>
              <Text
                style={styles.propertyTypeText}
                numberOfLines={1}
              >
                {propertyTypeLabel}
              </Text>
            </View>
          </View>
        </View>
      </Pressable>
    </View>
  );
}

// --------------------------------------------------
// Styles — Based on the SVG reference
// --------------------------------------------------

const styles = StyleSheet.create({
  // Shadow wrapper.
  // Separating this from the clipped card preserves shadows.

  shadowContainer: {
    width: 328,
    height: 334,

    backgroundColor: cardTheme.backgroundColor,
    borderRadius: cardTheme.borderRadius,

    elevation: cardTheme.elevation,

    shadowColor: cardTheme.shadowColor,
    shadowOffset: cardTheme.shadowOffset,
    shadowOpacity: cardTheme.shadowOpacity,
    shadowRadius: cardTheme.shadowRadius,
  },

  // Card surface.

  card: {
    flex: 1,

    backgroundColor: cardTheme.backgroundColor,

    borderWidth: cardTheme.borderWidth,
    borderColor: cardTheme.borderColor,
    borderRadius: cardTheme.borderRadius,

    overflow: cardTheme.overflow,
  },

  cardPressed: {
    opacity: 0.96,
  },

  // Media: 326 x 184 dp.

  media: {
    width: '100%',
    height: 184,

    position: 'relative',

    backgroundColor: colors.outlineVariant,
  },

  image: {
    width: '100%',
    height: '100%',
  },

  imagePlaceholder: {
    flex: 1,

    alignItems: 'center',
    justifyContent: 'center',

    backgroundColor: colors.outlineVariant,
  },

  // Badge: Featured / New.

  badge: {
    position: 'absolute',

    left: 12,
    top: 12,

    minHeight: 24,

    paddingHorizontal: 8,
    paddingVertical: 4,

    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',

    backgroundColor: colors.featured,

    borderRadius: radius.full,

    zIndex: 2,
  },

  badgeText: {
    ...theme.fonts.labelMedium,

    fontFamily: 'Roboto',
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
    letterSpacing: 0.5,

    color: colors.onFeatured,
  },

  // Favorite Button: 48 x 48 dp.

  favoriteButton: {
    position: 'absolute',

    top: 4,
    right: 2,

    width: 48,
    height: 48,

    alignItems: 'center',
    justifyContent: 'center',

    zIndex: 3,
  },

  favoriteCircle: {
    width: 40,
    height: 40,

    borderRadius: radius.full,

    backgroundColor: colors.surface,

    alignItems: 'center',
    justifyContent: 'center',
  },

  // Content: padding 12px 16px 16px, gap 8px.

  content: {
    flex: 1,

    paddingTop: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,

    gap: spacing.sm,
  },

  // Price Row.

  priceRow: {
    height: 28,

    flexDirection: 'row',
    alignItems: 'baseline',

    gap: spacing.xs,
  },

  price: {
    ...typography.price,
    fontFamily: theme.fonts.titleLarge.fontFamily,
    flexShrink: 1,
  },

  period: {
    ...typography.caption,
    fontFamily: theme.fonts.bodySmall.fontFamily,
  },

  // Title.
  title: {
    ...typography.title,
    fontFamily: theme.fonts.titleMedium.fontFamily,
  },

  // Location Row.

  locationRow: {
    height: 20,

    flexDirection: 'row',
    alignItems: 'center',

    gap: spacing.xs,
  },

  location: {
    ...typography.body,
    fontFamily: theme.fonts.bodyMedium.fontFamily,
    flex: 1,
  },

  // Specs Row.

  specsRow: {
    height: 24,

    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',

    gap: spacing.sm,
  },

  specs: {
    flex: 1,

    flexDirection: 'row',
    alignItems: 'center',

    gap: spacing.md,
  },

  specItem: {
    flexDirection: 'row',
    alignItems: 'center',

    gap: spacing.xs,
  },

  specText: {
    fontFamily: 'Roboto',
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
    letterSpacing: 0.25,

    color: colors.secondary,
  },

  // Property Type Chip.

  propertyTypeChip: {
    height: 24,

    maxWidth: 100,

    paddingHorizontal: spacing.sm,

    justifyContent: 'center',
    alignItems: 'center',

    backgroundColor: colors.surfaceVariant,

    borderRadius: radius.full,
  },

  propertyTypeText: {
    fontFamily: 'Roboto',
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
    letterSpacing: 0.5,

    color: colors.secondary,
  },
});