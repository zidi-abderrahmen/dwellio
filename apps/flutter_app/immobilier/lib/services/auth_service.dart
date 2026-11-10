import 'package:supabase_flutter/supabase_flutter.dart';

/// Represents an application-level authentication error.
class AuthFailure implements Exception {
  const AuthFailure(this.message);

  final String message;

  @override
  String toString() => message;
}

/// Handles authentication operations through Supabase Auth.
class AuthService {
  AuthService(this._client);

  final SupabaseClient _client;

  // ---------------------------------------------------------------------------
  // Authentication state
  // ---------------------------------------------------------------------------

  /// Stream of authentication state changes.
  Stream<AuthState> get authChanges => _client.auth.onAuthStateChange;

  /// Returns the current authenticated session, or null if unauthenticated.
  Session? get currentSession => _client.auth.currentSession;

  /// Returns the currently authenticated user, or null if unauthenticated.
  User? get currentUser => _client.auth.currentUser;

  // ---------------------------------------------------------------------------
  // Authentication operations
  // ---------------------------------------------------------------------------

  /// Registers a new user with their full name, email, and password.
  Future<AuthResponse> signUp({
    required String fullName,
    required String email,
    required String password,
  }) async {
    try {
      return await _client.auth.signUp(
        email: email.trim(),
        password: password,
        data: {
          'full_name': fullName.trim(),
        },
      );
    } on AuthException catch (e) {
      throw AuthFailure(_friendlyMessage(e));
    } catch (_) {
      throw const AuthFailure(
        'Connection problem. Please check your internet connection.',
      );
    }
  }

  /// Authenticates an existing user using their email and password.
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
        'Connection problem. Please check your internet connection.',
      );
    }
  }

  /// Signs out the currently authenticated user.
  Future<void> signOut() async {
    try {
      await _client.auth.signOut();
    } on AuthException catch (e) {
      throw AuthFailure(_friendlyMessage(e));
    } catch (_) {
      throw const AuthFailure(
        'Unable to sign out. Please try again.',
      );
    }
  }

  /// Updates the password of the currently authenticated user.
  Future<void> updatePassword(String password) async {
    try {
      await _client.auth.updateUser(
        UserAttributes(password: password),
      );
    } on AuthException catch (e) {
      throw AuthFailure(_friendlyMessage(e));
    } catch (_) {
      throw const AuthFailure(
        'Unable to update your password. Please try again.',
      );
    }
  }

  // ---------------------------------------------------------------------------
  // Error handling
  // ---------------------------------------------------------------------------

  /// Converts Supabase authentication errors into user-friendly messages.
  String _friendlyMessage(AuthException exception) {
    if (exception is AuthRetryableFetchException) {
      return 'Connection problem. Please check your internet connection.';
    }

    final code = exception.code ?? '';
    final message = exception.message.toLowerCase();

    if (code == 'invalid_credentials' ||
        message.contains('invalid login credentials')) {
      return 'Incorrect email or password.';
    }

    if (code == 'email_not_confirmed' ||
        message.contains('email not confirmed')) {
      return 'Please verify your email address before signing in.';
    }

    if (code == 'user_already_exists' ||
        message.contains('already registered')) {
      return 'An account with this email address already exists.';
    }

    if (code == 'weak_password' ||
        message.contains('password should be')) {
      return 'Password is too weak (minimum 6 characters).';
    }

    if (code.contains('rate_limit') ||
        message.contains('rate limit')) {
      return 'Too many attempts. Please try again in a few minutes.';
    }

    if (code == 'email_address_invalid' ||
        message.contains('invalid email')) {
      return 'Invalid email address.';
    }

    return 'Something went wrong. Please try again.';
  }
}