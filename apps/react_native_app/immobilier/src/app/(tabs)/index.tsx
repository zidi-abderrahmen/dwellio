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
import { theme, spacing, radius, typography } from '../../theme';
import { getCurrentUser } from '../../services/authService';
import { getFilteredProperties } from '../../services/propertyService';
import { useFavorite } from '../../context/FavoriteContext';
import type { PropertySearchResult } from '../../types/property';
import type { PropertyFilters } from '../../types/propertyFilters';

const colors = theme.colors;

// --------------------------------------------------
// Home Screen
// --------------------------------------------------

export default function HomeScreen() {
 const [properties, setProperties] = useState<PropertySearchResult[]>([]);
 const { favoriteIds, add: addFavorite, remove: removeFavorite, load: loadFavorites } =
 useFavorite();
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

 // -----------------------------------------------
 // Load properties from Supabase
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

 const handleApplyFilters = useCallback((selectedFilters: PropertyFilters) => {
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
 }, []);

 const handleResetFilters = useCallback(() => {
 if (searchTextRef.current !== '') {
 skipNextSearchDebounce.current = true;
 searchTextRef.current = '';
 setSearchText('');
 }

 requestId.current += 1;
 setFilters({});
 }, []);

 // -----------------------------------------------
 // Toggle Favorite
 // -----------------------------------------------

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
 void loadProperties({
 ...filters,
 city: searchText.trim() || undefined,
 });
 }}
 style={styles.retryButton}
 >
 <Text style={styles.retryButtonText}>Try again</Text>
 </Pressable>
 </View>
 ) : (
 <View style={styles.listStateContainer}>
 <Text style={styles.listStateText}>
 No properties match your search or filters.
 </Text>
 </View>
 );

 const activeFilterCount = [
 filters.city,
 filters.minPrice,
 filters.maxPrice,
 filters.propertyType,
 filters.listingType,
 ].filter((value) => value !== undefined && value !== '').length;

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
 style={styles.retryButton}
 >
 <Text style={styles.retryButtonText}>Try again</Text>
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

 <View style={styles.searchContainer}>
 <Ionicons name="search-outline" size={20} color={colors.secondary} />
 <TextInput
 accessibilityLabel="Search properties by city"
 placeholder="Search by city"
 placeholderTextColor={colors.secondary}
 returnKeyType="search"
 underlineColorAndroid="transparent"
 value={searchText}
 onChangeText={handleSearchChange}
 style={styles.searchInput}
 />
 <Pressable
 accessibilityLabel="Open property filters"
 accessibilityRole="button"
 onPress={() => setFilterSheetVisible(true)}
 style={styles.filterButton}
 >
 <Ionicons name="options-outline" size={22} color={colors.primary} />
 {activeFilterCount > 0 && (
 <View style={styles.filterCountBadge}>
 <Text style={styles.filterCountText}>{activeFilterCount}</Text>
 </View>
 )}
 </Pressable>
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
 <PropertyFilterSheet
 visible={filterSheetVisible}
 filters={{ ...filters, city: searchText.trim() || undefined }}
 onClose={() => setFilterSheetVisible(false)}
 onApply={handleApplyFilters}
 onReset={handleResetFilters}
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

 searchContainer: {
 minHeight: 48,
 marginHorizontal: spacing.lg,
 marginBottom: spacing.xl,
 paddingHorizontal: spacing.md,
 flexDirection: 'row',
 alignItems: 'center',
 gap: spacing.sm,
 backgroundColor: colors.surface,
 borderWidth: 1,
 borderColor: colors.outline,
 borderRadius: radius.md,
 },
 searchInput: {
 flex: 1,
 minHeight: 46,
 ...typography.body,
 color: colors.onBackground,
 },
 filterButton: {
 position: 'relative',
 width: 40,
 height: 40,
 alignItems: 'center',
 justifyContent: 'center',
 borderRadius: radius.sm,
 },
 filterCountBadge: {
 position: 'absolute',
 top: 0,
 right: 0,
 minWidth: 17,
 height: 17,
 paddingHorizontal: 4,
 alignItems: 'center',
 justifyContent: 'center',
 backgroundColor: colors.primary,
 borderRadius: radius.full,
 },
 filterCountText: {
 ...theme.fonts.labelSmall,
 color: colors.onPrimary,
 fontSize: 10,
 lineHeight: 14,
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
 listFeedback: {
 minHeight: 52,
 flexDirection: 'row',
 alignItems: 'center',
 justifyContent: 'center',
 gap: spacing.md,
 paddingHorizontal: spacing.lg,
 paddingVertical: spacing.sm,
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
