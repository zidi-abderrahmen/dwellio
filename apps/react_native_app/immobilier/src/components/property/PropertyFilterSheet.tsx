import React, { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { radius, spacing, theme, typography } from '../../theme';
import type { ListingType, PropertyType } from '../../types/property';
import type { PropertyFilters } from '../../types/propertyFilters';

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

interface PropertyFilterSheetProps {
  visible: boolean;
  filters: PropertyFilters;
  onClose: () => void;
  onApply: (filters: PropertyFilters) => void;
  onReset: () => void;
}

function parsePrice(value: string, label: string): number | undefined {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return undefined;
  }

  if (!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(trimmedValue)) {
    throw new Error(`${label} must be a non-negative number.`);
  }

  const price = Number(trimmedValue);
  if (!Number.isFinite(price) || price < 0) {
    throw new Error(`${label} must be a non-negative number.`);
  }

  return price;
}

export default function PropertyFilterSheet({
  visible,
  filters,
  onClose,
  onApply,
  onReset,
}: PropertyFilterSheetProps) {
  const [city, setCity] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [propertyType, setPropertyType] = useState<PropertyType | undefined>();
  const [listingType, setListingType] = useState<ListingType | undefined>();
  const [validationError, setValidationError] = useState<string | null>(null);
  const wasVisible = useRef(false);

  useEffect(() => {
    if (!visible) {
      wasVisible.current = false;
      return;
    }

    if (wasVisible.current) {
      return;
    }

    wasVisible.current = true;
    setCity(filters.city ?? '');
    setMinPrice(filters.minPrice?.toString() ?? '');
    setMaxPrice(filters.maxPrice?.toString() ?? '');
    setPropertyType(filters.propertyType);
    setListingType(filters.listingType);
    setValidationError(null);
  }, [filters, visible]);

  const handleApply = () => {
    try {
      const parsedMinPrice = parsePrice(minPrice, 'Minimum price');
      const parsedMaxPrice = parsePrice(maxPrice, 'Maximum price');

      if (
        parsedMinPrice !== undefined &&
        parsedMaxPrice !== undefined &&
        parsedMinPrice > parsedMaxPrice
      ) {
        setValidationError(
          'Minimum price must not be greater than maximum price.',
        );
        return;
      }

      setValidationError(null);
      onApply({
        city: city.trim() || undefined,
        minPrice: parsedMinPrice,
        maxPrice: parsedMaxPrice,
        propertyType,
        listingType,
      });
    } catch (error) {
      if (error instanceof Error) {
        setValidationError(error.message);
      } else {
        throw error;
      }
    }
  };

  const handleReset = () => {
    setCity('');
    setMinPrice('');
    setMaxPrice('');
    setPropertyType(undefined);
    setListingType(undefined);
    setValidationError(null);
    onReset();
  };

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      transparent
      visible={visible}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <Pressable
          accessibilityLabel="Close filters"
          accessibilityRole="button"
          onPress={onClose}
          style={styles.backdrop}
        />
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Filter properties</Text>
            <Pressable
              accessibilityLabel="Close filters"
              accessibilityRole="button"
              hitSlop={8}
              onPress={onClose}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color={colors.secondary} />
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Field label="City">
              <TextInput
                accessibilityLabel="Filter by city"
                autoCapitalize="words"
                onChangeText={setCity}
                placeholder="Enter a city"
                placeholderTextColor={colors.secondary}
                style={styles.input}
                value={city}
              />
            </Field>

            <View style={styles.priceRow}>
              <Field label="Minimum price" style={styles.priceField}>
                <TextInput
                  accessibilityLabel="Minimum price"
                  keyboardType="decimal-pad"
                  onChangeText={setMinPrice}
                  placeholder="No minimum"
                  placeholderTextColor={colors.secondary}
                  style={styles.input}
                  value={minPrice}
                />
              </Field>
              <Field label="Maximum price" style={styles.priceField}>
                <TextInput
                  accessibilityLabel="Maximum price"
                  keyboardType="decimal-pad"
                  onChangeText={setMaxPrice}
                  placeholder="No maximum"
                  placeholderTextColor={colors.secondary}
                  style={styles.input}
                  value={maxPrice}
                />
              </Field>
            </View>

            <OptionGroup
              label="Property type"
              options={propertyTypes}
              selected={propertyType}
              onSelect={setPropertyType}
            />

            <OptionGroup
              label="Listing type"
              options={listingTypes}
              selected={listingType}
              onSelect={setListingType}
            />

            {validationError !== null && (
              <Text accessibilityRole="alert" style={styles.errorText}>
                {validationError}
              </Text>
            )}

            <Pressable
              accessibilityRole="button"
              onPress={handleApply}
              style={styles.applyButton}
            >
              <Text style={styles.applyButtonText}>Apply Filters</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={handleReset}
              style={styles.resetButton}
            >
              <Text style={styles.resetButtonText}>Reset</Text>
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

interface FieldProps {
  label: string;
  children: React.ReactNode;
  style?: object;
}

function Field({ label, children, style }: FieldProps) {
  return (
    <View style={[styles.field, style]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

interface OptionGroupProps<T extends string> {
  label: string;
  options: { value: T; label: string }[];
  selected: T | undefined;
  onSelect: (value: T | undefined) => void;
}

function OptionGroup<T extends string>({
  label,
  options,
  selected,
  onSelect,
}: OptionGroupProps<T>) {
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
              onPress={() =>
                onSelect(isSelected ? undefined : option.value)
              }
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
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  sheet: {
    maxHeight: '90%',
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  title: {
    ...theme.fonts.titleLarge,
    color: colors.onBackground,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    gap: spacing.lg,
    paddingBottom: spacing.md,
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
  priceRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  priceField: {
    flex: 1,
  },
  options: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  option: {
    minHeight: 40,
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
  errorText: {
    ...typography.body,
    color: colors.error,
  },
  applyButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.md,
  },
  applyButtonText: {
    ...theme.fonts.labelLarge,
    color: colors.onPrimary,
  },
  resetButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetButtonText: {
    ...theme.fonts.labelLarge,
    color: colors.primary,
  },
});
