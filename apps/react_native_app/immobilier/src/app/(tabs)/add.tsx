import React, { useRef, useState } from 'react';
import {
  Alert,
  ActivityIndicator,
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';

import { theme, spacing, radius, typography } from '../../theme';
import {
  createProperty,
  uploadPropertyImages,
} from '../../services/propertyService';
import type { ListingType, Property, PropertyType } from '../../types/property';
import type { PropertyImageUploadResult } from '../../services/propertyService';

const colors = theme.colors;
const MAX_PROPERTY_IMAGES = 5;

interface PickedPropertyImage {
  key: string;
  uri: string;
  base64: string;
  position?: number;
  storagePath?: string;
  imageUrl?: string;
  uploaded?: boolean;
}

const propertyTypes: { value: PropertyType; label: string }[] = [
  { value: 'apartment', label: 'Apartment' },
  { value: 'house', label: 'House' },
  { value: 'villa', label: 'Villa' },
  { value: 'land', label: 'Land' },
  { value: 'office', label: 'Office' },
  { value: 'shop', label: 'Shop' },
];

const listingTypes: { value: ListingType; label: string }[] = [
  { value: 'sale', label: 'Sale' },
  { value: 'rent', label: 'Rent' },
];

type FormField =
  | 'title'
  | 'propertyType'
  | 'listingType'
  | 'price'
  | 'city'
  | 'surface'
  | 'rooms';

type FormErrors = Partial<Record<FormField, string>>;

interface PropertyFormValues {
  title: string;
  propertyType: PropertyType | null;
  listingType: ListingType | null;
  price: string;
  city: string;
  description: string;
  surface: string;
  rooms: string;
}

interface ValidatedPropertyForm {
  errors: FormErrors;
  payload: {
    title: string;
    propertyType: PropertyType;
    listingType: ListingType;
    price: number;
    city: string;
    description: string | null;
    surface: number | null;
    rooms: number | null;
  } | null;
}

function parsePrice(value: string): number | undefined {
  const priceText = value.trim();
  if (!/^\d+(?:\.\d{1,2})?$/.test(priceText)) {
    return undefined;
  }

  const price = Number(priceText);
  return Number.isFinite(price) && price <= 9999999999.99
    ? price
    : undefined;
}

function parseOptionalInteger(value: string): number | null | undefined {
  const trimmedValue = value.trim();
  if (!trimmedValue) {
    return null;
  }

  if (!/^\d+$/.test(trimmedValue)) {
    return undefined;
  }

  const parsedValue = Number(trimmedValue);
  return Number.isSafeInteger(parsedValue) && parsedValue <= 2147483647
    ? parsedValue
    : undefined;
}

function validatePropertyForm(
  values: PropertyFormValues,
): ValidatedPropertyForm {
  const title = values.title.trim();
  const city = values.city.trim();
  const price = parsePrice(values.price);
  const surface = parseOptionalInteger(values.surface);
  const rooms = parseOptionalInteger(values.rooms);
  const errors: FormErrors = {};

  if (title.length < 3 || title.length > 120) {
    errors.title = 'Enter a title between 3 and 120 characters.';
  }
  if (!values.propertyType) {
    errors.propertyType = 'Select a property type.';
  }
  if (!values.listingType) {
    errors.listingType = 'Select a listing type.';
  }
  if (price === undefined) {
    errors.price = 'Enter a valid non-negative price (up to 2 decimals).';
  }
  if (!city) {
    errors.city = 'Enter a city.';
  }
  if (surface === undefined || surface === 0) {
    errors.surface = 'Surface must be a positive whole number.';
  }
  if (rooms === undefined) {
    errors.rooms = 'Rooms must be a non-negative whole number.';
  }

  if (
    Object.keys(errors).length > 0 ||
    !values.propertyType ||
    !values.listingType ||
    price === undefined
  ) {
    return { errors, payload: null };
  }

  return {
    errors,
    payload: {
      title,
      propertyType: values.propertyType,
      listingType: values.listingType,
      price,
      city,
      description: values.description.trim() || null,
      surface: surface ?? null,
      rooms: rooms ?? null,
    },
  };
}

export default function AddScreen() {
  const router = useRouter();
  const [formValues, setFormValues] = useState<PropertyFormValues>({
    title: '',
    propertyType: null,
    listingType: null,
    price: '',
    city: '',
    description: '',
    surface: '',
    rooms: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [photoSelectionMessage, setPhotoSelectionMessage] = useState<
    string | null
  >(null);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [uploadSummary, setUploadSummary] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [pickingImages, setPickingImages] = useState(false);
  const [pickedImages, setPickedImages] = useState<PickedPropertyImage[]>([]);
  const [savedProperty, setSavedProperty] = useState<Property | null>(null);
  const submissionInProgress = useRef(false);
  const imagePickerInProgress = useRef(false);
  const imageSequence = useRef(0);
  const savedPropertyRef = useRef<Property | null>(null);

  const updateFormValue = <K extends keyof PropertyFormValues>(
    key: K,
    value: PropertyFormValues[K],
  ) => {
    setFormValues((previous) => ({ ...previous, [key]: value }));
    setErrors((previous) => ({ ...previous, [key]: undefined }));
    setSubmitError(null);
  };

  const handleSubmit = async () => {
    if (submissionInProgress.current || imagePickerInProgress.current) {
      return;
    }

    const validation = validatePropertyForm(formValues);
    setErrors(validation.errors);
    setSubmitError(null);
    if (!validation.payload) {
      return;
    }

    Keyboard.dismiss();
    submissionInProgress.current = true;
    setSubmitting(true);
    setUploadProgress(null);
    setUploadSummary(null);
    setPhotoSelectionMessage(null);

    try {
      let property = savedPropertyRef.current;
      if (property === null) {
        property = await createProperty({
          title: validation.payload.title,
          description: validation.payload.description,
          listing_type: validation.payload.listingType,
          property_type: validation.payload.propertyType,
          price: validation.payload.price,
          surface_m2: validation.payload.surface,
          rooms: validation.payload.rooms,
          city: validation.payload.city,
        });
        savedPropertyRef.current = property;
        setSavedProperty(property);
      }

      const positionedImages = pickedImages.map((image, position) => ({
        ...image,
        position: image.position ?? position,
      }));
      setPickedImages(positionedImages);

      const pendingImages = positionedImages.filter(
        (image) => image.uploaded !== true,
      );
      if (pendingImages.length > 0) {
        const results = await uploadPropertyImages(
          property.id,
          pendingImages.map((image) => ({
            base64: image.base64,
            fileName: image.key,
            position: image.position,
            storagePath: image.storagePath,
            imageUrl: image.imageUrl,
          })),
          {
            totalPhotos: positionedImages.length,
            onProgress: (photoNumber, totalPhotos) =>
              setUploadProgress(
                `Uploading photo ${photoNumber} of ${totalPhotos}...`,
              ),
          },
        );

        const resultsByFileName = new Map<string, PropertyImageUploadResult>(
          results.map((result) => [result.fileName, result]),
        );
        setPickedImages((currentImages) =>
          currentImages.map((image) => {
            const result = resultsByFileName.get(image.key);
            if (!result) {
              return image;
            }

            return {
              ...image,
              position: result.position,
              uploaded: result.uploaded,
              storagePath: result.storagePath ?? image.storagePath,
              imageUrl: result.imageUrl ?? image.imageUrl,
            };
          }),
        );
        setUploadProgress(null);

        const uploadedCount = positionedImages.filter(
          (image) =>
            image.uploaded === true ||
            resultsByFileName.get(image.key)?.uploaded === true,
        ).length;
        const failedResults = results.filter((result) => !result.uploaded);

        if (failedResults.length > 0) {
          setUploadSummary(
            `Uploaded ${uploadedCount} of ${positionedImages.length} photos. ${failedResults.length} failed.`,
          );
          setSubmitError(
            `Your property is saved. Retry the failed photo uploads. ${failedResults
              .map(
                (result) =>
                  `Photo ${result.position + 1}: ${result.error ?? 'Upload failed.'}`,
              )
              .join(' ')}`,
          );
          return;
        }
      }

      setSubmitError(null);
      Alert.alert(
        'Property published',
        pickedImages.length > 0
          ? 'Your property and photos were published successfully.'
          : 'Your property was published successfully.',
        [
          {
            text: 'View property',
            onPress: () =>
              router.replace({
                pathname: '/property/[id]',
                params: { id: property.id },
              }),
          },
        ],
        { cancelable: false },
      );
    } catch (error) {
      console.error('Failed to publish property:', error);
      const message =
        error instanceof Error
          ? error.message
          : 'Unable to publish the property. Please try again.';
      setUploadProgress(null);
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

  const pickPropertyImages = async () => {
    if (
      savedPropertyRef.current !== null ||
      submissionInProgress.current ||
      imagePickerInProgress.current
    ) {
      return;
    }

    imagePickerInProgress.current = true;
    setPickingImages(true);
    setPhotoSelectionMessage(null);

    try {
      const remainingSlots = MAX_PROPERTY_IMAGES - pickedImages.length;
      if (remainingSlots <= 0) {
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        selectionLimit: MAX_PROPERTY_IMAGES,
        quality: 0.6,
        base64: true,
      });

      if (result.canceled) {
        return;
      }

      const selectedAssets = result.assets.slice(0, remainingSlots);
      const selectedImages = selectedAssets.map((asset) => {
        if (!asset.base64) {
          throw new Error('The selected photo could not be read.');
        }

        const key = `${Date.now()}-${imageSequence.current}`;
        imageSequence.current += 1;

        return {
          key,
          uri: asset.uri,
          base64: asset.base64,
        };
      });

      setPickedImages((previous) =>
        [...previous, ...selectedImages].slice(0, MAX_PROPERTY_IMAGES),
      );
      setSubmitError(null);
      const omittedCount = result.assets.length - selectedAssets.length;
      if (omittedCount > 0) {
        setPhotoSelectionMessage(
          `Only ${selectedAssets.length} additional photo${selectedAssets.length === 1 ? '' : 's'} were added. ${omittedCount} extra photo${omittedCount === 1 ? '' : 's'} were not added; the maximum is ${MAX_PROPERTY_IMAGES}.`,
        );
      }
    } catch (error) {
      console.error('Failed to select property photos:', error);
      setPhotoSelectionMessage(
        error instanceof Error
          ? error.message
          : 'Unable to select photos. Please try again.',
      );
    } finally {
      imagePickerInProgress.current = false;
      setPickingImages(false);
    }
  };

  const removePickedImage = (key: string) => {
    if (
      savedPropertyRef.current !== null ||
      submissionInProgress.current ||
      imagePickerInProgress.current
    ) {
      return;
    }

    setPickedImages((previous) =>
      previous.filter((image) => image.key !== key),
    );
    setPhotoSelectionMessage(null);
  };

  const formDisabled =
    submitting || pickingImages || savedProperty !== null;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <View style={styles.header}>
          <Pressable
            accessibilityLabel="Go back"
            accessibilityRole="button"
            onPress={() =>
              router.canGoBack() ? router.back() : router.replace('/')
            }
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={22} color={colors.onSurface} />
          </Pressable>
          <Text style={styles.headerTitle}>Add Property</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          contentContainerStyle={styles.form}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <FormField label="Title" error={errors.title}>
            <TextInput
              accessibilityLabel="Property title"
              autoCapitalize="sentences"
              editable={!formDisabled}
              maxLength={120}
              onChangeText={(value) => updateFormValue('title', value)}
              placeholder="Modern apartment in Tozeur"
              placeholderTextColor={colors.secondary}
              returnKeyType="next"
              style={styles.input}
              value={formValues.title}
            />
          </FormField>

          <OptionField
            error={errors.propertyType}
            label="Property Type"
            options={propertyTypes}
            selected={formValues.propertyType}
            disabled={formDisabled}
            onSelect={(value) => updateFormValue('propertyType', value)}
          />

          <OptionField
            error={errors.listingType}
            label="Listing Type"
            options={listingTypes}
            selected={formValues.listingType}
            disabled={formDisabled}
            onSelect={(value) => updateFormValue('listingType', value)}
          />

          <FormField error={errors.price} label="Price (TND)">
            <TextInput
              accessibilityLabel="Price in TND"
              editable={!formDisabled}
              keyboardType="decimal-pad"
              onChangeText={(value) => updateFormValue('price', value)}
              placeholder="0.00"
              placeholderTextColor={colors.secondary}
              style={styles.input}
              value={formValues.price}
            />
          </FormField>

          <FormField error={errors.city} label="City">
            <TextInput
              accessibilityLabel="City"
              autoCapitalize="words"
              editable={!formDisabled}
              onChangeText={(value) => updateFormValue('city', value)}
              placeholder="Tozeur"
              placeholderTextColor={colors.secondary}
              returnKeyType="next"
              style={styles.input}
              value={formValues.city}
            />
          </FormField>

          <FormField label="Description">
            <TextInput
              accessibilityLabel="Property description"
              editable={!formDisabled}
              multiline
              onChangeText={(value) => updateFormValue('description', value)}
              placeholder="Describe the property"
              placeholderTextColor={colors.secondary}
              style={[styles.input, styles.descriptionInput]}
              textAlignVertical="top"
              value={formValues.description}
            />
          </FormField>

          <View style={styles.numberRow}>
            <View style={styles.numberField}>
              <FormField error={errors.surface} label="Surface (m²)">
                <TextInput
                  accessibilityLabel="Surface in square metres"
                  editable={!formDisabled}
                  keyboardType="number-pad"
                  onChangeText={(value) => updateFormValue('surface', value)}
                  placeholder="e.g. 95"
                  placeholderTextColor={colors.secondary}
                  style={styles.input}
                  value={formValues.surface}
                />
              </FormField>
            </View>
            <View style={styles.numberField}>
              <FormField error={errors.rooms} label="Rooms">
                <TextInput
                  accessibilityLabel="Number of rooms"
                  editable={!formDisabled}
                  keyboardType="number-pad"
                  onChangeText={(value) => updateFormValue('rooms', value)}
                  placeholder="e.g. 3"
                  placeholderTextColor={colors.secondary}
                  style={styles.input}
                  value={formValues.rooms}
                />
              </FormField>
            </View>
          </View>

          <View style={styles.field}>
            <View style={styles.photoHeading}>
              <View style={styles.photoLabelGroup}>
                <Text style={styles.fieldLabel}>Photos (optional)</Text>
                <Text style={styles.photoCount}>
                  {pickedImages.length} / {MAX_PROPERTY_IMAGES} photos selected
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{
                  disabled:
                    formDisabled || pickedImages.length >= MAX_PROPERTY_IMAGES,
                }}
                disabled={
                  formDisabled || pickedImages.length >= MAX_PROPERTY_IMAGES
                }
                onPress={() => void pickPropertyImages()}
                style={[
                  styles.addPhotosButton,
                  (formDisabled ||
                    pickedImages.length >= MAX_PROPERTY_IMAGES) &&
                    styles.disabledButton,
                ]}
              >
                <Ionicons name="add" size={20} color={colors.primary} />
                <Text style={styles.addPhotosText}>Add Photos</Text>
              </Pressable>
            </View>
            {pickedImages.length > 0 ? (
              <ScrollView
                horizontal
                contentContainerStyle={styles.photoList}
                showsHorizontalScrollIndicator={false}
              >
                {pickedImages.map((image, index) => (
                  <View key={image.key} style={styles.photoPreview}>
                    <Image
                      source={{ uri: image.uri }}
                      style={styles.photoPreviewImage}
                      contentFit="cover"
                      alt={`Selected property photo ${index + 1}`}
                    />
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Remove photo ${index + 1}`}
                      disabled={formDisabled}
                      onPress={() => removePickedImage(image.key)}
                      style={styles.removePhotoButton}
                    >
                      <Ionicons
                        name="close"
                        size={16}
                        color={colors.onPrimary}
                      />
                    </Pressable>
                  </View>
                ))}
              </ScrollView>
            ) : (
              <Text style={styles.photoHint}>
                Add up to {MAX_PROPERTY_IMAGES} photos to show in the property
                gallery.
              </Text>
            )}
            {photoSelectionMessage !== null ? (
              <Text
                accessibilityRole="alert"
                style={styles.photoSelectionMessage}
              >
                {photoSelectionMessage}
              </Text>
            ) : null}
            {uploadProgress !== null ? (
              <Text style={styles.photoHint}>{uploadProgress}</Text>
            ) : null}
            {uploadSummary !== null ? (
              <Text
                accessibilityRole="alert"
                style={styles.photoSelectionMessage}
              >
                {uploadSummary}
              </Text>
            ) : null}
            {savedProperty !== null ? (
              <Text style={styles.photoHint}>
                The property is saved. Retrying will only upload its photos.
              </Text>
            ) : null}
          </View>

          {submitError !== null && (
            <Text accessibilityRole="alert" style={styles.submitError}>
              {submitError}
            </Text>
          )}

          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: submitting || pickingImages }}
            disabled={submitting || pickingImages}
            onPress={() => void handleSubmit()}
            style={[
              styles.submitButton,
              (submitting || pickingImages) && styles.disabledButton,
            ]}
          >
            {submitting ? (
              <ActivityIndicator color={colors.onPrimary} />
            ) : (
              <Text style={styles.submitButtonText}>
                {savedProperty !== null
                  ? 'Retry photo upload'
                  : 'Publish Property'}
              </Text>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

interface FormFieldProps {
  label: string;
  error?: string;
  children: React.ReactNode;
}

function FormField({ label, error, children }: FormFieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
      {error !== undefined && (
        <Text accessibilityRole="alert" style={styles.fieldError}>
          {error}
        </Text>
      )}
    </View>
  );
}

interface OptionFieldProps<T extends string> {
  label: string;
  error?: string;
  options: { value: T; label: string }[];
  selected: T | null;
  disabled?: boolean;
  onSelect: (value: T) => void;
}

function OptionField<T extends string>({
  label,
  error,
  options,
  selected,
  disabled = false,
  onSelect,
}: OptionFieldProps<T>) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.options}>
        {options.map((option) => {
          const isSelected = selected === option.value;
          return (
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ checked: isSelected, disabled }}
              disabled={disabled}
              key={option.value}
              onPress={() => onSelect(option.value)}
              style={[
                styles.option,
                isSelected && styles.optionSelected,
                disabled && styles.disabledOption,
              ]}
            >
              <Text
                style={[
                  styles.optionText,
                  isSelected && styles.optionTextSelected,
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {error !== undefined && (
        <Text accessibilityRole="alert" style={styles.fieldError}>
          {error}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  header: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
  },
  headerTitle: {
    ...theme.fonts.titleLarge,
    color: colors.primary,
  },
  headerSpacer: {
    width: 44,
  },
  form: {
    gap: spacing.lg,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  field: {
    gap: spacing.sm,
  },
  fieldLabel: {
    ...theme.fonts.titleSmall,
    color: colors.onBackground,
  },
  photoHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  photoLabelGroup: {
    gap: spacing.xs,
  },
  photoCount: {
    ...typography.caption,
    color: colors.secondary,
  },
  addPhotosButton: {
    minHeight: 40,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.outline,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  addPhotosText: {
    ...theme.fonts.labelLarge,
    color: colors.primary,
  },
  photoList: {
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  photoPreview: {
    width: 104,
    height: 88,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.outlineVariant,
  },
  photoPreviewImage: {
    width: '100%',
    height: '100%',
  },
  removePhotoButton: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
    backgroundColor: colors.error,
  },
  photoHint: {
    ...typography.caption,
    color: colors.secondary,
  },
  photoSelectionMessage: {
    ...typography.caption,
    color: colors.error,
  },
  input: {
    minHeight: 48,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.outline,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    ...typography.body,
    color: colors.onBackground,
  },
  descriptionInput: {
    minHeight: 112,
    paddingTop: spacing.md,
  },
  options: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  option: {
    minHeight: 42,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.outline,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
  },
  optionSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  disabledOption: {
    opacity: 0.6,
  },
  optionText: {
    ...typography.body,
    color: colors.secondary,
  },
  optionTextSelected: {
    color: colors.onPrimary,
  },
  fieldError: {
    ...typography.caption,
    color: colors.error,
  },
  numberRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  numberField: {
    flex: 1,
  },
  submitError: {
    ...typography.body,
    color: colors.error,
  },
  submitButton: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.md,
  },
  disabledButton: {
    opacity: 0.7,
  },
  submitButtonText: {
    ...theme.fonts.labelLarge,
    color: colors.onPrimary,
  },
});
