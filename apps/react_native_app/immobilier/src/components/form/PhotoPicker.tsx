import React from 'react';
import {
 ActivityIndicator,
 Pressable,
 StyleSheet,
 Text,
 View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { theme, spacing, radius, typography } from '../../theme';
import type { PickedPropertyImage } from '../../hooks/usePropertyImages';

const colors = theme.colors;

interface PhotoPickerProps {
 images: PickedPropertyImage[];
 maxImages: number;
 picking: boolean;
 message: string | null;
 disabled: boolean;
 progress: { current: number; total: number } | null;
 onPick: () => void;
 onRemove: (key: string) => void;
}

export function PhotoPicker({
 images,
 maxImages,
 picking,
 message,
 disabled,
 progress,
 onPick,
 onRemove,
}: PhotoPickerProps) {
 const uploadedCount = images.filter((i) => i.uploaded).length;
 const canAdd = !disabled && !picking && images.length < maxImages;
 const percent =
 progress && progress.total > 0
 ? Math.round((progress.current / progress.total) * 100)
 : 0;

 return (
 <View style={styles.container}>
 <View style={styles.grid}>
 {images.map((image, index) => (
 <View key={image.key} style={styles.tile}>
 <Image
 source={{ uri: image.uri }}
 style={styles.image}
 contentFit="cover"
 alt={`Photo ${index + 1}`}
 />
 {image.uploaded ? (
 <View style={styles.uploadedBadge}>
 <Ionicons name="checkmark" size={12} color={colors.onPrimary} />
 </View>
 ) : null}
 <Pressable
 accessibilityLabel={`Remove photo ${index + 1}`}
 accessibilityRole="button"
 disabled={disabled}
 onPress={() => onRemove(image.key)}
 style={styles.removeButton}
 >
 <Ionicons name="close" size={14} color={colors.onPrimary} />
 </Pressable>
 </View>
 ))}

 {images.length < maxImages ? (
 <Pressable
 accessibilityLabel="Add photos"
 accessibilityRole="button"
 disabled={!canAdd}
 onPress={onPick}
 style={[styles.tile, styles.addTile, !canAdd && styles.disabled]}
 >
 {picking ? (
 <ActivityIndicator color={colors.primary} />
 ) : (
 <>
 <Ionicons
 name="camera-outline"
 size={26}
 color={colors.primary}
 />
 <Text style={styles.addText}>Add</Text>
 </>
 )}
 </Pressable>
 ) : null}
 </View>

 <Text style={styles.counter}>
 {images.length} / {maxImages} photos
 {uploadedCount > 0 ? ` · ${uploadedCount} uploaded` : ''}
 </Text>

 {progress ? (
 <View style={styles.progressWrap}>
 <View style={styles.progressTrack}>
 <View style={[styles.progressFill, { width: `${percent}%` }]} />
 </View>
 <Text style={styles.progressText}>
 Uploading {progress.current} of {progress.total}…
 </Text>
 </View>
 ) : null}

 {message ? (
 <View style={styles.messageRow}>
 <Ionicons
 name="information-circle-outline"
 size={16}
 color={colors.error}
 />
 <Text style={styles.messageText}>{message}</Text>
 </View>
 ) : null}
 </View>
 );
}

const styles = StyleSheet.create({
 container: { gap: spacing.sm },
 grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
 tile: {
 width: '31.5%',
 aspectRatio: 1,
 borderRadius: radius.md,
 overflow: 'hidden',
 backgroundColor: colors.outlineVariant,
 },
 image: { width: '100%', height: '100%' },
 uploadedBadge: {
 position: 'absolute',
 bottom: 4,
 left: 4,
 width: 20,
 height: 20,
 borderRadius: radius.full,
 backgroundColor: colors.primary,
 alignItems: 'center',
 justifyContent: 'center',
 },
 removeButton: {
 position: 'absolute',
 top: 4,
 right: 4,
 width: 22,
 height: 22,
 borderRadius: radius.full,
 backgroundColor: 'rgba(0,0,0,0.6)',
 alignItems: 'center',
 justifyContent: 'center',
 },
 addTile: {
 alignItems: 'center',
 justifyContent: 'center',
 gap: 2,
 borderWidth: 1.5,
 borderStyle: 'dashed',
 borderColor: colors.outline,
 backgroundColor: colors.surface,
 },
 addText: { ...typography.caption, color: colors.primary, fontWeight: '600' },
 disabled: { opacity: 0.5 },
 counter: { ...typography.caption, color: colors.secondary },
 progressWrap: { gap: 4 },
 progressTrack: {
 height: 6,
 borderRadius: radius.full,
 backgroundColor: colors.outlineVariant,
 overflow: 'hidden',
 },
 progressFill: { height: '100%', backgroundColor: colors.primary },
 progressText: { ...typography.caption, color: colors.secondary },
 messageRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
 messageText: { ...typography.caption, color: colors.error, flex: 1 },
});