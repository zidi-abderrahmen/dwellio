import 'package:supabase_flutter/supabase_flutter.dart';

class UserProfile {
  const UserProfile({
    required this.id,
    required this.fullName,
    this.phone,
    this.avatarUrl,
    this.bio,
  });

  final String id;
  final String fullName;
  final String? phone;
  final String? avatarUrl;
  final String? bio;

  factory UserProfile.fromJson(Map<String, dynamic> json) {
    return UserProfile(
      id: json['id'] as String,
      fullName: json['full_name'] as String? ?? '',
      phone: json['phone'] as String?,
      avatarUrl: json['avatar_url'] as String?,
      bio: json['bio'] as String?,
    );
  }
}


class ProfileFailure implements Exception {
  const ProfileFailure(this.message);

  final String message;

  @override
  String toString() => message;
}

class ProfileService {
  ProfileService(this._client);

  final SupabaseClient _client;

  static const String _profileColumns =
      'id, full_name, phone, avatar_url, bio';

  /// Retrieves the currently authenticated user's profile.
  Future<UserProfile> getMyProfile() async {
    final user = _client.auth.currentUser;

    if (user == null) {
      throw const ProfileFailure(
        'You must be signed in to view your profile.',
      );
    }

    try {
      final data = await _client
          .from('profiles')
          .select(_profileColumns)
          .eq('id', user.id)
          .maybeSingle();

      if (data == null) {
        throw const ProfileFailure(
          'Your profile could not be found.',
        );
      }

      return UserProfile.fromJson(data);
    } on ProfileFailure {
      rethrow;
    } on PostgrestException {
      throw const ProfileFailure(
        'Unable to load your profile. Please try again.',
      );
    }
  }

  /// Updates the currently authenticated user's profile.
  Future<UserProfile> updateMyProfile({
    required String fullName,
    required String? phone,
    required String? avatarUrl,
    required String? bio,
  }) async {
    final user = _client.auth.currentUser;

    if (user == null) {
      throw const ProfileFailure(
        'You must be signed in to update your profile.',
      );
    }

    try {
      final data = await _client
          .from('profiles')
          .update({
            'full_name': fullName.trim(),
            'phone': _normalize(phone),
            'avatar_url': _normalize(avatarUrl),
            'bio': _normalize(bio),
          })
          .eq('id', user.id)
          .select(_profileColumns)
          .single();

      return UserProfile.fromJson(data);
    } on PostgrestException {
      throw const ProfileFailure(
        'Unable to update your profile. Please try again.',
      );
    }
  }

  String? _normalize(String? value) {
    final normalized = value?.trim();

    return normalized == null || normalized.isEmpty
        ? null
        : normalized;
  }
}