import type {
 ListingType,
 Property,
 PropertyType,
} from '../types/property';

export const MAX_PROPERTY_IMAGES = 5;
export const MAX_DESCRIPTION_LENGTH = 2000;

export const propertyTypes: { value: PropertyType; label: string }[] = [
 { value: 'apartment', label: 'Apartment' },
 { value: 'house', label: 'House' },
 { value: 'villa', label: 'Villa' },
 { value: 'land', label: 'Land' },
 { value: 'office', label: 'Office' },
 { value: 'shop', label: 'Shop' },
];

export const listingTypes: { value: ListingType; label: string }[] = [
 { value: 'sale', label: 'Sale' },
 { value: 'rent', label: 'Rent' },
];

export type FormField =
 | 'title'
 | 'propertyType'
 | 'listingType'
 | 'price'
 | 'city'
 | 'surface'
 | 'rooms'
 | 'bathrooms';

export type FormErrors = Partial<Record<FormField, string>>;

export interface PropertyFormValues {
 title: string;
 propertyType: PropertyType | null;
 listingType: ListingType | null;
 price: string;
 city: string;
 address: string;
 description: string;
 surface: string;
 rooms: string;
 bathrooms: string;
}

export interface ValidatedPropertyForm {
 errors: FormErrors;
 payload: {
 title: string;
 propertyType: PropertyType;
 listingType: ListingType;
 price: number;
 city: string;
 address: string | null;
 description: string | null;
 surface: number | null;
 rooms: number | null;
 bathrooms: number | null;
 } | null;
}

export const EMPTY_FORM_VALUES: PropertyFormValues = {
 title: '',
 propertyType: null,
 listingType: null,
 price: '',
 city: '',
 address: '',
 description: '',
 surface: '',
 rooms: '',
 bathrooms: '',
};

/** Formats a raw price string as "1 250 000" or "1 250 000.50" (max 2 decimals). */
export function formatPriceInput(raw: string): string {
 const cleaned = raw.replace(/[^\d.]/g, '');
 const [rawInt, ...decParts] = cleaned.split('.');
 const intPart = rawInt.replace(/^0+(?=\d)/, '');
 const decPart = decParts.join('').slice(0, 2);
 const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
 const hasDecimalPoint = cleaned.includes('.');
 if (hasDecimalPoint) return `${formattedInt}.${decPart}`;
 return formattedInt;
}

export function toPropertyFormValues(property: Property): PropertyFormValues {
 return {
 title: property.title,
 propertyType: property.property_type,
 listingType: property.listing_type,
 price: formatPriceInput(property.price.toString()),
 city: property.city,
 address: property.address ?? '',
 description: property.description ?? '',
 surface: property.surface_m2?.toString() ?? '',
 rooms: property.rooms?.toString() ?? '',
 bathrooms: property.bathrooms?.toString() ?? '',
 };
}

function parsePrice(value: string): number | undefined {
 const cleaned = value.replace(/\s/g, '').trim();
 if (!cleaned) return undefined;
 if (!/^\d*(?:\.\d{0,2})?$/.test(cleaned)) return undefined;
 const price = Number(cleaned);
 if (!Number.isFinite(price) || price < 0 || price > 9999999999.99) {
 return undefined;
 }
 return price;
}

function parseOptionalInteger(value: string): number | null | undefined {
 const trimmed = value.trim();
 if (!trimmed) return null;
 if (!/^\d+$/.test(trimmed)) return undefined;
 const parsed = Number(trimmed);
 return Number.isSafeInteger(parsed) && parsed <= 2147483647
 ? parsed
 : undefined;
}

export function validatePropertyForm(
 values: PropertyFormValues,
): ValidatedPropertyForm {
 const title = values.title.trim();
 const city = values.city.trim();
 const address = values.address.trim();
 const price = parsePrice(values.price);
 const surface = parseOptionalInteger(values.surface);
 const rooms = parseOptionalInteger(values.rooms);
 const bathrooms = parseOptionalInteger(values.bathrooms);
 const errors: FormErrors = {};

 if (title.length < 3 || title.length > 120) {
 errors.title = 'Enter a title between 3 and 120 characters.';
 }
 if (!values.propertyType) errors.propertyType = 'Select a property type.';
 if (!values.listingType) errors.listingType = 'Select a listing type.';
 if (price === undefined) {
 errors.price = 'Enter a valid non-negative price (max 2 decimals).';
 }
 if (!city) errors.city = 'Enter a city.';
 if (surface === undefined || surface === 0) {
 errors.surface = 'Surface must be a positive whole number.';
 }
 if (rooms === undefined) {
 errors.rooms = 'Rooms must be a non-negative whole number.';
 }
 if (bathrooms === undefined) {
 errors.bathrooms = 'Bathrooms must be a non-negative whole number.';
 }

 if (
 Object.keys(errors).length > 0 ||
 !values.propertyType ||
 !values.listingType ||
 price === undefined
 ) {
 return { errors, payload: null };
 }

 return {
 errors,
 payload: {
 title,
 propertyType: values.propertyType,
 listingType: values.listingType,
 price,
 city,
 address: address || null,
 description: values.description.trim() || null,
 surface: surface ?? null,
 rooms: rooms ?? null,
 bathrooms: bathrooms ?? null,
 },
 };
}