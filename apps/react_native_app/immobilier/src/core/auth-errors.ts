/** Converts Supabase Auth errors into the same user-facing messages as Flutter. */
export function getFriendlyAuthErrorMessage(error: unknown): string {
  if (!error || typeof error !== 'object') {
    return 'Something went wrong. Please try again.';
  }

  const authError = error as {
    code?: unknown;
    message?: unknown;
    name?: unknown;
  };

  const code = typeof authError.code === 'string' ? authError.code : '';
  const message =
    typeof authError.message === 'string'
      ? authError.message.toLowerCase()
      : '';
  const name = typeof authError.name === 'string' ? authError.name : '';

  if (
    name === 'AuthRetryableFetchError' ||
    name === 'AuthRetryableFetchException' ||
    message.includes('network') ||
    message.includes('fetch failed') ||
    message.includes('timeout')
  ) {
    return 'Connection problem. Please check your internet connection.';
  }

  if (
    code === 'invalid_credentials' ||
    message.includes('invalid login credentials')
  ) {
    return 'Incorrect email or password.';
  }

  if (
    code === 'email_not_confirmed' ||
    message.includes('email not confirmed')
  ) {
    return 'Please verify your email address before signing in.';
  }

  if (
    code === 'user_already_exists' ||
    message.includes('already registered')
  ) {
    return 'An account with this email address already exists.';
  }

  if (code === 'weak_password' || message.includes('password should be')) {
    return 'Password is too weak (minimum 6 characters).';
  }

  if (code.includes('rate_limit') || message.includes('rate limit')) {
    return 'Too many attempts. Please try again in a few minutes.';
  }

  if (
    code === 'email_address_invalid' ||
    message.includes('invalid email')
  ) {
    return 'Invalid email address.';
  }

  return 'Something went wrong. Please try again.';
}
