
import React from 'react';
import {
  View,
  Text,
  Image,
  ImageSourcePropType,
  Pressable,
  StyleSheet,
} from 'react-native';
import { theme, cardTheme, spacing, radius } from '../theme';

const colors = theme.colors;

type PropertyIconName =
  | 'image-outline'
  | 'heart'
  | 'heart-outline'
  | 'map-marker-outline'
  | 'arrow-expand'
  | 'bed-outline';

const iconGlyphs: Record<PropertyIconName, string> = {
  'image-outline': '▧',
  heart: '♥',
  'heart-outline': '♡',
  'map-marker-outline': '⌖',
  'arrow-expand': '⤢',
  'bed-outline': '▱',
};

function PropertyIcon({
  name,
  size,
  color,
}: {
  name: PropertyIconName;
  size: number;
  color: string;
}) {
  return (
    <Text
      accessible={false}
      style={{ color, fontSize: size, lineHeight: size, textAlign: 'center' }}
    >
      {iconGlyphs[name]}
    </Text>
  );
}

interface PropertyCardProps {
  image?: ImageSourcePropType;
  price: string;
  period?: string;
  title: string;
  location: string;
  surface: number;
  rooms: number;
  propertyType: string;
  favorite?: boolean;
  onFavoritePress?: () => void;
  onPress?: () => void;
}

export default function PropertyCard({
  image,
  price,
  period = '',
  title,
  location,
  surface,
  rooms,
  propertyType,
  favorite = false,
  onFavoritePress,
  onPress,
}: PropertyCardProps) {
  return (
    <Pressable
      style={styles.card}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${price}`}
    >
      {/* Media */}
      <View style={styles.media}>
        {image ? (
          <Image
            source={image}
            style={styles.image}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.imagePlaceholder}>
            <PropertyIcon
              name="image-outline"
              size={48}
              color={colors.placeholder}
            />
          </View>
        )}

        {/* Favorite Button */}
        <Pressable
          style={styles.favoriteButton}
          onPress={(event) => {
            event.stopPropagation();
            onFavoritePress?.();
          }}
          accessibilityRole="button"
          accessibilityLabel={
            favorite
              ? 'Remove from favorites'
              : 'Add to favorites'
          }
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

      {/* Content */}
      <View style={styles.content}>
        {/* Price Row */}
        <View style={styles.priceRow}>
          <Text style={styles.price} numberOfLines={1}>
            {price}
          </Text>

          {period ? (
            <Text style={styles.period}>
              {period}
            </Text>
          ) : null}
        </View>

        {/* Title */}
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>

        {/* Location Row */}
        <View style={styles.locationRow}>
          <PropertyIcon
            name="map-marker-outline"
            size={16}
            color={colors.secondary}
          />

          <Text
            style={styles.location}
            numberOfLines={1}
          >
            {location}
          </Text>
        </View>

        {/* Specs Row */}
        <View style={styles.specsRow}>
          <View style={styles.specs}>
            {/* Surface */}
            <View style={styles.specItem}>
              <PropertyIcon
                name="arrow-expand"
                size={16}
                color={colors.secondary}
              />

              <Text style={styles.specText}>
                {surface} m²
              </Text>
            </View>

            {/* Rooms */}
            <View style={styles.specItem}>
              <PropertyIcon
                name="bed-outline"
                size={16}
                color={colors.secondary}
              />

              <Text style={styles.specText}>
                {rooms} rooms
              </Text>
            </View>
          </View>

          {/* Property Type Chip */}
          <View style={styles.propertyTypeChip}>
            <Text
              style={styles.propertyTypeText}
              numberOfLines={1}
            >
              {propertyType}
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // Card: 328 x 334 dp
  card: {
    width: 328,
    height: 334,

    backgroundColor: cardTheme.backgroundColor,

    borderWidth: 1,
    borderColor: cardTheme.borderColor,
    borderRadius: cardTheme.borderRadius,

    elevation: cardTheme.elevation,

    shadowColor: cardTheme.shadowColor,
    shadowOffset: cardTheme.shadowOffset,
    shadowOpacity: cardTheme.shadowOpacity,
    shadowRadius: cardTheme.shadowRadius,

    overflow: 'hidden',
  },

  // Media: 326 x 184 dp
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

  // Favorite: 48 x 48 dp target
  favoriteButton: {
    position: 'absolute',

    top: 4,
    right: 2,

    width: 48,
    height: 48,

    alignItems: 'center',
    justifyContent: 'center',
  },

  favoriteCircle: {
    width: 40,
    height: 40,

    borderRadius: radius.full,

    backgroundColor: colors.surface,

    alignItems: 'center',
    justifyContent: 'center',
  },

  // Content: padding 12px 16px 16px
  content: {
    flex: 1,

    paddingTop: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,

    gap: spacing.sm,
  },

  // Price Row
  priceRow: {
    height: 28,

    flexDirection: 'row',
    alignItems: 'baseline',

    gap: spacing.xs,
  },

  price: {
    flexShrink: 1,

    fontFamily: 'Roboto',
    fontSize: 22,
    fontWeight: '500',
    lineHeight: 28,

    color: colors.primary,
  },

  period: {
    fontFamily: 'Roboto',
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 16,
    letterSpacing: 0.4,

    color: colors.secondary,
  },

  // Title
  title: {
    height: 24,

    fontFamily: 'Roboto',
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 24,
    letterSpacing: 0.15,

    color: colors.onBackground,
  },

  // Location Row
  locationRow: {
    height: 20,

    flexDirection: 'row',
    alignItems: 'center',

    gap: spacing.xs,
  },

  location: {
    flex: 1,

    fontFamily: 'Roboto',
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
    letterSpacing: 0.25,

    color: colors.secondary,
  },

  // Specs Row
  specsRow: {
    height: 24,

    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',

    gap: spacing.sm,
  },

  specs: {
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

  // Property Type Chip
  propertyTypeChip: {
    height: 24,

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
