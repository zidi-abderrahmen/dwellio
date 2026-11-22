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

  const loadFavorites = useCallback(async () => {
    setLoading(true);
    setRefreshing(true);
    setError(null);

    try {
      const result = await getFavoriteProperties();
      setProperties(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load favorites.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [getFavoriteProperties]);

  // Reload whenever the shared favorite IDs change (e.g. favorited from Home).
  useEffect(() => {
    void loadFavorites();
  }, [favoriteIds, loadFavorites]);

  const handleRemoveFavorite = useCallback(
    async (propertyId: string) => {
      const removed = properties.find((item) => item.id === propertyId);

      setProperties((current) =>
        current.filter((item) => item.id !== propertyId),
      );

      try {
        await removeFavorite(propertyId);
      } catch (err) {
        // Rollback the local list on failure.
        if (removed) {
          setProperties((current) => [...current, removed]);
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

  const renderItem = useCallback(
    ({ item }: { item: PropertyWithRelations }) => {
      const firstImageUrl = item.property_images[0]?.image_url;
      const imageSource = firstImageUrl ? { uri: firstImageUrl } : null;

      return (
        <View style={styles.cardContainer}>
          <PropertyCard
            property={item}
            image={imageSource}
            variant="standard"
            currencyLabel="DT"
            period={item.listing_type === 'rent' ? '/ mois' : undefined}
            favorite={true}
            onFavoritePress={() => void handleRemoveFavorite(item.id)}
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

  if (loading) {
    return (
      <SafeAreaView style={styles.stateScreen}>
        <StatusBar style="dark" />
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.stateText}>Loading your favorites...</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.stateScreen}>
        <StatusBar style="dark" />
        <Ionicons name="alert-circle-outline" size={42} color={colors.error} />
        <Text style={styles.errorText}>{error}</Text>
        <Pressable
          style={styles.retryButton}
          accessibilityRole="button"
          onPress={() => void loadFavorites()}
        >
          <Text style={styles.retryButtonText}>Try again</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  if (properties.length === 0) {
    return (
      <SafeAreaView style={styles.stateScreen}>
        <StatusBar style="dark" />
        <Ionicons name="heart-outline" size={64} color={colors.secondary} />
        <Text style={styles.stateText}>
          You haven't saved any properties yet
        </Text>
        <Text style={styles.emptySubtitle}>
          Properties you favorite will appear here.
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

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
            onRefresh={() => void loadFavorites()}
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
    fontSize: 16,
    fontWeight: '500',
    color: colors.onBackground,
    textAlign: 'center',
  },
  emptySubtitle: {
    ...typography.body,
    fontSize: 14,
    color: colors.secondary,
    textAlign: 'center',
  },
  errorText: {
    ...typography.body,
    color: colors.error,
    textAlign: 'center',
  },
  retryButton: {
    minHeight: 44,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.md,
  },
  retryButtonText: {
    ...theme.fonts.labelLarge,
    color: colors.onPrimary,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  cardContainer: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
});
