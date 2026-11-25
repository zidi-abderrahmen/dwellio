import { useCallback, useState } from 'react';
import { locationService } from '../services/locationService';

export interface LatLng {
 latitude: number;
 longitude: number;
}

export function useLocationPicker() {
 const [location, setLocationState] = useState<LatLng | null>(null);
 const [error, setError] = useState<string | null>(null);
 const [locating, setLocating] = useState(false);
 // Bumped whenever the map should fly to `location` (programmatic moves only).
 const [focusToken, setFocusToken] = useState(0);

 const set = useCallback(
 (loc: LatLng | null, options?: { animate?: boolean }) => {
 setLocationState(loc);
 setError(null);
 if (options?.animate && loc) {
 setFocusToken((n) => n + 1);
 }
 },
 [],
 );

 const detect = useCallback(async () => {
 setLocating(true);
 setError(null);
 try {
 const position = await locationService.getCurrentPosition();
 setLocationState({
 latitude: position.latitude,
 longitude: position.longitude,
 });
 setFocusToken((n) => n + 1);
 } catch (err) {
 setError(
 err instanceof Error
 ? err.message
 : 'Unable to retrieve your location.',
 );
 } finally {
 setLocating(false);
 }
 }, []);

 const clearError = useCallback(() => setError(null), []);

 return {
 location,
 error,
 locating,
 focusToken,
 set,
 detect,
 clearError,
 setError,
 };
}