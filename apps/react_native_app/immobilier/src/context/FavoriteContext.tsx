import React, {
 createContext,
 useCallback,
 useContext,
 useEffect,
 useRef,
 useState,
 type PropsWithChildren,
} from 'react';

import { supabase } from '../lib/supabase';
import { favoriteService } from '../services/favoriteService';
import type { PropertyWithRelations } from '../types/property';

interface FavoriteContextValue {
 favoriteIds: Set<string>;
 loading: boolean;
 error: string | null;
 load: () => Promise<void>;
 add: (propertyId: string) => Promise<void>;
 remove: (propertyId: string) => Promise<void>;
 clear: () => void;
 getFavoriteProperties: () => Promise<PropertyWithRelations[]>;
}

const FavoriteContext = createContext<FavoriteContextValue | undefined>(
 undefined,
);

export function FavoriteProvider({ children }: PropsWithChildren) {
 const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
 const [loading, setLoading] = useState(false);
 const [error, setError] = useState<string | null>(null);
 const inFlight = useRef<Set<string>>(new Set());

 const load = useCallback(async () => {
 const { data: sessionData, error: sessionError } =
 await supabase.auth.getSession();

 if (sessionError || !sessionData.session?.user) {
 setFavoriteIds(new Set());
 return;
 }

 setLoading(true);
 setError(null);

 try {
 const ids = await favoriteService.getFavoritePropertyIds();
 setFavoriteIds(ids);
 } catch (err) {
 setError(
 err instanceof Error ? err.message : 'Unable to load favorites.',
 );
 } finally {
 setLoading(false);
 }
 }, []);

 const add = useCallback(
 async (propertyId: string) => {
 if (inFlight.current.has(propertyId)) return;
 if (favoriteIds.has(propertyId)) return;

 inFlight.current.add(propertyId);

 const previous = new Set(favoriteIds);
 setFavoriteIds((current) => new Set([...current, propertyId]));

 try {
 await favoriteService.addFavorite(propertyId);
 } catch (err) {
 setFavoriteIds(previous);
 setError(
 err instanceof Error ? err.message : 'Unable to add to favorites.',
 );
 throw err;
 } finally {
 inFlight.current.delete(propertyId);
 }
 },
 [favoriteIds],
 );

 const remove = useCallback(
 async (propertyId: string) => {
 if (inFlight.current.has(propertyId)) return;
 if (!favoriteIds.has(propertyId)) return;

 inFlight.current.add(propertyId);

 const previous = new Set(favoriteIds);
 setFavoriteIds((current) => {
 const next = new Set(current);
 next.delete(propertyId);
 return next;
 });

 try {
 await favoriteService.removeFavorite(propertyId);
 } catch (err) {
 setFavoriteIds(previous);
 setError(
 err instanceof Error ? err.message : 'Unable to remove from favorites.',
 );
 throw err;
 } finally {
 inFlight.current.delete(propertyId);
 }
 },
 [favoriteIds],
 );

 const clear = useCallback(() => {
 setFavoriteIds(new Set());
 setError(null);
 }, []);

 const getFavoriteProperties = useCallback(
 async (): Promise<PropertyWithRelations[]> => {
 return favoriteService.getFavoriteProperties();
 },
 [],
 );

 // Reload favorites whenever the authenticated user changes.
 useEffect(() => {
 void load();
 }, [load]);

 const value: FavoriteContextValue = {
 favoriteIds,
 loading,
 error,
 load,
 add,
 remove,
 clear,
 getFavoriteProperties,
 };

 return (
 <FavoriteContext.Provider value={value}>{children}</FavoriteContext.Provider>
 );
}

export function useFavorite() {
 const context = useContext(FavoriteContext);

 if (!context) {
 throw new Error('useFavorite must be used within a FavoriteProvider.');
 }

 return context;
}
