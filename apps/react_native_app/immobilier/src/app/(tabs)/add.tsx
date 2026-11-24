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
 typeof routePropertyId === 'string' ? routePropertyId.trim() : undefined;

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
 const [loadError, setLoadError] = useState<string | null>(initialLoadError);
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

 /* ------------------------------------------ Load existing property */
 useEffect(() => {
 if (!propertyId || invalidPropertyId || initialLoadError) return;
 let cancelled = false;

 getMyPropertyById(propertyId)
 .then((property) => {
 if (cancelled) return;
 setFormValues(toPropertyFormValues(property));
 if (property.latitude != null && property.longitude != null) {
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
 }, [propertyId, invalidPropertyId, initialLoadError, setLocation]);

 /* ------------------------------------------ Field updates */
 const updateValue = useCallback(
 <K extends keyof PropertyFormValues>(
 key: K,
 value: PropertyFormValues[K],
 ) => {
 setFormValues((prev) => ({ ...prev, [key]: value }));
 setErrors((prev) => ({ ...prev, [key]: undefined }));
 setSubmitError(null);
 },
 [],
 );

 /* ------------------------------------------ Submit */
 const handleSubmit = async () => {
 if (submissionInProgress.current || pickerInProgress.current) return;

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
 { text: 'My Listings', onPress: () => router.replace('/my-listings') },
 ],
 { cancelable: false },
 );
 return;
 }

 let property = savedPropertyRef.current;
 if (!property) {
 property = await createProperty(propertyInput);
 savedPropertyRef.current = property;
 setSavedProperty(property);
 }

 const positioned = images.map((img, i) => ({
 ...img,
 position: img.position ?? i,
 }));
 const pending = positioned.filter((img) => img.uploaded !== true);

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
 onProgress: (current, total) => setProgress({ current, total }),
 },
 );

 markUploaded(results);
 setProgress(null);

 const failed = results.filter((r) => !r.uploaded);
 if (failed.length > 0) {
 const uploaded = results.filter((r) => r.uploaded).length;
 setSubmitError(
 `Your property is saved. ${uploaded} of ${positioned.length} photos uploaded. Retry to try again.`,
 );
 return;
 }
 }

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

 /* ------------------------------------------ Derived UI state */
 const formDisabled = loading || submitting || picking || savedProperty !== null;
 const busy = submitting || picking;

 /* ------------------------------------------ Render */
 const header = (
 <View style={styles.header}>
 <Pressable
 accessibilityLabel="Go back"
 accessibilityRole="button"
 onPress={() =>
 router.canGoBack() ? router.back() : router.replace('/')
 }
 style={styles.iconButton}
 >
 <Ionicons name="arrow-back" size={22} color={colors.onSurface} />
 </Pressable>
 <Text style={styles.headerTitle}>
 {isEditing ? 'Edit Property' : 'Add Property'}
 </Text>
 <View style={styles.iconButton} />
 </View>
 );

 if (loadError) {
 return (
 <SafeAreaView style={styles.container} edges={['top']}>
 <StatusBar style="dark" />
 {header}
 <View style={styles.loadState}>
 <Ionicons
 name="alert-circle-outline"
 size={48}
 color={colors.error}
 />
 <Text style={styles.loadStateText}>{loadError}</Text>
 <Pressable
 accessibilityRole="button"
 onPress={() => router.replace('/my-listings')}
 style={styles.primaryButton}
 >
 <Text style={styles.primaryButtonText}>Back to My Listings</Text>
 </Pressable>
 </View>
 </SafeAreaView>
 );
 }

 return (
 <SafeAreaView style={styles.container} edges={['top']}>
 <StatusBar style="dark" />
 {header}

 <KeyboardAvoidingView
 behavior={Platform.OS === 'ios' ? 'padding' : undefined}
 style={styles.kav}
 keyboardVerticalOffset={0}
 >
 {loading ? (
 <View style={styles.loadState}>
 <ActivityIndicator size="large" color={colors.primary} />
 <Text style={styles.loadStateText}>Loading property…</Text>
 </View>
 ) : (
 <ScrollView
 contentContainerStyle={[
 styles.scrollContent,
 { paddingBottom: spacing.xxl + 96 + insets.bottom },
 ]}
 keyboardShouldPersistTaps="handled"
 keyboardDismissMode="on-drag"
 showsVerticalScrollIndicator={false}
 >
 <FormSection
 icon="document-text-outline"
 title="Basic Information"
 subtitle="What are you listing?"
 >
 <FormField label="Title" error={errors.title}>
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
 onSelect={(v) => updateValue('propertyType', v)}
 />

 <OptionField
 label="Listing Type"
 error={errors.listingType}
 options={listingTypes}
 selected={formValues.listingType}
 disabled={formDisabled}
 onSelect={(v) => updateValue('listingType', v)}
 />
 </FormSection>

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
 <Text style={styles.inputPrefix}>TND</Text>
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

 <FormSection
 icon="home-outline"
 title="Property Details"
 subtitle="Describe the space"
 >
 <FormField label="City" error={errors.city}>
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

 <FormField label="Address" hint="Optional">
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
 <FormField label="Surface (m²)" error={errors.surface}>
 <TextInput
 accessibilityLabel="Surface in square metres"
 editable={!formDisabled}
 keyboardType="number-pad"
 onChangeText={(v) => updateValue('surface', v)}
 placeholder="95"
 placeholderTextColor={colors.secondary}
 style={styles.input}
 value={formValues.surface}
 />
 </FormField>
 </View>
 <View style={styles.flex1}>
 <FormField label="Rooms" error={errors.rooms}>
 <TextInput
 accessibilityLabel="Number of rooms"
 editable={!formDisabled}
 keyboardType="number-pad"
 onChangeText={(v) => updateValue('rooms', v)}
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
 onChangeText={(v) => updateValue('bathrooms', v)}
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
 onChangeText={(v) => updateValue('description', v)}
 placeholder="Describe the property"
 placeholderTextColor={colors.secondary}
 style={[styles.input, styles.descriptionInput]}
 textAlignVertical="top"
 value={formValues.description}
 />
 </FormField>
 </FormSection>

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

 {!loading ? (
 <View
 style={[
 styles.footer,
 { paddingBottom: Math.max(insets.bottom, spacing.md) },
 ]}
 >
 {submitError ? (
 <View style={styles.errorBanner}>
 <Ionicons
 name="alert-circle"
 size={18}
 color={colors.error}
 />
 <Text style={styles.errorBannerText}>{submitError}</Text>
 </View>
 ) : null}

 <Pressable
 accessibilityRole="button"
 accessibilityState={{ disabled: busy }}
 disabled={busy}
 onPress={() => void handleSubmit()}
 style={[styles.primaryButton, busy && styles.disabledButton]}
 >
 {submitting ? (
 <ActivityIndicator color={colors.onPrimary} />
 ) : (
 <>
 <Ionicons
 name={isEditing ? 'save-outline' : 'cloud-upload-outline'}
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
 </>
 )}
 </Pressable>
 </View>
 ) : null}
 </KeyboardAvoidingView>
 </SafeAreaView>
 );
}

const styles = StyleSheet.create({
 container: { flex: 1, backgroundColor: colors.background },
 header: {
 flexDirection: 'row',
 alignItems: 'center',
 justifyContent: 'space-between',
 paddingHorizontal: spacing.lg,
 paddingVertical: spacing.sm,
 borderBottomWidth: StyleSheet.hairlineWidth,
 borderBottomColor: colors.outlineVariant,
 backgroundColor: colors.background,
 },
 headerTitle: { ...theme.fonts.titleLarge, color: colors.onBackground },
 iconButton: {
 width: 40,
 height: 40,
 alignItems: 'center',
 justifyContent: 'center',
 borderRadius: radius.full,
 },
 kav: { flex: 1 },
 scrollContent: { gap: spacing.xl, padding: spacing.lg },
 loadState: {
 flex: 1,
 alignItems: 'center',
 justifyContent: 'center',
 gap: spacing.md,
 padding: spacing.lg,
 },
 loadStateText: { ...typography.body, color: colors.secondary },
 input: {
 minHeight: 50,
 paddingHorizontal: spacing.md,
 borderWidth: 1,
 borderColor: colors.outline,
 borderRadius: radius.md,
 backgroundColor: colors.surface,
 ...typography.body,
 color: colors.onBackground,
 },
 descriptionInput: { minHeight: 120, paddingTop: spacing.md },
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
 color: colors.secondary,
 marginRight: spacing.sm,
 },
 inputInner: {
 flex: 1,
 minHeight: 50,
 paddingRight: spacing.md,
 ...typography.body,
 color: colors.onBackground,
 },
 row: { flexDirection: 'row', gap: spacing.md },
 flex1: { flex: 1 },
 charCount: { ...typography.caption, color: colors.secondary },
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
 minHeight: 52,
 borderRadius: radius.md,
 backgroundColor: colors.primary,
 paddingHorizontal: spacing.lg,
 },
 primaryButtonText: { ...theme.fonts.labelLarge, color: colors.onPrimary },
 disabledButton: { opacity: 0.6 },
 errorBanner: {
 flexDirection: 'row',
 alignItems: 'flex-start',
 gap: spacing.sm,
 padding: spacing.md,
 borderRadius: radius.md,
 backgroundColor: colors.surface,
 borderWidth: 1,
 borderColor: colors.error,
 },
 errorBannerText: { ...typography.caption, color: colors.error, flex: 1 },
});
