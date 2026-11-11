import React, { useCallback, useRef, useState } from 'react';

import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
  type ListRenderItemInfo,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect, usePathname, useRouter } from 'expo-router';

import PropertyCard from '../../components/PropertyCard';
import { theme, spacing, radius, typography } from '../../theme';
import { getCurrentUser } from '../../services/authService';
import { getProperties } from '../../services/propertyService';
import type { PropertySearchResult } from '../../types/property';

const colors = theme.colors;

// --------------------------------------------------
// Home Screen
// --------------------------------------------------

export default function HomeScreen() {
  const [properties, setProperties] = useState<PropertySearchResult[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const isMounted = useRef(false);
  const requestId = useRef(0);
  const router = useRouter();
  const pathname = usePathname();

  // -----------------------------------------------
  // Load properties from Supabase
  // -----------------------------------------------

  const loadProperties = useCallback(async (isRefresh = false) => {
    const currentRequestId = ++requestId.current;

    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setLoadError(null);

    try {
      const result = await getProperties();

      if (isMounted.current && requestId.current === currentRequestId) {
        setProperties(result);
      }
    } catch (error) {
      if (requestId.current === currentRequestId) {
        console.error('Failed to load properties:', error);

        if (isMounted.current) {
          setLoadError('Unable to load properties. Please try again.');
        }
      }
    } finally {
      if (isMounted.current && requestId.current === currentRequestId) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      isMounted.current = true;
      void loadProperties();

      return () => {
        isMounted.current = false;
        requestId.current += 1;
      };
    }, [loadProperties]),
  );

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

  const handleFavoritePress = useCallback(
    async (propertyId: string) => {
      try {
        // Guests must sign in before they can favorite a property.
        const user = await getCurrentUser();

        if (!user) {
          router.push({
            pathname: '/login',
            params: { from: pathname },
          });
          return;
        }

        // Keep the current favorite behavior for authenticated users.
        // Replace this with FavoriteService when database persistence is added.
        toggleFavorite(propertyId);
      } catch (error) {
        console.error('Unable to check the current user:', error);
      }
    },
    [pathname, router, toggleFavorite],
  );

  // -----------------------------------------------
  // Render Property
  // -----------------------------------------------

  const renderProperty = useCallback(
    ({ item }: ListRenderItemInfo<PropertySearchResult>) => {
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
            favorite={favorites.includes(item.id)}
            onFavoritePress={() => {
              void handleFavoritePress(item.id);
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
    [favorites, handleFavoritePress, router],
  );

  // -----------------------------------------------
  // Empty / loading / error content
  // -----------------------------------------------

  const listEmptyContent = loading ? (
    <View style={styles.listStateContainer}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.listStateText}>Loading properties...</Text>
    </View>
  ) : loadError ? (
    <View style={styles.listStateContainer}>
      <Text style={styles.errorText}>{loadError}</Text>
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          void loadProperties();
        }}
        style={styles.retryButton}
      >
        <Text style={styles.retryButtonText}>Try again</Text>
      </Pressable>
    </View>
  ) : (
    <View style={styles.listStateContainer}>
      <Text style={styles.listStateText}>No active properties found.</Text>
    </View>
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
          <Text style={styles.subtitle}>Find your next home</Text>
          <Text style={styles.title}>Immobilier</Text>
        </View>

        <View style={styles.countBadge}>
          <Text style={styles.countText}>
            {loading ? '...' : `${properties.length} biens`}
          </Text>
        </View>
      </View>

      {/* Section Header */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Nos propriétés</Text>
        <Text style={styles.sectionSubtitle}>
          Découvrez nos dernières annonces
        </Text>
      </View>

      {/* Supabase Properties List */}
      <FlatList
        data={properties}
        keyExtractor={(item) => item.id}
        renderItem={renderProperty}
        extraData={favorites}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.listContent,
          properties.length === 0 && styles.emptyListContent,
        ]}
        ListEmptyComponent={listEmptyContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              void loadProperties(true);
            }}
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
  emptyListContent: {
    flexGrow: 1,
  },
  cardContainer: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },

  // List states
  listStateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xxl,
    gap: spacing.md,
  },
  listStateText: {
    ...typography.body,
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
});