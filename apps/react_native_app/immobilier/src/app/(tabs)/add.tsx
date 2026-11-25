
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { theme, spacing, radius, typography } from '../../theme';
import {
  createProperty,
  getMyPropertyById,
  updateProperty,
  uploadPropertyImages,
} from '../../services/propertyService';
import type { Property } from '../../types/property';

import {
  FormSection,
  FormField,
  OptionField,
} from '../../components/form/FormPrimitives';

import { PhotoPicker } from '../../components/form/PhotoPicker';
import { LocationPicker } from '../../components/form/LocationPicker';
import { usePropertyImages } from '../../hooks/usePropertyImages';
import { useLocationPicker } from '../../hooks/useLocationPicker';

import {
  EMPTY_FORM_VALUES,
  MAX_DESCRIPTION_LENGTH,
  MAX_PROPERTY_IMAGES,
  listingTypes,
  propertyTypes,
  toPropertyFormValues,
  validatePropertyForm,
  formatPriceInput,
  type FormErrors,
  type PropertyFormValues,
} from '../../utils/propertyFormValidation';

const colors = theme.colors;

export default function AddScreen() {
  const { propertyId: routePropertyId } = useLocalSearchParams<{
    propertyId?: string | string[];
  }>();

  const invalidPropertyId = Array.isArray(routePropertyId);

  const propertyId =
    typeof routePropertyId === 'string'
      ? routePropertyId.trim()
      : undefined;

  return (
    <PropertyFormScreen
      key={invalidPropertyId ? 'invalid' : propertyId || 'new'}
      propertyId={propertyId}
      invalidPropertyId={invalidPropertyId}
    />
  );
}

function PropertyFormScreen({
  propertyId,
  invalidPropertyId,
}: {
  propertyId: string | undefined;
  invalidPropertyId: boolean;
}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const isEditing = propertyId !== undefined || invalidPropertyId;

  const initialLoadError =
    invalidPropertyId || (isEditing && !propertyId)
      ? 'The property ID is invalid.'
      : null;

  const [formValues, setFormValues] =
    useState<PropertyFormValues>(EMPTY_FORM_VALUES);

  const [errors, setErrors] = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(
    initialLoadError,
  );

  const [loading, setLoading] = useState(
    propertyId !== undefined && !initialLoadError,
  );

  const [submitting, setSubmitting] = useState(false);

  const [progress, setProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);

  const [savedProperty, setSavedProperty] = useState<Property | null>(null);

  const submissionInProgress = useRef(false);
  const savedPropertyRef = useRef<Property | null>(null);

  const {
    images,
    picking,
    message: photoMessage,
    pick: pickPhotos,
    remove: removePhoto,
    reset: resetPhotos,
    markUploaded,
    setMessage: setPhotoMessage,
    pickerInProgress,
  } = usePropertyImages({ maxImages: MAX_PROPERTY_IMAGES });

  const {
    location,
    error: locationError,
    locating,
    focusToken,
    set: setLocation,
    detect: detectLocation,
    setError: setLocationError,
  } = useLocationPicker();

  // -----------------------------------------------
  // Load existing property
  // -----------------------------------------------

  useEffect(() => {
    if (!propertyId || invalidPropertyId || initialLoadError) return;

    let cancelled = false;

    getMyPropertyById(propertyId)
      .then((property) => {
        if (cancelled) return;

        setFormValues(toPropertyFormValues(property));

        if (
          property.latitude != null &&
          property.longitude != null
        ) {
          setLocation(
            {
              latitude: property.latitude,
              longitude: property.longitude,
            },
            { animate: true },
          );
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setLoadError(
            err instanceof Error
              ? err.message
              : 'Unable to load this property for editing.',
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    propertyId,
    invalidPropertyId,
    initialLoadError,
    setLocation,
  ]);

  // -----------------------------------------------
  // Update form values
  // -----------------------------------------------

  const updateValue = useCallback(
    <K extends keyof PropertyFormValues>(
      key: K,
      value: PropertyFormValues[K],
    ) => {
      setFormValues((prev) => ({
        ...prev,
        [key]: value,
      }));

      setErrors((prev) => ({
        ...prev,
        [key]: undefined,
      }));

      setSubmitError(null);
    },
    [],
  );

  // -----------------------------------------------
  // Submit form
  // -----------------------------------------------

  const handleSubmit = async () => {
    if (
      submissionInProgress.current ||
      pickerInProgress.current
    ) {
      return;
    }

    const validation = validatePropertyForm(formValues);

    setErrors(validation.errors);
    setSubmitError(null);

    if (!validation.payload) return;

    if (!location) {
      setLocationError('Please tap the map to select a location.');
      return;
    }

    Keyboard.dismiss();

    submissionInProgress.current = true;
    setSubmitting(true);
    setProgress(null);
    setPhotoMessage(null);

    try {
      const propertyInput = {
        title: validation.payload.title,
        description: validation.payload.description,
        listing_type: validation.payload.listingType,
        property_type: validation.payload.propertyType,
        price: validation.payload.price,
        surface_m2: validation.payload.surface,
        rooms: validation.payload.rooms,
        bathrooms: validation.payload.bathrooms,
        city: validation.payload.city,
        address: validation.payload.address,
        latitude: location.latitude,
        longitude: location.longitude,
      };

      // -------------------------------------------
      // Edit existing property
      // -------------------------------------------

      if (propertyId) {
        await updateProperty(propertyId, propertyInput);

        Alert.alert(
          'Property updated',
          'Your listing has been updated successfully.',
          [
            {
              text: 'View property',
              onPress: () =>
                router.replace({
                  pathname: '/property/[id]',
                  params: { id: propertyId },
                }),
            },
            {
              text: 'My Listings',
              onPress: () => router.replace('/my-listings'),
            },
          ],
          { cancelable: false },
        );

        return;
      }

      // -------------------------------------------
      // Create property
      // -------------------------------------------

      let property = savedPropertyRef.current;

      if (!property) {
        property = await createProperty(propertyInput);

        savedPropertyRef.current = property;
        setSavedProperty(property);
      }

      // -------------------------------------------
      // Upload photos
      // -------------------------------------------

      const positioned = images.map((img, i) => ({
        ...img,
        position: img.position ?? i,
      }));

      const pending = positioned.filter(
        (img) => img.uploaded !== true,
      );

      if (pending.length > 0) {
        const results = await uploadPropertyImages(
          property.id,
          pending.map((img) => ({
            base64: img.base64,
            fileName: img.key,
            position: img.position,
            storagePath: img.storagePath,
            imageUrl: img.imageUrl,
          })),
          {
            totalPhotos: positioned.length,
            onProgress: (current, total) => {
              setProgress({ current, total });
            },
          },
        );

        markUploaded(results);
        setProgress(null);

        const failed = results.filter((r) => !r.uploaded);

        if (failed.length > 0) {
          const uploaded = results.filter(
            (r) => r.uploaded,
          ).length;

          setSubmitError(
            `Your property is saved. ${uploaded} of ${positioned.length} photos uploaded. Retry to try again.`,
          );

          return;
        }
      }

      // -------------------------------------------
      // Success
      // -------------------------------------------

      Alert.alert(
        'Property published',
        images.length > 0
          ? 'Your property and photos are now live.'
          : 'Your property is now live.',
        [
          {
            text: 'View property',
            onPress: () => {
              setFormValues(EMPTY_FORM_VALUES);
              setErrors({});
              resetPhotos();
              setSavedProperty(null);
              savedPropertyRef.current = null;

              router.push({
                pathname: '/property/[id]',
                params: { id: property!.id },
              });
            },
          },
        ],
        { cancelable: false },
      );
    } catch (err) {
      console.error('Failed to publish property:', err);

      const message =
        err instanceof Error
          ? err.message
          : 'Unable to publish the property. Please try again.';

      setProgress(null);

      setSubmitError(
        savedPropertyRef.current
          ? `Your property is saved. Retry uploading its photos. ${message}`
          : message,
      );
    } finally {
      submissionInProgress.current = false;
      setSubmitting(false);
    }
  };

  // -----------------------------------------------
  // Derived UI state
  // -----------------------------------------------

  const formDisabled =
    loading ||
    submitting ||
    picking ||
    savedProperty !== null;

  const busy = submitting || picking;

  // -----------------------------------------------
  // Header
  // -----------------------------------------------

  const header = (
    <View style={styles.header}>
      <Pressable
        accessibilityLabel="Go back"
        accessibilityRole="button"
        onPress={() =>
          router.canGoBack()
            ? router.back()
            : router.replace('/')
        }
        style={styles.backButton}
      >
        <Ionicons
          name="arrow-back"
          size={22}
          color={colors.onBackground}
        />
      </Pressable>

      <View style={styles.headerText}>
        <Text style={styles.headerTitle}>
          {isEditing ? 'Edit Property' : 'Add Property'}
        </Text>

        <Text style={styles.headerSubtitle}>
          {isEditing
            ? 'Update your property details'
            : 'Create your property listing'}
        </Text>
      </View>

      <View
        style={[
          styles.modeBadge,
          isEditing && styles.editModeBadge,
        ]}
      >
        <Ionicons
          name={isEditing ? 'create-outline' : 'add-outline'}
          size={14}
          color={colors.primary}
        />

        <Text style={styles.modeBadgeText}>
          {isEditing ? 'EDIT' : 'NEW'}
        </Text>
      </View>
    </View>
  );

  // -----------------------------------------------
  // Load error
  // -----------------------------------------------

  if (loadError) {
    return (
      <SafeAreaView
        style={styles.container}
        edges={['top']}
      >
        <StatusBar style="dark" />

        {header}

        <View style={styles.loadState}>
          <View style={styles.stateIcon}>
            <Ionicons
              name="alert-circle-outline"
              size={34}
              color={colors.error}
            />
          </View>

          <Text style={styles.stateTitle}>
            Unable to open property
          </Text>

          <Text style={styles.loadStateText}>
            {loadError}
          </Text>

          <Pressable
            accessibilityRole="button"
            onPress={() => router.replace('/my-listings')}
            style={styles.primaryButton}
          >
            <Text style={styles.primaryButtonText}>
              Back to My Listings
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // -----------------------------------------------
  // Main screen
  // -----------------------------------------------

  return (
    <SafeAreaView
      style={styles.container}
      edges={['top']}
    >
      <StatusBar style="dark" />

      {header}

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.kav}
        keyboardVerticalOffset={0}
      >
        {loading ? (
          <View style={styles.loadState}>
            <ActivityIndicator
              size="large"
              color={colors.primary}
            />

            <Text style={styles.loadStateText}>
              Loading property...
            </Text>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={[
              styles.scrollContent,
              {
                paddingBottom:
                  spacing.xxl + 96 + insets.bottom,
              },
            ]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
          >
            {/* Intro */}
            <View style={styles.introCard}>
              <View style={styles.introIcon}>
                <Ionicons
                  name="home-outline"
                  size={25}
                  color={colors.onPrimary}
                />
              </View>

              <View style={styles.introText}>
                <Text style={styles.introTitle}>
                  {isEditing
                    ? 'Keep your listing up to date'
                    : 'Let your property stand out'}
                </Text>

                <Text style={styles.introSubtitle}>
                  {isEditing
                    ? 'Review your information and save your changes.'
                    : 'Complete the details below to publish your property.'}
                </Text>
              </View>
            </View>

            {/* Basic information */}
            <FormSection
              icon="document-text-outline"
              title="Basic Information"
              subtitle="What are you listing?"
            >
              <FormField
                label="Title"
                error={errors.title}
              >
                <TextInput
                  accessibilityLabel="Property title"
                  autoCapitalize="sentences"
                  editable={!formDisabled}
                  maxLength={120}
                  onChangeText={(v) => updateValue('title', v)}
                  placeholder="Modern apartment in Tozeur"
                  placeholderTextColor={colors.secondary}
                  returnKeyType="next"
                  style={styles.input}
                  value={formValues.title}
                />
              </FormField>

              <OptionField
                label="Property Type"
                error={errors.propertyType}
                options={propertyTypes}
                selected={formValues.propertyType}
                disabled={formDisabled}
                onSelect={(v) =>
                  updateValue('propertyType', v)
                }
              />

              <OptionField
                label="Listing Type"
                error={errors.listingType}
                options={listingTypes}
                selected={formValues.listingType}
                disabled={formDisabled}
                onSelect={(v) =>
                  updateValue('listingType', v)
                }
              />
            </FormSection>

            {/* Pricing */}
            <FormSection
              icon="pricetag-outline"
              title="Pricing"
              subtitle="Set the price for your listing"
            >
              <FormField
                label="Price"
                error={errors.price}
                hint="Amount in Tunisian Dinar (TND)"
              >
                <View style={styles.inputWithPrefix}>
                  <Text style={styles.inputPrefix}>
                    TND
                  </Text>

                  <TextInput
                    accessibilityLabel="Price in TND"
                    editable={!formDisabled}
                    keyboardType="decimal-pad"
                    onChangeText={(v) =>
                      updateValue('price', formatPriceInput(v))
                    }
                    placeholder="0"
                    placeholderTextColor={colors.secondary}
                    style={styles.inputInner}
                    value={formValues.price}
                  />
                </View>
              </FormField>
            </FormSection>

            {/* Property details */}
            <FormSection
              icon="home-outline"
              title="Property Details"
              subtitle="Describe the space"
            >
              <FormField
                label="City"
                error={errors.city}
              >
                <TextInput
                  accessibilityLabel="City"
                  autoCapitalize="words"
                  editable={!formDisabled}
                  onChangeText={(v) => updateValue('city', v)}
                  placeholder="Tozeur"
                  placeholderTextColor={colors.secondary}
                  returnKeyType="next"
                  style={styles.input}
                  value={formValues.city}
                />
              </FormField>

              <FormField
                label="Address"
                hint="Optional"
              >
                <TextInput
                  accessibilityLabel="Property address"
                  autoCapitalize="words"
                  editable={!formDisabled}
                  onChangeText={(v) => updateValue('address', v)}
                  placeholder="Street or neighborhood"
                  placeholderTextColor={colors.secondary}
                  returnKeyType="next"
                  style={styles.input}
                  value={formValues.address}
                />
              </FormField>

              <View style={styles.row}>
                <View style={styles.flex1}>
                  <FormField
                    label="Surface (m²)"
                    error={errors.surface}
                  >
                    <TextInput
                      accessibilityLabel="Surface in square metres"
                      editable={!formDisabled}
                      keyboardType="number-pad"
                      onChangeText={(v) =>
                        updateValue('surface', v)
                      }
                      placeholder="95"
                      placeholderTextColor={colors.secondary}
                      style={styles.input}
                      value={formValues.surface}
                    />
                  </FormField>
                </View>

                <View style={styles.flex1}>
                  <FormField
                    label="Rooms"
                    error={errors.rooms}
                  >
                    <TextInput
                      accessibilityLabel="Number of rooms"
                      editable={!formDisabled}
                      keyboardType="number-pad"
                      onChangeText={(v) =>
                        updateValue('rooms', v)
                      }
                      placeholder="3"
                      placeholderTextColor={colors.secondary}
                      style={styles.input}
                      value={formValues.rooms}
                    />
                  </FormField>
                </View>
              </View>

              <FormField
                label="Bathrooms"
                hint="Optional"
                error={errors.bathrooms}
              >
                <TextInput
                  accessibilityLabel="Number of bathrooms"
                  editable={!formDisabled}
                  keyboardType="number-pad"
                  onChangeText={(v) =>
                    updateValue('bathrooms', v)
                  }
                  placeholder="2"
                  placeholderTextColor={colors.secondary}
                  style={styles.input}
                  value={formValues.bathrooms}
                />
              </FormField>

              <FormField
                label="Description"
                hint="Optional"
                accessory={
                  <Text style={styles.charCount}>
                    {formValues.description.length} / {MAX_DESCRIPTION_LENGTH}
                  </Text>
                }
              >
                <TextInput
                  accessibilityLabel="Property description"
                  editable={!formDisabled}
                  maxLength={MAX_DESCRIPTION_LENGTH}
                  multiline
                  onChangeText={(v) =>
                    updateValue('description', v)
                  }
                  placeholder="Describe the property, its features and surroundings..."
                  placeholderTextColor={colors.secondary}
                  style={[
                    styles.input,
                    styles.descriptionInput,
                  ]}
                  textAlignVertical="top"
                  value={formValues.description}
                />
              </FormField>
            </FormSection>

            {/* Location */}
            <FormSection
              icon="location-outline"
              title="Location"
              subtitle="Drop a pin where the property is"
            >
              <LocationPicker
                location={location}
                error={locationError}
                locating={locating}
                focusToken={focusToken}
                disabled={formDisabled}
                onSelect={setLocation}
                onDetect={detectLocation}
              />
            </FormSection>

            {/* Photos */}
            {!isEditing ? (
              <FormSection
                icon="images-outline"
                title="Photos"
                subtitle={`Up to ${MAX_PROPERTY_IMAGES} photos · first becomes the cover`}
              >
                <PhotoPicker
                  images={images}
                  maxImages={MAX_PROPERTY_IMAGES}
                  picking={picking}
                  message={photoMessage}
                  disabled={formDisabled}
                  progress={progress}
                  onPick={() => void pickPhotos()}
                  onRemove={removePhoto}
                />
              </FormSection>
            ) : null}
          </ScrollView>
        )}

        {/* Fixed bottom action */}
        {!loading ? (
          <View
            style={[
              styles.footer,
              {
                paddingBottom: Math.max(
                  insets.bottom,
                  spacing.md,
                ),
              },
            ]}
          >
            {submitError ? (
              <View style={styles.errorBanner}>
                <Ionicons
                  name="alert-circle"
                  size={19}
                  color={colors.error}
                />

                <Text style={styles.errorBannerText}>
                  {submitError}
                </Text>
              </View>
            ) : null}

            {progress ? (
              <View style={styles.progressContainer}>
                <View style={styles.progressHeader}>
                  <Text style={styles.progressLabel}>
                    Uploading photos
                  </Text>

                  <Text style={styles.progressValue}>
                    {progress.current} / {progress.total}
                  </Text>
                </View>

                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${
                          progress.total > 0
                            ? (progress.current / progress.total) * 100
                            : 0
                        }%`,
                      },
                    ]}
                  />
                </View>
              </View>
            ) : null}

            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: busy }}
              disabled={busy}
              onPress={() => void handleSubmit()}
              style={[
                styles.primaryButton,
                busy && styles.disabledButton,
              ]}
            >
              {submitting ? (
                <ActivityIndicator color={colors.onPrimary} />
              ) : (
                <>
                  <Ionicons
                    name={
                      isEditing
                        ? 'save-outline'
                        : 'cloud-upload-outline'
                    }
                    size={20}
                    color={colors.onPrimary}
                  />

                  <Text style={styles.primaryButtonText}>
                    {savedProperty
                      ? 'Retry photo upload'
                      : isEditing
                        ? 'Save Changes'
                        : 'Publish Property'}
                  </Text>

                  {!savedProperty && (
                    <Ionicons
                      name="arrow-forward"
                      size={18}
                      color={colors.onPrimary}
                    />
                  )}
                </>
              )}
            </Pressable>
          </View>
        ) : null}
      </KeyboardAvoidingView>
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
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.outlineVariant,
    backgroundColor: colors.background,
  },

  backButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
    backgroundColor: colors.surfaceVariant,
  },

  headerText: {
    flex: 1,
  },

  headerTitle: {
    ...theme.fonts.titleLarge,
    color: colors.onBackground,
  },

  headerSubtitle: {
    ...typography.caption,
    color: colors.secondary,
    marginTop: 2,
  },

  modeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceVariant,
  },

  editModeBadge: {
    backgroundColor: colors.surfaceVariant,
  },

  modeBadgeText: {
    ...theme.fonts.labelSmall,
    color: colors.primary,
    letterSpacing: 0.8,
  },

  kav: {
    flex: 1,
  },

  // Scroll content
  scrollContent: {
    gap: spacing.xl,
    padding: spacing.lg,
  },

  // Intro card
  introCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceVariant,
  },

  introIcon: {
    width: 50,
    height: 50,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  introText: {
    flex: 1,
    gap: spacing.xs,
  },

  introTitle: {
    ...theme.fonts.titleSmall,
    color: colors.onBackground,
  },

  introSubtitle: {
    ...typography.caption,
    color: colors.secondary,
    lineHeight: 19,
  },

  // Inputs
  input: {
    minHeight: 52,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.outline,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    ...typography.body,
    color: colors.onBackground,
  },

  descriptionInput: {
    minHeight: 125,
    paddingTop: spacing.md,
    lineHeight: 22,
  },

  inputWithPrefix: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.outline,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    paddingLeft: spacing.md,
  },

  inputPrefix: {
    ...theme.fonts.titleSmall,
    color: colors.primary,
    marginRight: spacing.sm,
  },

  inputInner: {
    flex: 1,
    minHeight: 52,
    paddingRight: spacing.md,
    ...typography.body,
    color: colors.onBackground,
  },

  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },

  flex1: {
    flex: 1,
  },

  charCount: {
    ...typography.caption,
    color: colors.secondary,
  },

  // Loading / error states
  loadState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.lg,
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

  loadStateText: {
    ...typography.body,
    color: colors.secondary,
    textAlign: 'center',
    lineHeight: 22,
  },

  // Footer
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.outlineVariant,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: colors.background,
    gap: spacing.sm,
  },

  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: 54,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
  },

  primaryButtonText: {
    ...theme.fonts.labelLarge,
    color: colors.onPrimary,
  },

  disabledButton: {
    opacity: 0.6,
  },

  // Error banner
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceVariant,
    borderWidth: 1,
    borderColor: colors.error,
  },

  errorBannerText: {
    ...typography.caption,
    color: colors.error,
    flex: 1,
    lineHeight: 19,
  },

  // Upload progress
  progressContainer: {
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },

  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  progressLabel: {
    ...theme.fonts.labelMedium,
    color: colors.onBackground,
  },

  progressValue: {
    ...theme.fonts.labelMedium,
    color: colors.primary,
  },

  progressTrack: {
    height: 6,
    borderRadius: radius.full,
    overflow: 'hidden',
    backgroundColor: colors.surfaceVariant,
  },

  progressFill: {
    height: '100%',
    borderRadius: radius.full,
    backgroundColor: colors.primary,
  },
});