abstract final class Validators {
  // Validation constants
  static const int minFullNameLength = 3;
  static const int minPasswordLength = 6;

  // Basic email format validation
  static final RegExp _emailRegex = RegExp(
    r'^[^\s@]+@[^\s@]+\.[^\s@]+$',
    caseSensitive: false,
  );

  /// Validates a user's full name.
  static String? fullName(String? value) {
    final name = value?.trim() ?? '';

    if (name.isEmpty) {
      return 'Full name is required.';
    }

    if (name.runes.length < minFullNameLength) {
      return 'Full name must contain at least $minFullNameLength characters.';
    }

    return null;
  }

  /// Validates an email address.
  static String? email(String? value) {
    final email = value?.trim() ?? '';

    if (email.isEmpty) {
      return 'Email address is required.';
    }

    if (!_emailRegex.hasMatch(email)) {
      return 'Please enter a valid email address.';
    }

    return null;
  }

  /// Validates a password.
  static String? password(String? value) {
    // Do not trim passwords because whitespace may be intentional.
    final password = value ?? '';

    if (password.isEmpty) {
      return 'Password is required.';
    }

    if (password.length < minPasswordLength) {
      return 'Password must contain at least $minPasswordLength characters.';
    }

    return null;
  }

  /// Returns a validator that checks whether two passwords match.
  static String? Function(String?) confirmPassword(
    String Function() getOriginalPassword,
  ) {
    return (value) {
      if (value == null || value.isEmpty) {
        return 'Please confirm your password.';
      }

      if (value != getOriginalPassword()) {
        return 'Passwords do not match.';
      }

      return null;
    };
  }
}