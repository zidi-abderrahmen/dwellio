import { supabase } from '../lib/supabase';
import type {
  PropertySearchResult,
  PropertyWithRelations,
} from '../types/property';
import type { PropertyFilters } from '../types/propertyFilters';

/**
 * Sorts a property's images by their display position.
 * Sorting is done in JavaScript so the query does not depend on
 * PostgREST's nested `referencedTable` ordering/limit options.
 */
function sortPropertyImages<T extends { position: number }>(
  images: T[] | null | undefined,
): T[] {
  if (!Array.isArray(images)) {
    return [];
  }

  return [...images].sort((first, second) => first.position - second.position);
}

/**
 * Loads active properties for the home/explore list.
 * The list only needs the first image for each property card.
 */
export async function getProperties(
  filters: PropertyFilters = {},
): Promise<PropertySearchResult[]> {
  return getFilteredProperties(filters);
}

/**
 * Loads active properties for the home/explore list with optional filters.
 */
export async function getFilteredProperties(
  filters: PropertyFilters = {},
): Promise<PropertySearchResult[]> {
  let query = supabase
    .from('properties')
    .select(`
      id,
      owner_id,
      title,
      description,
      listing_type,
      property_type,
      price,
      surface_m2,
      rooms,
      bathrooms,
      city,
      address,
      latitude,
      longitude,
      status,
      created_at,
      updated_at,
      property_images (
        image_url,
        position
      ),
      profiles!properties_owner_id_fkey (
        full_name,
        phone,
        avatar_url
      )
    `)
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (filters.city?.trim()) {
    query = query.ilike('city', `%${filters.city.trim()}%`);
  }

  if (filters.minPrice !== undefined) {
    query = query.gte('price', filters.minPrice);
  }

  if (filters.maxPrice !== undefined) {
    query = query.lte('price', filters.maxPrice);
  }

  if (filters.propertyType !== undefined) {
    query = query.eq('property_type', filters.propertyType);
  }

  if (filters.listingType !== undefined) {
    query = query.eq('listing_type', filters.listingType);
  }

  const { data, error } = await query.limit(30);

  if (error) {
    throw new Error(`Failed to load properties: ${error.message}`);
  }

  const rows = (data ?? []) as unknown as PropertySearchResult[];

  return rows.map((property) => {
    const sortedImages = sortPropertyImages(property.property_images);

    return {
      ...property,
      property_images: sortedImages.slice(0, 1),
      profiles: property.profiles ?? null,
    };
  });
}

/**
 * Loads one property and all of its related images and owner profile.
 * All images are returned, ordered by `position` for the details carousel.
 */
export async function getPropertyById(
  id: string,
): Promise<PropertyWithRelations> {
  const propertyId = id?.trim();

  if (!propertyId) {
    throw new Error('A valid property ID is required.');
  }

  const { data, error } = await supabase
    .from('properties')
    .select(`
      *,
      property_images (*),
      profiles!properties_owner_id_fkey (*)
    `)
    .eq('id', propertyId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load property details: ${error.message}`);
  }

  if (!data) {
    throw new Error('Property not found.');
  }

  const property = data as unknown as PropertyWithRelations;

  return {
    ...property,
    property_images: sortPropertyImages(property.property_images),
    profiles: property.profiles ?? null,
  };
}