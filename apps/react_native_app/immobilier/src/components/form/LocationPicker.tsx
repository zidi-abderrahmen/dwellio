import React, { useEffect, useRef } from 'react';
import {
 ActivityIndicator,
 Pressable,
 StyleSheet,
 Text,
 View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, type Region } from 'react-native-maps';
import { theme, spacing, radius, typography } from '../../theme';
type LatLng = {
 latitude: number;
 longitude: number;
};

const colors = theme.colors;
const DEFAULT_REGION = {
 latitude: 36.8065,
 longitude: 10.1815,
 latitudeDelta: 0.05,
 longitudeDelta: 0.05,
};
const FOCUSED_REGION_DELTA = 0.02;

interface LocationPickerProps {
 location: LatLng | null;
 error: string | null;
 locating: boolean;
 focusToken: number;
 disabled: boolean;
 onSelect: (loc: LatLng) => void;
 onDetect: () => void;
}

export function LocationPicker({
 location,
 error,
 locating,
 focusToken,
 disabled,
 onSelect,
 onDetect,
}: LocationPickerProps) {
 const mapRef = useRef<MapView>(null);
 // Tracks the last focus token we reacted to. Initialised to the token at
 // first render so the map doesn't animate on mount (initialRegion already
 // covers that case).
 const lastFocusToken = useRef(focusToken);

 useEffect(() => {
 if (focusToken === lastFocusToken.current) return;
 lastFocusToken.current = focusToken;
 if (!location) return;

 const region: Region = {
 latitude: location.latitude,
 longitude: location.longitude,
 latitudeDelta: FOCUSED_REGION_DELTA,
 longitudeDelta: FOCUSED_REGION_DELTA,
 };

 mapRef.current?.animateToRegion(region, 500);
 }, [focusToken, location]);

 return (
 <View style={styles.container}>
 <View style={styles.mapWrap}>
 <MapView
 ref={mapRef}
 style={StyleSheet.absoluteFill}
 initialRegion={{
 latitude: location?.latitude ?? DEFAULT_REGION.latitude,
 longitude: location?.longitude ?? DEFAULT_REGION.longitude,
 latitudeDelta: DEFAULT_REGION.latitudeDelta,
 longitudeDelta: DEFAULT_REGION.longitudeDelta,
 }}
 onPress={(e) => onSelect(e.nativeEvent.coordinate)}
 toolbarEnabled={false}
 >
 {location ? (
 <Marker coordinate={location} title="Selected location" />
 ) : null}
 </MapView>

 {!location ? (
 <View pointerEvents="none" style={styles.mapHint}>
 <Ionicons
 name="location-outline"
 size={16}
 color={colors.onSurface}
 />
 <Text style={styles.mapHintText}>Tap the map to drop a pin</Text>
 </View>
 ) : null}

 <Pressable
 accessibilityLabel="Use my current location"
 accessibilityRole="button"
 disabled={disabled || locating}
 onPress={onDetect}
 style={[
 styles.detectButton,
 (disabled || locating) && styles.disabled,
 ]}
 >
 {locating ? (
 <ActivityIndicator size="small" color={colors.onPrimary} />
 ) : (
 <>
 <Ionicons name="navigate" size={16} color={colors.onPrimary} />
 <Text style={styles.detectText}>Locate me</Text>
 </>
 )}
 </Pressable>
 </View>

 {location ? (
 <View style={styles.coordRow}>
 <Ionicons name="pin" size={14} color={colors.secondary} />
 <Text style={styles.coordText}>
 {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
 </Text>
 </View>
 ) : null}

 {error ? (
 <View style={styles.errorRow}>
 <Ionicons name="alert-circle" size={14} color={colors.error} />
 <Text accessibilityRole="alert" style={styles.errorText}>
 {error}
 </Text>
 </View>
 ) : null}
 </View>
 );
}

const styles = StyleSheet.create({
 container: { gap: spacing.sm },
 mapWrap: {
 height: 220,
 borderRadius: radius.md,
 overflow: 'hidden',
 borderWidth: 1,
 borderColor: colors.outlineVariant,
 backgroundColor: colors.outlineVariant,
 },
 mapHint: {
 position: 'absolute',
 top: spacing.sm,
 left: spacing.sm,
 right: spacing.sm,
 flexDirection: 'row',
 alignItems: 'center',
 gap: spacing.xs,
 paddingHorizontal: spacing.md,
 paddingVertical: spacing.sm,
 borderRadius: radius.full,
 backgroundColor: 'rgba(255,255,255,0.92)',
 },
 mapHintText: { ...typography.caption, color: colors.onSurface },
 detectButton: {
 position: 'absolute',
 bottom: spacing.sm,
 right: spacing.sm,
 flexDirection: 'row',
 alignItems: 'center',
 gap: spacing.xs,
 paddingHorizontal: spacing.md,
 paddingVertical: spacing.sm,
 borderRadius: radius.full,
 backgroundColor: colors.primary,
 },
 detectText: { ...theme.fonts.labelLarge, color: colors.onPrimary },
 coordRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
 coordText: { ...typography.caption, color: colors.secondary },
 errorRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
 errorText: { ...typography.caption, color: colors.error, flex: 1 },
 disabled: { opacity: 0.6 },
});