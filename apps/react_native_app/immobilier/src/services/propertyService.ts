import { supabase } from '../lib/supabase';
import type {
  Property,
  PropertySearchResult,
  PropertyWithRelations,
} from '../types/property';

export type CreatePropertyInput = Pick<
  Property,
  | 'title'
  | 'description'
  | 'listing_type'
  | 'property_type'
  | 'price'
  | 'surface_m2'
  | 'rooms'
  | 'city'
>;

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
export async function getProperties(): Promise<PropertySearchResult[]> {
  const { data, error } = await supabase
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
    .order('created_at', { ascending: false })
    .limit(30);

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

/**
 * Creates a property for the currently authenticated Supabase user.
 */
export async function createProperty(
  property: CreatePropertyInput,
): Promise<Property> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    throw new Error(`Failed to verify the current user: ${userError.message}`);
  }

  if (!user) {
    throw new Error('You must be signed in to publish a property.');
  }

  const payload = {
    owner_id: user.id,
    title: property.title.trim(),
    description: property.description?.trim() || null,
    listing_type: property.listing_type,
    property_type: property.property_type,
    price: property.price,
    surface_m2: property.surface_m2,
    rooms: property.rooms,
    city: property.city.trim(),
  };

  if (
    !payload.title ||
    !payload.city ||
    !Number.isFinite(payload.price) ||
    payload.price < 0 ||
    (payload.surface_m2 !== null &&
      (!Number.isInteger(payload.surface_m2) || payload.surface_m2 <= 0)) ||
    (payload.rooms !== null &&
      (!Number.isInteger(payload.rooms) || payload.rooms < 0))
  ) {
    throw new Error('Property details are invalid. Please check the form.');
  }

  const { data, error } = await supabase
    .from('properties')
    .insert(payload)
    .select()
    .single();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error('Property creation returned no saved property.');
  }

  return data as Property;
}