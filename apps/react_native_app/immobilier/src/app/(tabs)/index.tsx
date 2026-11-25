
import React, { useCallback, useEffect, useRef, useState } from 'react';

import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ListRenderItemInfo,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect, usePathname, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import PropertyCard from '../../components/PropertyCard';
import PropertyFilterSheet from '../../components/property/PropertyFilterSheet';
import { AppLogo } from '../../components/AppLogo';
import { theme, spacing, radius, typography } from '../../theme';
import { getCurrentUser } from '../../services/authService';
import { getFilteredProperties } from '../../services/propertyService';
import { useFavorite } from '../../context/FavoriteContext';
import { useNotifications } from '../../context/NotificationContext';
import type { PropertySearchResult } from '../../types/property';
import type { PropertyFilters } from '../../types/propertyFilters';

const colors = theme.colors;

export default function HomeScreen() {
  const [properties, setProperties] = useState<PropertySearchResult[]>([]);
  const {
    favoriteIds,
    add: addFavorite,
    remove: removeFavorite,
    load: loadFavorites,
  } = useFavorite();

  const [searchText, setSearchText] = useState('');
  const [filters, setFilters] = useState<PropertyFilters>({});
  const [filterSheetVisible, setFilterSheetVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const isMounted = useRef(false);
  const requestId = useRef(0);
  const searchTextRef = useRef('');
  const filtersRef = useRef<PropertyFilters>({});
  filtersRef.current = filters;

  const skipNextSearchDebounce = useRef(false);
  const skipInitialSearchDebounce = useRef(true);
  const skipInitialFilterLoad = useRef(true);

  const router = useRouter();
  const pathname = usePathname();
  const { unreadCount } = useNotifications();

  // -----------------------------------------------
  // Load properties
  // -----------------------------------------------

  const loadProperties = useCallback(
    async (activeFilters: PropertyFilters = {}, isRefresh = false) => {
      const currentRequestId = ++requestId.current;

      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setLoadError(null);

      try {
        const result = await getFilteredProperties(activeFilters);

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
    },
    [],
  );

  useFocusEffect(
    useCallback(() => {
      isMounted.current = true;

      void loadProperties({
        ...filtersRef.current,
        city: searchTextRef.current.trim() || undefined,
      });

      void loadFavorites();

      return () => {
        isMounted.current = false;
        requestId.current += 1;
      };
    }, [loadProperties, loadFavorites]),
  );

  // -----------------------------------------------
  // Search debounce
  // -----------------------------------------------

  useEffect(() => {
    if (skipNextSearchDebounce.current) {
      skipNextSearchDebounce.current = false;
      return;
    }

    if (skipInitialSearchDebounce.current) {
      skipInitialSearchDebounce.current = false;
      return;
    }

    const timeoutId = setTimeout(() => {
      const city = searchText.trim() || undefined;
      setFilters((currentFilters) => ({ ...currentFilters, city }));
    }, 400);

    return () => clearTimeout(timeoutId);
  }, [searchText]);

  useEffect(() => {
    if (skipInitialFilterLoad.current) {
      skipInitialFilterLoad.current = false;
      return;
    }

    if (filters.city !== (searchTextRef.current.trim() || undefined)) {
      return;
    }

    void loadProperties(filters);
  }, [filters, loadProperties]);

  const handleSearchChange = useCallback((text: string) => {
    searchTextRef.current = text;
    setSearchText(text);
    requestId.current += 1;
  }, []);

  // -----------------------------------------------
  // Filters
  // -----------------------------------------------

  const handleApplyFilters = useCallback(
    (selectedFilters: PropertyFilters) => {
      const city = selectedFilters.city?.trim() || undefined;
      const nextSearchText = city ?? '';

      if (searchTextRef.current !== nextSearchText) {
        skipNextSearchDebounce.current = true;
        searchTextRef.current = nextSearchText;
        setSearchText(nextSearchText);
      }

      requestId.current += 1;
      setFilters({ ...selectedFilters, city });
      setFilterSheetVisible(false);
    },
    [],
  );

  const handleResetFilters = useCallback(() => {
    if (searchTextRef.current !== '') {
      skipNextSearchDebounce.current = true;
      searchTextRef.current = '';
      setSearchText('');
    }

    requestId.current += 1;
    setFilters({});
  }, []);

  const activeFilterCount = [
    filters.city,
    filters.minPrice,
    filters.maxPrice,
    filters.propertyType,
    filters.listingType,
  ].filter((value) => value !== undefined && value !== '').length;

  // -----------------------------------------------
  // Favorites
  // -----------------------------------------------

  const handleFavoritePress = useCallback(
    async (propertyId: string) => {
      try {
        const user = await getCurrentUser();

        if (!user) {
          router.push({
            pathname: '/login',
            params: { from: pathname },
          });
          return;
        }

        if (favoriteIds.has(propertyId)) {
          await removeFavorite(propertyId);
        } else {
          await addFavorite(propertyId);
        }
      } catch (error) {
        console.error('Unable to toggle favorite:', error);
      }
    },
    [addFavorite, favoriteIds, pathname, removeFavorite, router],
  );

  // -----------------------------------------------
  // Property card
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
            favorite={favoriteIds.has(item.id)}
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
    [favoriteIds, handleFavoritePress, router],
  );

  // -----------------------------------------------
  // Empty / loading / error states
  // -----------------------------------------------

  const listEmptyContent = loading ? (
    <View style={styles.listStateContainer}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.listStateTitle}>Finding properties</Text>
      <Text style={styles.listStateText}>
        Please wait while we discover available properties for you.
      </Text>
    </View>
  ) : loadError ? (
    <View style={styles.listStateContainer}>
      <View style={styles.stateIcon}>
        <Ionicons name="cloud-offline-outline" size={30} color={colors.error} />
      </View>
      <Text style={styles.listStateTitle}>Something went wrong</Text>
      <Text style={styles.listStateText}>{loadError}</Text>

      <Pressable
        accessibilityRole="button"
        onPress={() => {
          void loadProperties({
            ...filters,
            city: searchText.trim() || undefined,
          });
        }}
        style={styles.retryButton}
      >
        <Ionicons name="refresh-outline" size={18} color={colors.onPrimary} />
        <Text style={styles.retryButtonText}>Try again</Text>
      </Pressable>
    </View>
  ) : (
    <View style={styles.listStateContainer}>
      <View style={styles.stateIcon}>
        <Ionicons
          name="home-outline"
          size={30}
          color={colors.secondary}
        />
      </View>
      <Text style={styles.listStateTitle}>No properties found</Text>
      <Text style={styles.listStateText}>
        Try changing your search or removing some filters.
      </Text>

      {activeFilterCount > 0 && (
        <Pressable
          accessibilityRole="button"
          onPress={handleResetFilters}
          style={styles.retryButton}
        >
          <Text style={styles.retryButtonText}>Clear filters</Text>
        </Pressable>
      )}
    </View>
  );

  const listHeaderContent =
    properties.length > 0 && (loading || loadError) ? (
      <View style={styles.listFeedback}>
        {loading ? (
          <>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.listStateText}>Updating properties...</Text>
          </>
        ) : (
          <>
            <Text style={styles.errorText}>{loadError}</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                void loadProperties({
                  ...filters,
                  city: searchText.trim() || undefined,
                });
              }}
              style={styles.smallRetryButton}
            >
              <Text style={styles.smallRetryText}>Retry</Text>
            </Pressable>
          </>
        )}
      </View>
    ) : undefined;

  // -----------------------------------------------
  // Screen
  // -----------------------------------------------

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      {/* Top header */}
      <View style={styles.header}>
        <View style={styles.headerText}>
          <View style={styles.brandRow}>
            <View style={styles.brandIcon}>
              <AppLogo size={36} />
            </View>
            <Text style={styles.brandName}>DWELLIO</Text>
          </View>

          <Text style={styles.headerGreeting}>Find your next home</Text>
          <Text style={styles.headerTitle}>Discover places</Text>
        </View>

        <Pressable
          onPress={() => router.push('/notifications' as never)}
          style={styles.bellButton}
          accessibilityRole="button"
          accessibilityLabel="Notifications"
        >
          <Ionicons
            name="notifications-outline"
            size={23}
            color={colors.onBackground}
          />

          {unreadCount > 0 && (
            <View style={styles.bellBadge}>
              <Text style={styles.bellBadgeText}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </Text>
            </View>
          )}
        </Pressable>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons
          name="search-outline"
          size={21}
          color={colors.secondary}
        />

        <TextInput
          accessibilityLabel="Search properties by city"
          placeholder="Search by city..."
          placeholderTextColor={colors.secondary}
          returnKeyType="search"
          underlineColorAndroid="transparent"
          value={searchText}
          onChangeText={handleSearchChange}
          style={styles.searchInput}
        />

        {searchText.length > 0 && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Clear search"
            onPress={() => handleSearchChange('')}
            hitSlop={8}
          >
            <Ionicons
              name="close-circle"
              size={19}
              color={colors.secondary}
            />
          </Pressable>
        )}

        <View style={styles.searchDivider} />

        <Pressable
          accessibilityLabel="Open property filters"
          accessibilityRole="button"
          onPress={() => setFilterSheetVisible(true)}
          style={[
            styles.filterButton,
            activeFilterCount > 0 && styles.activeFilterButton,
          ]}
        >
          <Ionicons
            name="options-outline"
            size={21}
            color={
              activeFilterCount > 0
                ? colors.onPrimary
                : colors.primary
            }
          />

          {activeFilterCount > 0 && (
            <View style={styles.filterCountBadge}>
              <Text style={styles.filterCountText}>
                {activeFilterCount}
              </Text>
            </View>
          )}
        </Pressable>
      </View>

      {/* Results heading */}
      <View style={styles.sectionHeader}>
        <View style={styles.sectionHeadingText}>
          <Text style={styles.sectionEyebrow}>EXPLORE</Text>
          <Text style={styles.sectionTitle}>Nos propriétés</Text>
          <Text style={styles.sectionSubtitle}>
            Découvrez nos dernières annonces
          </Text>
        </View>

        <View style={styles.countBadge}>
          <Text style={styles.countText}>
            {loading ? '...' : `${properties.length} biens`}
          </Text>
        </View>
      </View>

      {/* Properties */}
      <FlatList
        data={properties}
        keyExtractor={(item) => item.id}
        renderItem={renderProperty}
        extraData={favoriteIds}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.listContent,
          properties.length === 0 && styles.emptyListContent,
        ]}
        ListHeaderComponent={listHeaderContent}
        ListEmptyComponent={listEmptyContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              void loadProperties(
                { ...filters, city: searchText.trim() || undefined },
                true,
              );
            }}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        initialNumToRender={4}
        windowSize={5}
      />

      {/* Filter sheet */}
      <PropertyFilterSheet
        visible={filterSheetVisible}
        filters={{
          ...filters,
          city: searchText.trim() || undefined,
        }}
        onClose={() => setFilterSheetVisible(false)}
        onApply={handleApplyFilters}
        onReset={handleResetFilters}
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
    paddingBottom: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  headerText: {
    flex: 1,
  },

  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },

  brandIcon: {
    width: 30,
    height: 30,
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
    ...typography.body,
    color: colors.secondary,
    marginBottom: spacing.xs,
  },

  headerTitle: {
    ...theme.fonts.headlineMedium,
    color: colors.onBackground,
  },

  bellButton: {
    position: 'relative',
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.outline,
    marginLeft: spacing.md,
  },

  bellBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 17,
    height: 17,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.error,
    borderRadius: radius.full,
    borderWidth: 2,
    borderColor: colors.surface,
  },

  bellBadgeText: {
    ...theme.fonts.labelSmall,
    color: colors.onPrimary,
    fontSize: 9,
    lineHeight: 12,
  },

  // Search
  searchContainer: {
    minHeight: 58,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.outline,
    borderRadius: radius.lg,
  },

  searchInput: {
    flex: 1,
    minHeight: 54,
    ...typography.body,
    color: colors.onBackground,
  },

  searchDivider: {
    width: 1,
    height: 27,
    backgroundColor: colors.outline,
  },

  filterButton: {
    position: 'relative',
    width: 39,
    height: 39,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
  },

  activeFilterButton: {
    backgroundColor: colors.primary,
  },

  filterCountBadge: {
    position: 'absolute',
    top: -3,
    right: -3,
    minWidth: 17,
    height: 17,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.error,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: colors.surface,
  },

  filterCountText: {
    ...theme.fonts.labelSmall,
    color: colors.onPrimary,
    fontSize: 9,
    lineHeight: 12,
  },

  // Section heading
  sectionHeader: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  sectionHeadingText: {
    flex: 1,
  },

  sectionEyebrow: {
    ...theme.fonts.labelSmall,
    color: colors.primary,
    letterSpacing: 1.5,
    marginBottom: spacing.xs,
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

  countBadge: {
    backgroundColor: colors.surfaceVariant,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    marginLeft: spacing.sm,
  },

  countText: {
    ...theme.fonts.labelMedium,
    color: colors.secondary,
  },

  // Properties
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

  // Loading / error / empty states
  listStateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl * 2,
    gap: spacing.md,
  },

  stateIcon: {
    width: 68,
    height: 68,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceVariant,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },

  listStateTitle: {
    ...theme.fonts.titleMedium,
    color: colors.onBackground,
    textAlign: 'center',
  },

  listStateText: {
    ...typography.body,
    color: colors.secondary,
    textAlign: 'center',
    lineHeight: 22,
  },

  listFeedback: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },

  errorText: {
    ...typography.body,
    color: colors.error,
    textAlign: 'center',
    flex: 1,
  },

  retryButton: {
    minHeight: 46,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    marginTop: spacing.sm,
  },

  retryButtonText: {
    ...theme.fonts.labelLarge,
    color: colors.onPrimary,
  },

  smallRetryButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
  },

  smallRetryText: {
    ...theme.fonts.labelMedium,
    color: colors.onPrimary,
  },
});