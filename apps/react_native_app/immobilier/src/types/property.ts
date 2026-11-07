// --------------------------------------------------
// Database enum types — public.properties
// --------------------------------------------------

export type ListingType = 'sale' | 'rent';

export type PropertyType =
  | 'apartment'
  | 'house'
  | 'villa'
  | 'land'
  | 'office'
  | 'shop';

export type PropertyStatus = 'active' | 'sold' | 'rented' | 'hidden';

// --------------------------------------------------
// Property — matches the public.properties row
// --------------------------------------------------

export interface Property {
  id: string;
  owner_id: string;
  title: string;
  description: string | null;
  listing_type: ListingType;
  property_type: PropertyType;
  price: number;
  surface_m2: number | null;
  rooms: number | null;
  bathrooms: number | null;
  city: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  status: PropertyStatus;
  created_at: string;
  updated_at: string;
}

// Kept as an alias for code that already uses the old PropertyRow name.
export type PropertyRow = Property;

// --------------------------------------------------
// PropertyImage — matches the public.property_images row
// --------------------------------------------------

export interface PropertyImage {
  id: string;
  property_id: string;
  image_url: string;
  storage_path: string;
  position: number;
  created_at: string;
}

// --------------------------------------------------
// OwnerProfile — matches the public.profiles row
// --------------------------------------------------

export interface OwnerProfile {
  id: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
  updated_at: string;
}

// --------------------------------------------------
// Property relations returned by Supabase joins
// --------------------------------------------------

export interface PropertyWithRelations extends Property {
  property_images: PropertyImage[];
  profiles: OwnerProfile | null;
}

// Narrow relation types for list/search queries that select only preview fields.
export type PropertyImagePreview = Pick<PropertyImage, 'image_url' | 'position'>;

export type OwnerProfilePreview = Pick<
  OwnerProfile,
  'full_name' | 'phone' | 'avatar_url'
>;

export interface PropertySearchResult extends Property {
  property_images: PropertyImagePreview[];
  profiles: OwnerProfilePreview | null;
}

// --------------------------------------------------
// PropertyCard — only the fields displayed by the card
// --------------------------------------------------

export type PropertyCardData = Pick<
  Property,
  | 'id'
  | 'title'
  | 'listing_type'
  | 'property_type'
  | 'price'
  | 'surface_m2'
  | 'rooms'
  | 'city'
>;

