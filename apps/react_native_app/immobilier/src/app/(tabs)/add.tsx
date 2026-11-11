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

import { theme, spacing, radius, typography } from '../../theme';
import { createProperty } from '../../services/propertyService';
import type {
  ListingType,
  PropertyType,
} from '../../types/property';

const colors = theme.colors;

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
  const [submitting, setSubmitting] = useState(false);
  const submissionInProgress = useRef(false);

  const updateFormValue = <K extends keyof PropertyFormValues>(
    key: K,
    value: PropertyFormValues[K],
  ) => {
    setFormValues((previous) => ({ ...previous, [key]: value }));
    setErrors((previous) => ({ ...previous, [key]: undefined }));
    setSubmitError(null);
  };

  const handleSubmit = async () => {
    if (submissionInProgress.current) {
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

    try {
      const property = await createProperty({
        title: validation.payload.title,
        description: validation.payload.description,
        listing_type: validation.payload.listingType,
        property_type: validation.payload.propertyType,
        price: validation.payload.price,
        surface_m2: validation.payload.surface,
        rooms: validation.payload.rooms,
        city: validation.payload.city,
      });

      Alert.alert(
        'Property published',
        'Your property was published successfully.',
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
      setSubmitError(message);
    } finally {
      submissionInProgress.current = false;
      setSubmitting(false);
    }
  };

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
            onSelect={(value) => updateFormValue('propertyType', value)}
          />

          <OptionField
            error={errors.listingType}
            label="Listing Type"
            options={listingTypes}
            selected={formValues.listingType}
            onSelect={(value) => updateFormValue('listingType', value)}
          />

          <FormField error={errors.price} label="Price (TND)">
            <TextInput
              accessibilityLabel="Price in TND"
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

          {submitError !== null && (
            <Text accessibilityRole="alert" style={styles.submitError}>
              {submitError}
            </Text>
          )}

          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: submitting }}
            disabled={submitting}
            onPress={() => void handleSubmit()}
            style={[styles.submitButton, submitting && styles.disabledButton]}
          >
            {submitting ? (
              <ActivityIndicator color={colors.onPrimary} />
            ) : (
              <Text style={styles.submitButtonText}>Publish Property</Text>
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
  onSelect: (value: T) => void;
}

function OptionField<T extends string>({
  label,
  error,
  options,
  selected,
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
              accessibilityState={{ checked: isSelected }}
              key={option.value}
              onPress={() => onSelect(option.value)}
              style={[styles.option, isSelected && styles.optionSelected]}
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
