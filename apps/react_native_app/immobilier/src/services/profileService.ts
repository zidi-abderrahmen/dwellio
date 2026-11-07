import type { SupabaseClient } from '@supabase/supabase-js';

import { supabase } from '../lib/supabase';

export interface UserProfile {
  readonly id: string;
  readonly fullName: string;
  readonly phone: string | null;
  readonly avatarUrl: string | null;
  readonly bio: string | null;
}

interface ProfileRow {
  id: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  bio: string | null;
}

export class ProfileFailure extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProfileFailure';
    Object.setPrototypeOf(this, ProfileFailure.prototype);
  }
}

export class ProfileService {
  private static readonly profileColumns =
    'id, full_name, phone, avatar_url, bio';

  constructor(private readonly client: SupabaseClient = supabase) {}

  /** Retrieves the currently authenticated user's profile. */
  async getMyProfile(): Promise<UserProfile> {
    const {
      data: { session },
      error: sessionError,
    } = await this.client.auth.getSession();

    if (sessionError || !session?.user) {
      throw new ProfileFailure(
        'You must be signed in to view your profile.',
      );
    }

    try {
      const { data, error } = await this.client
        .from('profiles')
        .select(ProfileService.profileColumns)
        .eq('id', session.user.id)
        .maybeSingle();

      if (error) {
        throw new ProfileFailure(
          'Unable to load your profile. Please try again.',
        );
      }

      if (data === null) {
        throw new ProfileFailure('Your profile could not be found.');
      }

      return this.mapUserProfile(data as ProfileRow);
    } catch (error) {
      if (error instanceof ProfileFailure) {
        throw error;
      }

      throw new ProfileFailure(
        'Unable to load your profile. Please try again.',
      );
    }
  }

  /** Updates the currently authenticated user's profile. */
  async updateMyProfile({
    fullName,
    phone,
    avatarUrl,
    bio,
  }: {
    fullName: string;
    phone: string | null;
    avatarUrl: string | null;
    bio: string | null;
  }): Promise<UserProfile> {
    const {
      data: { session },
      error: sessionError,
    } = await this.client.auth.getSession();

    if (sessionError || !session?.user) {
      throw new ProfileFailure(
        'You must be signed in to update your profile.',
      );
    }

    try {
      const { data, error } = await this.client
        .from('profiles')
        .update({
          full_name: fullName.trim(),
          phone: this.normalize(phone),
          avatar_url: this.normalize(avatarUrl),
          bio: this.normalize(bio),
        })
        .eq('id', session.user.id)
        .select(ProfileService.profileColumns)
        .single();

      if (error) {
        throw new ProfileFailure(
          'Unable to update your profile. Please try again.',
        );
      }

      return this.mapUserProfile(data as ProfileRow);
    } catch (error) {
      if (error instanceof ProfileFailure) {
        throw error;
      }

      throw new ProfileFailure(
        'Unable to update your profile. Please try again.',
      );
    }
  }

  private mapUserProfile(row: ProfileRow): UserProfile {
    return {
      id: row.id,
      fullName: row.full_name ?? '',
      phone: row.phone ?? null,
      avatarUrl: row.avatar_url ?? null,
      bio: row.bio ?? null,
    };
  }

  private normalize(value: string | null): string | null {
    const normalized = value?.trim();

    return normalized === undefined || normalized.length === 0
      ? null
      : normalized;
  }
}

export const profileService = new ProfileService();
