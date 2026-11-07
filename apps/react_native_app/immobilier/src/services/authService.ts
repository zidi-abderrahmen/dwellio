import type {
  AuthChangeEvent,
  Session,
  SupabaseClient,
  User,
} from '@supabase/supabase-js';

import { supabase } from '../lib/supabase';

/** Represents an application-level authentication error. */
export class AuthFailure extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthFailure';

    // Required when targeting some older JavaScript runtimes.
    Object.setPrototypeOf(this, AuthFailure.prototype);
  }
}

type AuthStateListener = (
  event: AuthChangeEvent,
  session: Session | null,
) => void;

type SupabaseErrorLike = {
  name?: string;
  code?: string;
  message?: string;
};

/**
 * Handles authentication operations through Supabase Auth.
 *
 * The Supabase JavaScript SDK returns { data, error } for authentication
 * operations. This service converts those errors into AuthFailure instances
 * so screens can handle authentication errors consistently.
 */
export class AuthService {
  constructor(private readonly client: SupabaseClient) {}

  // ---------------------------------------------------------------------------
  // Authentication state
  // ---------------------------------------------------------------------------

  /**
   * Subscribes to authentication state changes.
   * Call the returned subscription's unsubscribe() method when no longer needed.
   */
  onAuthStateChange(callback: AuthStateListener) {
    const {
      data: { subscription },
    } = this.client.auth.onAuthStateChange(callback);

    return subscription;
  }

  /** Returns the current authenticated session, or null if unauthenticated. */
  async getCurrentSession(): Promise<Session | null> {
    try {
      const { data, error } = await this.client.auth.getSession();

      if (error) {
        throw this.toAuthFailure(error, 'Unable to retrieve your session. Please try again.');
      }

      return data.session;
    } catch (error) {
      if (error instanceof AuthFailure) throw error;

      throw this.toAuthFailure(
        error,
        'Unable to retrieve your session. Please try again.',
      );
    }
  }

  /** Returns the currently authenticated user, or null if unauthenticated. */
  async getCurrentUser(): Promise<User | null> {
    const session = await this.getCurrentSession();
    return session?.user ?? null;
  }

  // ---------------------------------------------------------------------------
  // Authentication operations
  // ---------------------------------------------------------------------------

  /** Registers a new user with their full name, email, and password. */
  async signUp({
    fullName,
    email,
    password,
  }: {
    fullName: string;
    email: string;
    password: string;
  }) {
    try {
      const { data, error } = await this.client.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
          },
        },
      });

      if (error) throw this.toAuthFailure(error);

      return data;
    } catch (error) {
      if (error instanceof AuthFailure) throw error;

      throw this.toAuthFailure(error);
    }
  }

  /** Authenticates an existing user using their email and password. */
  async signIn({
    email,
    password,
  }: {
    email: string;
    password: string;
  }) {
    try {
      const { data, error } = await this.client.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) throw this.toAuthFailure(error);

      return data;
    } catch (error) {
      if (error instanceof AuthFailure) throw error;

      throw this.toAuthFailure(error);
    }
  }

  /** Signs out the currently authenticated user. */
  async signOut(): Promise<void> {
    try {
      const { error } = await this.client.auth.signOut();

      if (error) throw this.toAuthFailure(error, 'Unable to sign out. Please try again.');
    } catch (error) {
      if (error instanceof AuthFailure) throw error;

      throw this.toAuthFailure(
        error,
        'Unable to sign out. Please try again.',
      );
    }
  }

  /** Updates the password of the currently authenticated user. */
  async updatePassword(password: string): Promise<void> {
    try {
      const { error } = await this.client.auth.updateUser({ password });

      if (error) throw this.toAuthFailure(error, 'Unable to update your password. Please try again.');
    } catch (error) {
      if (error instanceof AuthFailure) throw error;

      throw this.toAuthFailure(
        error,
        'Unable to update your password. Please try again.',
      );
    }
  }

  // ---------------------------------------------------------------------------
  // Error handling
  // ---------------------------------------------------------------------------

  /** Converts Supabase authentication errors into user-friendly messages. */
  private toAuthFailure(
    error: unknown,
    fallback = 'Something went wrong. Please try again.',
  ): AuthFailure {
    if (error instanceof AuthFailure) return error;

    const authError = (error ?? {}) as SupabaseErrorLike;
    const code = authError.code ?? '';
    const name = authError.name ?? '';
    const message = (authError.message ?? '').toLowerCase();

    if (
      name === 'AuthRetryableFetchError' ||
      error instanceof TypeError ||
      message.includes('failed to fetch') ||
      message.includes('network request failed')
    ) {
      return new AuthFailure(
        'Connection problem. Please check your internet connection.',
      );
    }

    if (
      code === 'invalid_credentials' ||
      message.includes('invalid login credentials')
    ) {
      return new AuthFailure('Incorrect email or password.');
    }

    if (
      code === 'email_not_confirmed' ||
      message.includes('email not confirmed')
    ) {
      return new AuthFailure(
        'Please verify your email address before signing in.',
      );
    }

    if (
      code === 'user_already_exists' ||
      message.includes('already registered')
    ) {
      return new AuthFailure(
        'An account with this email address already exists.',
      );
    }

    if (code === 'weak_password' || message.includes('password should be')) {
      return new AuthFailure(
        'Password is too weak (minimum 6 characters).',
      );
    }

    if (code.includes('rate_limit') || message.includes('rate limit')) {
      return new AuthFailure(
        'Too many attempts. Please try again in a few minutes.',
      );
    }

    if (
      code === 'email_address_invalid' ||
      message.includes('invalid email')
    ) {
      return new AuthFailure('Invalid email address.');
    }

    return new AuthFailure(fallback);
  }
}

// -----------------------------------------------------------------------------
// Shared service instance and named functions
// -----------------------------------------------------------------------------

export const authService = new AuthService(supabase);

/** Registers a user. Positional arguments are kept convenient for screen use. */
export const signUp = (email: string, password: string, fullName: string) =>
  authService.signUp({ email, password, fullName });

/** Signs in a user. */
export const signIn = (email: string, password: string) =>
  authService.signIn({ email, password });

/** Signs out the current user. */
export const signOut = () => authService.signOut();

/** Updates the current user's password. */
export const updatePassword = (password: string) =>
  authService.updatePassword(password);

/** Returns the current session. */
export const getCurrentSession = () => authService.getCurrentSession();

/** Returns the current user. */
export const getCurrentUser = () => authService.getCurrentUser();

/** Subscribes to Supabase authentication changes. */
export const onAuthStateChange = (callback: AuthStateListener) =>
  authService.onAuthStateChange(callback);
