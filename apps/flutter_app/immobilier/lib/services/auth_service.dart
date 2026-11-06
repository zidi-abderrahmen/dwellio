import 'package:supabase_flutter/supabase_flutter.dart';

class AuthFailure implements Exception {
  const AuthFailure(this.message);
  final String message;

  @override
  String toString() => message;
}

class AuthService {
  AuthService(this._client);

  final SupabaseClient _client;

  Stream<AuthState> get authChanges => _client.auth.onAuthStateChange;
  Session? get currentSession => _client.auth.currentSession;
  User? get currentUser => _client.auth.currentUser;

  Future<AuthResponse> signUp({
    required String fullName,
    required String email,
    required String password,
  }) async {
    try {
      return await _client.auth.signUp(
        email: email.trim(),
        password: password,
        data: {'full_name': fullName.trim()},
      );
    } on AuthException catch (e) {
      throw AuthFailure(_friendlyMessage(e));
    } catch (_) {
      throw const AuthFailure(
        'Problème de connexion. Vérifiez votre internet.',
      );
    }
  }

  Future<AuthResponse> signIn({
    required String email,
    required String password,
  }) async {
    try {
      return await _client.auth.signInWithPassword(
        email: email.trim(),
        password: password,
      );
    } on AuthException catch (e) {
      throw AuthFailure(_friendlyMessage(e));
    } catch (_) {
      throw const AuthFailure(
        'Problème de connexion. Vérifiez votre internet.',
      );
    }
  }

  Future<Map<String, dynamic>> getProfile() async {
    final user = _client.auth.currentUser;
    if (user == null) {
      throw const AuthFailure('You must be signed in to view your profile.');
    }

    try {
      final profile = await _client
          .from('profiles')
          .select('full_name, phone, avatar_url, bio')
          .eq('id', user.id)
          .maybeSingle();

      if (profile == null) {
        throw const AuthFailure(
          'Your profile record was not found. Please contact support.',
        );
      }

      return profile;
    } on AuthFailure {
      rethrow;
    } on PostgrestException catch (e) {
      throw AuthFailure(e.message);
    } catch (_) {
      throw const AuthFailure('Unable to load your profile. Please try again.');
    }
  }

  Future<UserResponse> updateProfile({
    required String fullName,
    required String phone,
    required String avatarUrl,
    required String bio,
    String? password,
  }) async {
    final user = _client.auth.currentUser;
    if (user == null) {
      throw const AuthFailure('You must be signed in to update your profile.');
    }

    try {
      final response = await _client.auth.updateUser(
        UserAttributes(
          data: {
            'full_name': fullName.trim(),
            'phone': phone.trim(),
            'avatar_url': avatarUrl.trim(),
            'bio': bio.trim(),
          },
          password: password == null || password.isEmpty ? null : password,
        ),
      );
      final updatedProfile = await _client
          .from('profiles')
          .update({
            'full_name': fullName.trim(),
            'phone': phone.trim(),
            'avatar_url': avatarUrl.trim(),
            'bio': bio.trim(),
          })
          .eq('id', user.id)
          .select('id')
          .maybeSingle();

      if (updatedProfile == null) {
        throw const AuthFailure(
          'Your profile record was not found. Please contact support.',
        );
      }

      return response;
    } on AuthException catch (e) {
      throw AuthFailure(_friendlyMessage(e));
    } on AuthFailure {
      rethrow;
    } on PostgrestException catch (e) {
      throw AuthFailure(e.message);
    } catch (_) {
      throw const AuthFailure(
        'Problème de connexion. Vérifiez votre internet.',
      );
    }
  }

  Future<void> signOut() async {
    try {
      await _client.auth.signOut();
    } on AuthException catch (e) {
      throw AuthFailure(_friendlyMessage(e));
    } catch (_) {
      throw const AuthFailure('Impossible de se déconnecter. Réessayez.');
    }
  }

  String _friendlyMessage(AuthException e) {
    if (e is AuthRetryableFetchException) {
      return 'Problème de connexion. Vérifiez votre internet.';
    }

    final code = e.code ?? '';
    final msg = e.message.toLowerCase();

    if (code == 'invalid_credentials' ||
        msg.contains('invalid login credentials')) {
      return 'Email ou mot de passe incorrect.';
    }
    if (code == 'email_not_confirmed' || msg.contains('email not confirmed')) {
      return 'Veuillez confirmer votre email avant de vous connecter.';
    }
    if (code == 'user_already_exists' || msg.contains('already registered')) {
      return 'Un compte existe déjà avec cet email.';
    }
    if (code == 'weak_password' || msg.contains('password should be')) {
      return 'Mot de passe trop faible (6 caractères minimum).';
    }
    if (code.contains('rate_limit') || msg.contains('rate limit')) {
      return 'Trop de tentatives. Réessayez dans quelques minutes.';
    }
    if (code == 'email_address_invalid' || msg.contains('invalid email')) {
      return 'Adresse email invalide.';
    }
    return 'Une erreur est survenue. Réessayez.';
  }
}
