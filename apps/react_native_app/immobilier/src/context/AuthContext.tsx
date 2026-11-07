import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  type PropsWithChildren,
} from 'react';

import type { Session } from '@supabase/supabase-js';

import { supabase } from '../lib/supabase';

interface AuthContextValue {
  session: Session | null;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(
  undefined,
);

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    let authEventReceived = false;

    // Listen for authentication changes.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      authEventReceived = true;

      if (!isMounted) return;

      setSession(nextSession);
      setIsLoading(false);
    });

    // Retrieve the initial session.
    supabase.auth.getSession().then(({ data, error }) => {
      if (!isMounted || authEventReceived) return;

      if (error) {
        console.error('Unable to retrieve session:', error);
      }

      setSession(data.session);
      setIsLoading(false);
    }).catch((error) => {
      if (!isMounted || authEventReceived) return;

      console.error('Unable to retrieve session:', error);
      setSession(null);
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ session, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthSession(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      'useAuthSession must be used inside AuthProvider.',
    );
  }

  return context;
}