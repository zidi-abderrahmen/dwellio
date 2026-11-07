
export class Validators {
  // Validation constants
  static readonly minFullNameLength = 3;
  static readonly minPasswordLength = 6;

  // Basic email format validation
  private static readonly emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

  /**
   * Validates a user's full name.
   */
  static fullName(value: string | null | undefined): string | null {
    const name = value?.trim() ?? '';

    if (name.length === 0) {
      return 'Full name is required.';
    }

    // Array.from counts Unicode code points, matching Dart's runes.length.
    if (Array.from(name).length < Validators.minFullNameLength) {
      return `Full name must contain at least ${Validators.minFullNameLength} characters.`;
    }

    return null;
  }

  /**
   * Validates an email address.
   */
  static email(value: string | null | undefined): string | null {
    const email = value?.trim() ?? '';

    if (email.length === 0) {
      return 'Email address is required.';
    }

    if (!Validators.emailRegex.test(email)) {
      return 'Please enter a valid email address.';
    }

    return null;
  }

  /**
   * Validates a password.
   */
  static password(value: string | null | undefined): string | null {
    // Do not trim passwords because whitespace may be intentional.
    const password = value ?? '';

    if (password.length === 0) {
      return 'Password is required.';
    }

    if (Array.from(password).length < Validators.minPasswordLength) {
      return `Password must contain at least ${Validators.minPasswordLength} characters.`;
    }

    return null;
  }

  /**
   * Returns a validator that checks whether two passwords match.
   */
  static confirmPassword(
    getOriginalPassword: () => string,
  ): (value: string | null | undefined) => string | null {
    return (value) => {
      if (value === null || value === undefined || value.length === 0) {
        return 'Please confirm your password.';
      }

      if (value !== getOriginalPassword()) {
        return 'Passwords do not match.';
      }

      return null;
    };
  }
}
