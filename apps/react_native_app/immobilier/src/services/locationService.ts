import * as Location from 'expo-location';

export interface LocationCoordinates {
 latitude: number;
 longitude: number;
}

export class LocationServiceError extends Error {
 constructor(message: string) {
 super(message);
 this.name = 'LocationServiceError';
 Object.setPrototypeOf(this, LocationServiceError.prototype);
 }
}

/**
 * Utility for retrieving the device's current location using Expo Location.
 *
 * Handles location-service availability, foreground permission requests,
 * denied permissions, and returns the current coordinates in a reusable
 * structure. It does not automatically save the device's location to a
 * property.
 */
export const locationService = {
 /** Checks whether location services are enabled on the device. */
 async isLocationEnabled(): Promise<boolean> {
 try {
 return await Location.hasServicesEnabledAsync();
 } catch {
 return false;
 }
 },

 /** Returns the current foreground location permission response. */
 async getForegroundPermissionStatus(): Promise<Location.PermissionResponse> {
 return await Location.getForegroundPermissionsAsync();
 },

 /**
 * Requests foreground location permission if not already granted.
 * Resolves with the resulting permission response.
 */
 async requestForegroundPermission(): Promise<Location.PermissionResponse> {
 const current = await this.getForegroundPermissionStatus();

 if (current.status === 'granted') {
 return current;
 }

 return await Location.requestForegroundPermissionsAsync();
 },

 /**
 * Retrieves the device's current position.
 *
 * Checks service availability, requests foreground permission when needed,
 * and throws a LocationServiceError when permission is denied or the
 * location could not be determined.
 */
 async getCurrentPosition(): Promise<LocationCoordinates> {
 const enabled = await this.isLocationEnabled();
 if (!enabled) {
 throw new LocationServiceError(
 'Location services are disabled on this device.',
 );
 }

 const permission = await this.requestForegroundPermission();

 if (permission.status !== 'granted') {
 throw new LocationServiceError(
 'Location permission is required to retrieve your current position.',
 );
 }

 try {
 const location = await Location.getCurrentPositionAsync({
 accuracy: Location.Accuracy.Balanced,
 });

 return {
 latitude: location.coords.latitude,
 longitude: location.coords.longitude,
 };
 } catch (error) {
 if (error instanceof LocationServiceError) {
 throw error;
 }
 throw new LocationServiceError(
 'Unable to retrieve your current position. Please try again.',
 );
 }
 },
};