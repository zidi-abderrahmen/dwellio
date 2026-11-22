import { supabase } from '../lib/supabase';
import type {
 PropertyWithRelations,
} from '../types/property';

export class FavoriteServiceError extends Error {
 constructor(message: string) {
 super(message);
 this.name = 'FavoriteServiceError';
 Object.setPrototypeOf(this, FavoriteServiceError.prototype);
 }
}

async function getCurrentUserId(): Promise<string> {
 const {
 data: { user },
 error: userError,
 } = await supabase.auth.getUser();

 if (userError) {
 throw new FavoriteServiceError(
 `Failed to verify the current user: ${userError.message}`,
 );
 }

 if (!user) {
 throw new FavoriteServiceError(
 'You must be signed in to manage your favorites.',
 );
 }

 return user.id;
}

/**
 * Service for all Favorites-related Supabase queries.
 */
export const favoriteService = {
 /** Returns the IDs of the properties favorited by the current user. */
 async getFavoritePropertyIds(): Promise<Set<string>> {
 const userId = await getCurrentUserId();

 const { data, error } = await supabase
 .from('favorites')
 .select('property_id')
 .eq('user_id', userId);

 if (error) {
 throw new FavoriteServiceError(
 `Unable to load your favorites: ${error.message}`,
 );
 }

 return new Set((data ?? []).map((row) => row.property_id));
 },

 /** Adds a property to the current user's favorites. */
 async addFavorite(propertyId: string): Promise<void> {
 const userId = await getCurrentUserId();

 const normalizedPropertyId = propertyId.trim();
 if (!normalizedPropertyId) {
 throw new FavoriteServiceError('A valid property ID is required.');
 }

 const { error } = await supabase.from('favorites').insert({
 user_id: userId,
 property_id: normalizedPropertyId,
 });

 if (error) {
 if (error.code === '23505') {
 throw new FavoriteServiceError(
 'This property is already in your favorites.',
 );
 }
 throw new FavoriteServiceError(
 `Unable to add this property to your favorites: ${error.message}`,
 );
 }
 },

 /** Removes a property from the current user's favorites. */
 async removeFavorite(propertyId: string): Promise<void> {
 const userId = await getCurrentUserId();

 const normalizedPropertyId = propertyId.trim();
 if (!normalizedPropertyId) {
 throw new FavoriteServiceError('A valid property ID is required.');
 }

 const { error } = await supabase
 .from('favorites')
 .delete()
 .eq('user_id', userId)
 .eq('property_id', normalizedPropertyId);

 if (error) {
 throw new FavoriteServiceError(
 `Unable to remove this property from your favorites: ${error.message}`,
 );
 }
 },

 /** Returns the current user's favorite properties, including their images. */
 async getFavoriteProperties(): Promise<PropertyWithRelations[]> {
 const userId = await getCurrentUserId();

 const { data, error } = await supabase
 .from('favorites')
 .select(`
 property_id,
 properties (
 *,
 property_images (*),
 profiles!properties_owner_id_fkey (*)
 )
 `)
 .eq('user_id', userId)
 .order('created_at', { ascending: false });

 if (error) {
 throw new FavoriteServiceError(
 `Unable to load your favorite properties: ${error.message}`,
 );
 }

 const rows = (data ?? []) as unknown as Array<{
 properties: unknown;
 }>;

 return rows
 .map((row) => row.properties as PropertyWithRelations | undefined)
 .filter(
 (property): property is PropertyWithRelations => property !== undefined,
 )
 .map((property) => ({
 ...property,
 property_images: [...property.property_images].sort(
 (first, second) => first.position - second.position,
 ),
 }));
 },
}