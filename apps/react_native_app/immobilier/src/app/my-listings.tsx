import React, { useCallback, useRef, useState } from 'react';
import {
  Alert,
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
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Snackbar } from 'react-native-paper';

import { PropertyCard } from '../components/PropertyCard';
import { deleteProperty, getMyProperties } from '../services/propertyService';
import type { PropertySearchResult } from '../types/property';
import { radius, spacing, theme, typography } from '../theme';

const colors = theme.colors;

function getStatusLabel(status: PropertySearchResult['status']): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function getListingTypeLabel(
  listingType: PropertySearchResult['listing_type'],
): string {
  return listingType === 'sale' ? 'For sale' : 'For rent';
}

export default function MyListingsScreen() {
  const router = useRouter();
  const [properties, setProperties] = useState<PropertySearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [deletingPropertyId, setDeletingPropertyId] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const isMounted = useRef(false);
  const requestId = useRef(0);

  const loadProperties = useCallback(async (isRefresh = false) => {
    const currentRequestId = ++requestId.current;

    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setLoadError(null);

    try {
      const result = await getMyProperties();

      if (isMounted.current && requestId.current === currentRequestId) {
        setProperties(result);
      }
    } catch (error) {
      console.error('Failed to load your properties:', error);

      if (isMounted.current && requestId.current === currentRequestId) {
        setLoadError('Unable to load your properties. Please try again.');
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

  const handleDeleteProperty = useCallback(
    async (property: PropertySearchResult) => {
      setDeletingPropertyId(property.id);

      try {
        await deleteProperty(property.id);

        if (!isMounted.current) {
          return;
        }

        await loadProperties(true);
        if (isMounted.current) {
          setFeedbackMessage(`"${property.title}" was deleted.`);
        }
      } catch (error) {
        console.error('Failed to delete property:', error);
        if (isMounted.current) {
          setFeedbackMessage(
            error instanceof Error
              ? error.message
              : 'Unable to delete the property. Please try again.',
          );
        }
      } finally {
        if (isMounted.current) {
          setDeletingPropertyId(null);
        }
      }
    },
    [loadProperties],
  );

  const confirmDeleteProperty = useCallback(
    (property: PropertySearchResult) => {
      Alert.alert(
        'Delete listing?',
        `This will permanently delete "${property.title}". This action cannot be undone.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => void handleDeleteProperty(property),
          },
        ],
        { cancelable: true },
      );
    },
    [handleDeleteProperty],
  );

  const renderProperty = useCallback(
    ({ item }: ListRenderItemInfo<PropertySearchResult>) => {
      const firstImageUrl = item.property_images[0]?.image_url;
      const isDeleting = deletingPropertyId === item.id;

      return (
        <View style={styles.cardContainer}>
          <PropertyCard
            property={item}
            image={firstImageUrl ? { uri: firstImageUrl } : null}
            currencyLabel="DT"
            period={item.listing_type === 'rent' ? '/ mois' : undefined}
            onPress={() =>
              router.push({
                pathname: '/property/[id]',
                params: { id: item.id },
              })
            }
          />
          <View style={styles.badgesRow}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {getListingTypeLabel(item.listing_type)}
              </Text>
            </View>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{getStatusLabel(item.status)}</Text>
            </View>
          </View>
          <View style={styles.actionsRow}>
            <Pressable
              accessibilityLabel={`Edit ${item.title}`}
              accessibilityRole="button"
              accessibilityState={{ disabled: deletingPropertyId !== null }}
              disabled={deletingPropertyId !== null}
              onPress={() =>
                router.push({
                  pathname: '/add',
                  params: { propertyId: item.id },
                })
              }
              style={[
                styles.editButton,
                deletingPropertyId !== null && styles.disabledButton,
              ]}
            >
              <Ionicons
                name="create-outline"
                size={18}
                color={colors.primary}
              />
              <Text style={styles.editButtonText}>Edit</Text>
            </Pressable>
            <Pressable
              accessibilityLabel={`Delete ${item.title}`}
              accessibilityRole="button"
              accessibilityState={{ disabled: deletingPropertyId !== null }}
              disabled={deletingPropertyId !== null}
              onPress={() => confirmDeleteProperty(item)}
              style={[
                styles.deleteButton,
                deletingPropertyId !== null && styles.disabledButton,
              ]}
            >
              {isDeleting ? (
                <ActivityIndicator size="small" color={colors.error} />
              ) : (
                <>
                  <Ionicons
                    name="trash-outline"
                    size={18}
                    color={colors.error}
                  />
                  <Text style={styles.deleteButtonText}>Delete</Text>
                </>
              )}
            </Pressable>
          </View>
        </View>
      );
    },
    [confirmDeleteProperty, deletingPropertyId, router],
  );

  const listEmptyContent = loading ? (
    <View style={styles.stateContainer}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.stateText}>Loading your listings...</Text>
    </View>
  ) : loadError ? (
    <View style={styles.stateContainer}>
      <Text style={styles.errorText}>{loadError}</Text>
      <Pressable
        accessibilityRole="button"
        onPress={() => void loadProperties()}
        style={styles.primaryButton}
      >
        <Text style={styles.primaryButtonText}>Try again</Text>
      </Pressable>
    </View>
  ) : (
    <View style={styles.stateContainer}>
      <Text style={styles.emptyTitle}>No listings yet</Text>
      <Text style={styles.stateText}>
        Properties you publish will appear here.
      </Text>
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/add')}
        style={styles.primaryButton}
      >
        <Text style={styles.primaryButtonText}>Publish a property</Text>
      </Pressable>
    </View>
  );

  const listHeaderContent =
    properties.length > 0 && (loading || loadError) ? (
      <View style={styles.listFeedback}>
        {loading ? (
          <>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.stateText}>Updating your listings...</Text>
          </>
        ) : (
          <>
            <Text accessibilityRole="alert" style={styles.errorText}>
              {loadError}
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => void loadProperties()}
              style={styles.primaryButton}
            >
              <Text style={styles.primaryButtonText}>Try again</Text>
            </Pressable>
          </>
        )}
      </View>
    ) : undefined;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>My Listings</Text>
          <Text style={styles.subtitle}>Manage your property listings</Text>
        </View>
        <Text style={styles.count}>
          {loading
            ? '...'
            : `${properties.length} ${properties.length === 1 ? 'listing' : 'listings'}`}
        </Text>
      </View>

      <FlatList
        data={properties}
        keyExtractor={(item) => item.id}
        renderItem={renderProperty}
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
            onRefresh={() => void loadProperties(true)}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        initialNumToRender={4}
        windowSize={5}
      />
      <Snackbar
        visible={feedbackMessage !== null}
        onDismiss={() => setFeedbackMessage(null)}
        duration={4000}
      >
        {feedbackMessage ?? ''}
      </Snackbar>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    minHeight: 88,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    ...theme.fonts.titleLarge,
    color: colors.primary,
  },
  subtitle: {
    ...typography.body,
    marginTop: spacing.xs,
    color: colors.secondary,
  },
  count: {
    ...theme.fonts.labelMedium,
    color: colors.secondary,
  },
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
  badgesRow: {
    width: 328,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  badge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceVariant,
  },
  badgeText: {
    ...theme.fonts.labelMedium,
    color: colors.secondary,
    textTransform: 'capitalize',
  },
  actionsRow: {
    width: 328,
    marginTop: spacing.sm,
    flexDirection: 'row',
    gap: spacing.sm,
  },
  editButton: {
    flex: 1,
    minHeight: 44,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  editButtonText: {
    ...theme.fonts.labelLarge,
    color: colors.primary,
  },
  deleteButton: {
    flex: 1,
    minHeight: 44,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.error,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  deleteButtonText: {
    ...theme.fonts.labelLarge,
    color: colors.error,
  },
  disabledButton: {
    opacity: 0.6,
  },
  listFeedback: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  stateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xxl,
    gap: spacing.md,
  },
  stateText: {
    ...typography.body,
    color: colors.secondary,
    textAlign: 'center',
  },
  emptyTitle: {
    ...theme.fonts.titleLarge,
    color: colors.onBackground,
    textAlign: 'center',
  },
  errorText: {
    ...typography.body,
    color: colors.error,
    textAlign: 'center',
  },
  primaryButton: {
    minHeight: 44,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.md,
  },
  primaryButtonText: {
    ...theme.fonts.labelLarge,
    color: colors.onPrimary,
  },
});
