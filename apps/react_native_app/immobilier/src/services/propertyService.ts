import { decode } from 'base64-arraybuffer';

import { supabase } from '../lib/supabase';
import type {
  Property,
  PropertySearchResult,
  PropertyWithRelations,
} from '../types/property';
import type { PropertyFilters } from '../types/propertyFilters';

export type CreatePropertyInput = Pick<
  Property,
  | 'title'
  | 'description'
  | 'listing_type'
  | 'property_type'
  | 'price'
  | 'surface_m2'
  | 'rooms'
  | 'bathrooms'
  | 'city'
  | 'address'
>;

export interface PropertyImageUpload {
  base64: string;
  fileName: string;
  position: number;
  storagePath?: string;
  imageUrl?: string;
}

export interface PropertyImageUploadResult {
  fileName: string;
  position: number;
  uploaded: boolean;
  storagePath?: string;
  imageUrl?: string;
  error?: string;
}

function isValidBase64(value: string): boolean {
  return (
    value.length > 0 &&
    /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(
      value,
    )
  );
}

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

function normalizePropertyInput(property: CreatePropertyInput): CreatePropertyInput {
  const payload = {
    title: property.title.trim(),
    description: property.description?.trim() || null,
    listing_type: property.listing_type,
    property_type: property.property_type,
    price: property.price,
    surface_m2: property.surface_m2,
    rooms: property.rooms,
    bathrooms: property.bathrooms,
    city: property.city.trim(),
    address: property.address?.trim() || null,
  };

  if (
    !payload.title ||
    !payload.city ||
    !Number.isFinite(payload.price) ||
    payload.price < 0 ||
    (payload.surface_m2 !== null &&
      (!Number.isInteger(payload.surface_m2) || payload.surface_m2 <= 0)) ||
    (payload.rooms !== null &&
      (!Number.isInteger(payload.rooms) || payload.rooms < 0)) ||
    (payload.bathrooms !== null &&
      (!Number.isInteger(payload.bathrooms) || payload.bathrooms < 0))
  ) {
    throw new Error('Property details are invalid. Please check the form.');
  }

  return payload;
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
 * Loads all listings owned by the currently authenticated user.
 */
export async function getMyProperties(): Promise<PropertySearchResult[]> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    throw new Error(`Failed to verify the current user: ${userError.message}`);
  }

  if (!user) {
    throw new Error('You must be signed in to view your properties.');
  }

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
      )
    `)
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to load your properties: ${error.message}`);
  }

  const rows = (data ?? []) as unknown as PropertySearchResult[];

  return rows.map((property) => ({
    ...property,
    property_images: sortPropertyImages(property.property_images).slice(0, 1),
    profiles: null,
  }));
}

/**
 * Loads one property for editing, restricted to its authenticated owner.
 */
export async function getMyPropertyById(id: string): Promise<Property> {
  const propertyId = id.trim();

  if (!propertyId) {
    throw new Error('A valid property ID is required.');
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    throw new Error(`Failed to verify the current user: ${userError.message}`);
  }

  if (!user) {
    throw new Error('You must be signed in to edit a property.');
  }

  const { data, error } = await supabase
    .from('properties')
    .select('*')
    .eq('id', propertyId)
    .eq('owner_id', user.id)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load the property: ${error.message}`);
  }

  if (!data) {
    throw new Error('Property not found or you do not have permission to edit it.');
  }

  return data as Property;
}

/**
 * Deletes a listing and its stored images only when owned by the current user.
 */
export async function deleteProperty(propertyId: string): Promise<void> {
  const id = propertyId.trim();

  if (!id) {
    throw new Error('A valid property ID is required.');
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    throw new Error(`Failed to verify the current user: ${userError.message}`);
  }

  if (!user) {
    throw new Error('You must be signed in to delete a property.');
  }

  const { data: property, error: propertyError } = await supabase
    .from('properties')
    .select('id')
    .eq('id', id)
    .eq('owner_id', user.id)
    .maybeSingle();

  if (propertyError) {
    throw new Error(`Failed to verify property ownership: ${propertyError.message}`);
  }

  if (!property) {
    throw new Error('Property not found or you do not have permission to delete it.');
  }

  const { data: images, error: imagesError } = await supabase
    .from('property_images')
    .select('storage_path')
    .eq('property_id', id);

  if (imagesError) {
    throw new Error(`Failed to load property photos: ${imagesError.message}`);
  }

  const storagePrefix = `${user.id}/${id}/`;
  const storagePaths = [
    ...new Set((images ?? []).map((image) => image.storage_path)),
  ];
  const hasUnexpectedStoragePath = storagePaths.some((path) => {
    if (!path.startsWith(storagePrefix)) {
      return true;
    }

    return path.slice(storagePrefix.length).includes('/');
  });

  if (hasUnexpectedStoragePath) {
    throw new Error(
      'Unable to safely delete property photos: an image has an unexpected storage path.',
    );
  }

  // Remove files before the property deletion cascades and removes their paths.
  if (storagePaths.length > 0) {
    const { error: storageError } = await supabase.storage
      .from('property-images')
      .remove(storagePaths);

    if (storageError) {
      throw new Error(`Failed to delete property photos: ${storageError.message}`);
    }
  }

  const { data, error } = await supabase
    .from('properties')
    .delete()
    .eq('id', id)
    .eq('owner_id', user.id)
    .select('id')
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to delete the property: ${error.message}`);
  }

  if (!data) {
    throw new Error('Property not found or you do not have permission to delete it.');
  }
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
    ...normalizePropertyInput(property),
  };

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

/**
 * Updates a listing without changing its ID or owner.
 * The owner filter is reinforced by the properties_update RLS policy.
 */
export async function updateProperty(
  id: string,
  property: CreatePropertyInput,
): Promise<Property> {
  const propertyId = id.trim();

  if (!propertyId) {
    throw new Error('A valid property ID is required.');
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    throw new Error(`Failed to verify the current user: ${userError.message}`);
  }

  if (!user) {
    throw new Error('You must be signed in to edit a property.');
  }

  const payload = normalizePropertyInput(property);
  const { data, error } = await supabase
    .from('properties')
    .update(payload)
    .eq('id', propertyId)
    .eq('owner_id', user.id)
    .select()
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to update the property: ${error.message}`);
  }

  if (!data) {
    throw new Error('Property not found or you do not have permission to edit it.');
  }

  return data as Property;
}

/**
 * Uploads images for an already-created property.
 * The property ID and image positions make storage and metadata retries safe.
 */
export async function uploadPropertyImages(
  propertyId: string,
  images: readonly PropertyImageUpload[],
  options: {
    totalPhotos?: number;
    onProgress?: (photoNumber: number, totalPhotos: number) => void;
  } = {},
): Promise<PropertyImageUploadResult[]> {
  const savedPropertyId = propertyId.trim();
  if (!savedPropertyId) {
    throw new Error('A valid property ID is required to upload images.');
  }

  if (images.length === 0) {
    return [];
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    throw new Error(`Failed to verify the current user: ${userError.message}`);
  }

  if (!user) {
    throw new Error('You must be signed in to upload property images.');
  }

  const totalPhotos = options.totalPhotos ?? images.length;
  const results: PropertyImageUploadResult[] = [];

  for (const image of images) {
    options.onProgress?.(image.position + 1, totalPhotos);

    let storagePath = image.storagePath;
    let imageUrl = image.imageUrl;

    try {
      if (!/^[A-Za-z0-9_-]+$/.test(image.fileName)) {
        throw new Error('The image has an invalid file name.');
      }

      if (!Number.isInteger(image.position) || image.position < 0) {
        throw new Error('The image has an invalid carousel position.');
      }

      if (!storagePath) {
        if (!isValidBase64(image.base64)) {
          throw new Error('The selected image does not contain valid base64 data.');
        }

        const nextStoragePath =
          `${user.id}/${savedPropertyId}/${image.fileName}.jpg`;
        const { error: uploadError } = await supabase.storage
          .from('property-images')
          .upload(nextStoragePath, decode(image.base64), {
            contentType: 'image/jpeg',
            upsert: true,
          });

        if (uploadError) {
          throw new Error(`Storage upload failed: ${uploadError.message}`);
        }

        storagePath = nextStoragePath;
      }

      if (!imageUrl) {
        const { data } = supabase.storage
          .from('property-images')
          .getPublicUrl(storagePath);
        imageUrl = data.publicUrl;
      }

      const { error: imageError } = await supabase
        .from('property_images')
        .upsert(
          {
            property_id: savedPropertyId,
            image_url: imageUrl,
            storage_path: storagePath,
            position: image.position,
          },
          {
            onConflict: 'property_id,position',
            ignoreDuplicates: true,
          },
        );

      if (imageError) {
        if (imageError.code === '42P10') {
          throw new Error(
            'Apply supabase/migrations/20261112_property_image_position_unique.sql to enable retry-safe image metadata.',
          );
        }

        throw new Error(`Metadata insert failed: ${imageError.message}`);
      }

      results.push({
        fileName: image.fileName,
        position: image.position,
        uploaded: true,
        storagePath,
        imageUrl,
      });
    } catch (error) {
      results.push({
        fileName: image.fileName,
        position: image.position,
        uploaded: false,
        storagePath,
        imageUrl,
        error:
          error instanceof Error
            ? error.message
            : 'Unexpected error while uploading the image.',
      });
    }
  }

  return results;
}
