
import React, { useCallback, useEffect, useState } from 'react';

import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import PropertyCard from '../../components/PropertyCard';
import { AppLogo } from '../../components/AppLogo';
import { useFavorite } from '../../context/FavoriteContext';
import { theme, spacing, radius, typography } from '../../theme';
import type { PropertyWithRelations } from '../../types/property';

const colors = theme.colors;

export default function FavoritesScreen() {
  const {
    favoriteIds,
    remove: removeFavorite,
    getFavoriteProperties,
  } = useFavorite();

  const router = useRouter();

  const [properties, setProperties] = useState<PropertyWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // -----------------------------------------------
  // Load favorites
  // -----------------------------------------------

  const loadFavorites = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError(null);

    try {
      const result = await getFavoriteProperties();
      setProperties(result);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to load favorites.',
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [getFavoriteProperties]);

  // Reload when favorites change elsewhere in the app.
  useEffect(() => {
    void loadFavorites();
  }, [favoriteIds, loadFavorites]);

  // -----------------------------------------------
  // Remove favorite
  // -----------------------------------------------

  const handleRemoveFavorite = useCallback(
    async (propertyId: string) => {
      const removed = properties.find(
        (item) => item.id === propertyId,
      );

      // Optimistic update.
      setProperties((current) =>
        current.filter((item) => item.id !== propertyId),
      );

      try {
        await removeFavorite(propertyId);
      } catch (err) {
        // Restore the item if the operation fails.
        if (removed) {
          setProperties((current) => {
            if (current.some((item) => item.id === propertyId)) {
              return current;
            }

            return [...current, removed];
          });
        }

        setError(
          err instanceof Error
            ? err.message
            : 'Unable to remove from favorites.',
        );
      }
    },
    [properties, removeFavorite],
  );

  // -----------------------------------------------
  // Render property
  // -----------------------------------------------

  const renderItem = useCallback(
    ({ item }: { item: PropertyWithRelations }) => {
      const firstImageUrl = item.property_images[0]?.image_url;
      const imageSource = firstImageUrl
        ? { uri: firstImageUrl }
        : null;

      return (
        <View style={styles.cardContainer}>
          <PropertyCard
            property={item}
            image={imageSource}
            variant="standard"
            currencyLabel="DT"
            period={
              item.listing_type === 'rent'
                ? '/ mois'
                : undefined
            }
            favorite={true}
            onFavoritePress={() => {
              void handleRemoveFavorite(item.id);
            }}
            onPress={() => {
              router.push({
                pathname: '/property/[id]' as never,
                params: { id: item.id },
              });
            }}
          />
        </View>
      );
    },
    [handleRemoveFavorite, router],
  );

  // -----------------------------------------------
  // Loading state
  // -----------------------------------------------

  if (loading) {
    return (
      <SafeAreaView style={styles.stateScreen}>
        <StatusBar style="dark" />

        <View style={styles.stateIcon}>
          <ActivityIndicator
            size="large"
            color={colors.primary}
          />
        </View>

        <Text style={styles.stateTitle}>
          Loading your favorites
        </Text>

        <Text style={styles.stateSubtitle}>
          Your saved properties will be ready in a moment.
        </Text>
      </SafeAreaView>
    );
  }

  // -----------------------------------------------
  // Error state
  // -----------------------------------------------

  if (error && properties.length === 0) {
    return (
      <SafeAreaView style={styles.stateScreen}>
        <StatusBar style="dark" />

        <View style={styles.stateIcon}>
          <Ionicons
            name="cloud-offline-outline"
            size={32}
            color={colors.error}
          />
        </View>

        <Text style={styles.stateTitle}>
          Unable to load favorites
        </Text>

        <Text style={styles.stateSubtitle}>
          {error}
        </Text>

        <Pressable
          style={styles.primaryButton}
          accessibilityRole="button"
          onPress={() => void loadFavorites()}
        >
          <Ionicons
            name="refresh-outline"
            size={18}
            color={colors.onPrimary}
          />

          <Text style={styles.primaryButtonText}>
            Try again
          </Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  // -----------------------------------------------
  // Empty state
  // -----------------------------------------------

  if (properties.length === 0) {
    return (
      <SafeAreaView style={styles.stateScreen}>
        <StatusBar style="dark" />

        <View style={styles.emptyIllustration}>
          <View style={styles.emptyCircle}>
            <Ionicons
              name="heart"
              size={52}
              color={colors.primary}
            />
          </View>

          <View style={styles.emptySmallCircle}>
            <Ionicons
              name="home-outline"
              size={21}
              color={colors.primary}
            />
          </View>
        </View>

        <Text style={styles.emptyTitle}>
          Your favorites are waiting
        </Text>

        <Text style={styles.emptySubtitle}>
          Save the properties you love and keep all
          your favorite places in one convenient spot.
        </Text>

        <Pressable
          style={styles.primaryButton}
          accessibilityRole="button"
          onPress={() => router.replace('/' as never)}
        >
          <Ionicons
            name="search-outline"
            size={19}
            color={colors.onPrimary}
          />

          <Text style={styles.primaryButtonText}>
            Explore properties
          </Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  // -----------------------------------------------
  // Main screen
  // -----------------------------------------------

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <View style={styles.brandRow}>
            <View style={styles.brandIcon}>
              <AppLogo size={36} />
            </View>

            <Text style={styles.brandName}>
              DWELLIO
            </Text>
          </View>

          <Text style={styles.headerGreeting}>
            YOUR PERSONAL COLLECTION
          </Text>

          <Text style={styles.headerTitle}>
            My Favorites
          </Text>

          <Text style={styles.headerSubtitle}>
            The places you love, all in one place.
          </Text>
        </View>

        <View style={styles.countBadge}>
          <Ionicons
            name="heart"
            size={15}
            color={colors.primary}
          />

          <Text style={styles.countText}>
            {properties.length}
          </Text>
        </View>
      </View>

      {/* Results heading */}
      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>
            Saved properties
          </Text>

          <Text style={styles.sectionSubtitle}>
            {properties.length}{' '}
            {properties.length === 1 ? 'property' : 'properties'} saved
          </Text>
        </View>
      </View>

      {/* Error feedback */}
      {error !== null && (
        <View style={styles.inlineError}>
          <Ionicons
            name="alert-circle-outline"
            size={18}
            color={colors.error}
          />

          <Text style={styles.inlineErrorText}>
            {error}
          </Text>

          <Pressable
            onPress={() => setError(null)}
            accessibilityRole="button"
          >
            <Ionicons
              name="close"
              size={19}
              color={colors.error}
            />
          </Pressable>
        </View>
      )}

      {/* Properties list */}
      <FlatList
        data={properties}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        extraData={properties}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void loadFavorites(true)}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        initialNumToRender={4}
        windowSize={5}
      />
    </SafeAreaView>
  );
}

// -----------------------------------------------
// Styles
// -----------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // Header
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },

  brandIcon: {
    width: 29,
    height: 29,
    borderRadius: radius.sm,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  brandName: {
    ...theme.fonts.labelLarge,
    color: colors.primary,
    letterSpacing: 1.5,
  },

  headerGreeting: {
    ...theme.fonts.labelSmall,
    color: colors.secondary,
    letterSpacing: 1.3,
    marginBottom: spacing.xs,
  },

  headerTitle: {
    ...theme.fonts.headlineMedium,
    color: colors.onBackground,
    marginBottom: spacing.xs,
  },

  headerSubtitle: {
    ...typography.body,
    color: colors.secondary,
  },

  countBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceVariant,
    marginLeft: spacing.sm,
  },

  countText: {
    ...theme.fonts.labelLarge,
    color: colors.primary,
  },

  // Section
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

  // Property list
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },

  cardContainer: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },

  // States
  stateScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
    backgroundColor: colors.background,
  },

  stateIcon: {
    width: 76,
    height: 76,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceVariant,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },

  stateTitle: {
    ...theme.fonts.titleLarge,
    color: colors.onBackground,
    textAlign: 'center',
  },

  stateSubtitle: {
    ...typography.body,
    color: colors.secondary,
    textAlign: 'center',
    lineHeight: 22,
  },

  // Empty state
  emptyIllustration: {
    width: 150,
    height: 145,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },

  emptyCircle: {
    width: 112,
    height: 112,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },

  emptySmallCircle: {
    position: 'absolute',
    right: 5,
    bottom: 12,
    width: 48,
    height: 48,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.outline,
    alignItems: 'center',
    justifyContent: 'center',
  },

  emptyTitle: {
    ...theme.fonts.headlineSmall,
    color: colors.onBackground,
    textAlign: 'center',
  },

  emptySubtitle: {
    ...typography.body,
    color: colors.secondary,
    textAlign: 'center',
    lineHeight: 23,
    maxWidth: 300,
  },

  // Buttons
  primaryButton: {
    minHeight: 50,
    paddingHorizontal: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    marginTop: spacing.md,
  },

  primaryButtonText: {
    ...theme.fonts.labelLarge,
    color: colors.onPrimary,
  },

  // Inline error
  inlineError: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceVariant,
    borderRadius: radius.md,
  },

  inlineErrorText: {
    ...typography.body,
    color: colors.error,
    flex: 1,
  },
});