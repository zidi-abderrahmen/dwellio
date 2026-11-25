import { useCallback, useRef, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import type { PropertyImageUploadResult } from '../services/propertyService';

export interface PickedPropertyImage {
 key: string;
 uri: string;
 base64: string;
 position?: number;
 storagePath?: string;
 imageUrl?: string;
 uploaded?: boolean;
}

interface UsePropertyImagesOptions {
 maxImages: number;
}

export function usePropertyImages({ maxImages }: UsePropertyImagesOptions) {
 const [images, setImages] = useState<PickedPropertyImage[]>([]);
 const [picking, setPicking] = useState(false);
 const [message, setMessage] = useState<string | null>(null);
 const pickerInProgress = useRef(false);
 const sequence = useRef(0);

 const pick = useCallback(async () => {
 if (pickerInProgress.current) return;
 const remaining = maxImages - images.length;
 if (remaining <= 0) return;

 pickerInProgress.current = true;
 setPicking(true);
 setMessage(null);

 try {
 const result = await ImagePicker.launchImageLibraryAsync({
 mediaTypes: ['images'],
 allowsMultipleSelection: true,
 selectionLimit: remaining,
 });
 if (result.canceled) return;

 const selected = result.assets.slice(0, remaining);
 const processed = await Promise.all(
 selected.map(async (asset) => {
 const key = `img-${Date.now()}-${sequence.current++}`;
 const context = ImageManipulator.manipulate(asset.uri);
 context.resize({ width: 1920, height: 1920 });
 const rendered = await context.renderAsync();
 const saved = await rendered.saveAsync({
 format: SaveFormat.JPEG,
 compress: 0.6,
 base64: true,
 });
 if (!saved.base64) {
 throw new Error('The selected photo could not be read.');
 }
 return { key, uri: saved.uri, base64: saved.base64 };
 }),
 );

 setImages((prev) => [...prev, ...processed].slice(0, maxImages));

 const omitted = result.assets.length - selected.length;
 if (omitted > 0) {
 setMessage(
 `Added ${selected.length} photo${selected.length === 1 ? '' : 's'}. ${omitted} extra were skipped (max ${maxImages}).`,
 );
 }
 } catch (error) {
 setMessage(
 error instanceof Error ? error.message : 'Unable to select photos.',
 );
 } finally {
 pickerInProgress.current = false;
 setPicking(false);
 }
 }, [images.length, maxImages]);

 const remove = useCallback((key: string) => {
 setImages((prev) => prev.filter((img) => img.key !== key));
 setMessage(null);
 }, []);

 const reset = useCallback(() => {
 setImages([]);
 setMessage(null);
 }, []);

 const markUploaded = useCallback((results: PropertyImageUploadResult[]) => {
 const byName = new Map(results.map((r) => [r.fileName, r]));
 setImages((prev) =>
 prev.map((image) => {
 const result = byName.get(image.key);
 if (!result) return image;
 return {
 ...image,
 position: result.position,
 uploaded: result.uploaded,
 storagePath: result.storagePath ?? image.storagePath,
 imageUrl: result.imageUrl ?? image.imageUrl,
 };
 }),
 );
 }, []);

 return {
 images,
 picking,
 message,
 pick,
 remove,
 reset,
 markUploaded,
 setMessage,
 pickerInProgress,
 };
}