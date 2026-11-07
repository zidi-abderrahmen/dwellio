import React, { useCallback, useState } from 'react';

import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ListRenderItemInfo,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import PropertyCard, {
  PropertyCardData,
  PropertyCardVariant,
} from '../../components/PropertyCard';

import { theme, spacing, radius, typography } from '../../theme';
import { useRouter, usePathname } from 'expo-router';
import { getCurrentUser } from '../../services/authService';

// --------------------------------------------------
// Types
// --------------------------------------------------

interface Property extends PropertyCardData {
  address: string | null;
  bathrooms: number | null;
  variant: PropertyCardVariant;
}

const colors = theme.colors;

// --------------------------------------------------
// Mock Properties
// Based on the Supabase properties table
// --------------------------------------------------

const fakeProperties: Property[] = [
  {
    id: '00000000-0000-4000-8000-000000000001',
    title: 'Bright 3-room apartment',
    listing_type: 'sale',
    property_type: 'apartment',
    price: 250000,
    surface_m2: 120,
    rooms: 3,
    bathrooms: 2,
    city: 'Tunis',
    address: 'Les Berges du Lac, Tunis',
    variant: 'featured',
  },
  {
    id: '00000000-0000-4000-8000-000000000002',
    title: 'Modern family villa',
    listing_type: 'sale',
    property_type: 'villa',
    price: 650000,
    surface_m2: 250,
    rooms: 5,
    bathrooms: 3,
    city: 'La Marsa',
    address: 'La Marsa, Tunis',
    variant: 'new',
  },
  {
    id: '00000000-0000-4000-8000-000000000003',
    title: 'Cozy apartment for rent',
    listing_type: 'rent',
    property_type: 'apartment',
    price: 1200,
    surface_m2: 85,
    rooms: 2,
    bathrooms: 1,
    city: 'Ariana',
    address: 'Ennasr 2, Ariana',
    variant: 'standard',
  },
  {
    id: '00000000-0000-4000-8000-000000000004',
    title: 'Spacious traditional house',
    listing_type: 'sale',
    property_type: 'house',
    price: 320000,
    surface_m2: 180,
    rooms: 4,
    bathrooms: 2,
    city: 'Bizerte',
    address: 'Centre Ville, Bizerte',
    variant: 'standard',
  },
];

// --------------------------------------------------
// Home Screen
// --------------------------------------------------

export default function HomeScreen() {
  const [favorites, setFavorites] = useState<string[]>([]);

  const router = useRouter();
  const pathname = usePathname();

  const handleFavoritePress = async (propertyId: string) => {
    // Check whether the user is authenticated.
    const user = await getCurrentUser();

    // Guest users must sign in before favoriting.
    if (!user) {
      router.push({
        pathname: '/login',
        params: { from: pathname },
      });

      return;
    }

    // User is authenticated: execute your existing favorite logic here.
    // For example:
    // await favoriteService.toggleFavorite(propertyId);
    await toggleFavorite(propertyId);
  };

  // -----------------------------------------------
  // Toggle Favorite
  // -----------------------------------------------

  const toggleFavorite = useCallback((id: string) => {
    setFavorites((previous) =>
      previous.includes(id)
        ? previous.filter((item) => item !== id)
        : [...previous, id],
    );
  }, []);

  // -----------------------------------------------
  // Render Property
  // -----------------------------------------------

  const renderProperty = useCallback(
    ({ item }: ListRenderItemInfo<Property>) => {
      return (
        <View style={styles.cardContainer}>
          <PropertyCard
            property={item}
            variant={item.variant}
            currencyLabel="DT"
            period={
              item.listing_type === 'rent'
                ? '/ mois'
                : undefined
            }
            favorite={favorites.includes(item.id)}
            onFavoritePress={() => handleFavoritePress(item.id)}
            onPress={() => {
              console.log('Selected property:', item.id);
            }}
          />
        </View>
      );
    },
    [favorites, toggleFavorite],
  );

  // -----------------------------------------------
  // Screen
  // -----------------------------------------------

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      {/* Header */}

      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.subtitle}>
            Find your next home
          </Text>

          <Text style={styles.title}>
            Immobilier
          </Text>
        </View>

        <View style={styles.countBadge}>
          <Text style={styles.countText}>
            {fakeProperties.length} biens
          </Text>
        </View>
      </View>

      {/* Section Header */}

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>
          Nos propriétés
        </Text>

        <Text style={styles.sectionSubtitle}>
          Découvrez nos dernières annonces
        </Text>
      </View>

      {/* Properties List */}

      <FlatList
        data={fakeProperties}
        keyExtractor={(item) => item.id}
        renderItem={renderProperty}
        extraData={favorites}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        initialNumToRender={4}
        windowSize={5}
      />
    </SafeAreaView>
  );
}

// --------------------------------------------------
// Styles — Global Application Theme
// --------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // Header

  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,

    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  headerText: {
    flex: 1,
  },

  subtitle: {
    ...typography.body,
    color: colors.secondary,
    marginBottom: spacing.xs,
  },

  title: {
    ...theme.fonts.headlineMedium,
    color: colors.primary,
  },

  countBadge: {
    backgroundColor: colors.surfaceVariant,

    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,

    borderRadius: radius.full,
  },

  countText: {
    ...theme.fonts.labelMedium,
    color: colors.secondary,
  },

  // Section Header

  sectionHeader: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },

  sectionTitle: {
    ...theme.fonts.titleLarge,
    color: colors.onBackground,
    marginBottom: spacing.xs,
  },

  sectionSubtitle: {
    ...typography.body,
    color: colors.secondary,
  },

  // Properties List

  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },

  cardContainer: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
});