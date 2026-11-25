import React, { useEffect, useRef, useState } from 'react';
import {
  Keyboard,
  StyleSheet,
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';

import { useLocalSearchParams, useRouter } from 'expo-router';
import { HelperText, TextInput } from 'react-native-paper';

import { Validators } from '../../core/validators';
import { getFriendlyAuthErrorMessage } from '../../core/auth-errors';
import { signUp } from '../../services/authService';
import { theme, spacing } from '../../theme';

import {
  AuthCard,
  AuthHeader,
  AuthScaffold,
  AuthSubmitButton,
  AuthSwitchPrompt,
} from '../../components/auth/AuthFormWidgets';

const colors = theme.colors;

type FormErrors = {
  fullName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
};

export default function RegisterScreen() {
  const router = useRouter();

  const params = useLocalSearchParams<{ from?: string | string[] }>();
  const from = Array.isArray(params.from) ? params.from[0] : params.from;

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [obscure, setObscure] = useState(true);
  const [obscureConfirm, setObscureConfirm] = useState(true);

  const [loading, setLoading] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});

  const redirectTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (redirectTimeout.current !== null) {
        clearTimeout(redirectTimeout.current);
      }
    };
  }, []);

  const goToLogin = () => {
    router.replace({
      pathname: '/login' as never,
      params: from ? { from } : {},
    });
  };

  const clearError = (field: keyof FormErrors) => {
    setErrors(previous => ({
      ...previous,
      [field]: undefined,
    }));
  };

  const submit = async () => {
    const fullNameError = Validators.fullName(fullName.trim()) ?? undefined;
    const emailError = Validators.email(email.trim()) ?? undefined;
    const passwordError = Validators.password(password) ?? undefined;

    const confirmPasswordError =
      Validators.confirmPassword(() => password)(confirmPassword) ?? undefined;

    setErrors({
      fullName: fullNameError,
      email: emailError,
      password: passwordError,
      confirmPassword: confirmPasswordError,
    });

    if (
      fullNameError ||
      emailError ||
      passwordError ||
      confirmPasswordError
    ) {
      return;
    }

    Keyboard.dismiss();
    setLoading(true);

    try {
      const { session } = await signUp(
        email.trim(),
        password,
        fullName.trim(),
      );

      if (session === null) {
        setSnackbarMessage(
          'Account created successfully! Please check your email to confirm your account.',
        );

        redirectTimeout.current = setTimeout(() => {
          goToLogin();
        }, 2500);
      }

      // If a session exists, the root layout handles authentication.
    } catch (error) {
      setSnackbarMessage(getFriendlyAuthErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthScaffold
      leadingIcon="arrow-left"
      onLeadingPress={goToLogin}
      leadingDisabled={loading}
      snackbarMessage={snackbarMessage}
      onDismissSnackbar={() => setSnackbarMessage('')}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardContainer}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.headerContainer}>
            <View style={styles.brandIcon}>
              <Text style={styles.brandIconText}>⌂</Text>
            </View>

            <AuthHeader
              title="Create your account"
              subtitle="Start your journey with Dwellio."
            />

            <Text style={styles.headerDescription}>
              Find properties, explore opportunities and discover your next home.
            </Text>
          </View>

          {/* Registration form */}
          <AuthCard>
            <View style={styles.form}>

              <View style={styles.formHeading}>
                <Text style={styles.formTitle}>
                  Let's get started
                </Text>

                <Text style={styles.formSubtitle}>
                  Fill in your details to create your account.
                </Text>
              </View>

              {/* Full name */}
              <View>
                <TextInput
                  mode="outlined"
                  label="Full name"
                  placeholder="Enter your full name"
                  value={fullName}
                  onChangeText={value => {
                    setFullName(value);
                    if (errors.fullName) clearError('fullName');
                  }}
                  autoCapitalize="words"
                  autoComplete="name"
                  textContentType="name"
                  returnKeyType="next"
                  left={
                    <TextInput.Icon
                      icon="account-outline"
                      color={colors.onSurfaceVariant}
                    />
                  }
                  error={Boolean(errors.fullName)}
                  theme={theme}
                  style={styles.input}
                  outlineStyle={styles.inputOutline}
                  accessibilityLabel="Full name"
                />

                <HelperText
                  type="error"
                  visible={Boolean(errors.fullName)}
                  theme={theme}
                >
                  {errors.fullName}
                </HelperText>
              </View>

              {/* Email */}
              <View>
                <TextInput
                  mode="outlined"
                  label="Email address"
                  placeholder="example@email.com"
                  value={email}
                  onChangeText={value => {
                    setEmail(value);
                    if (errors.email) clearError('email');
                  }}
                  keyboardType="email-address"
                  textContentType="emailAddress"
                  autoComplete="email"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                  left={
                    <TextInput.Icon
                      icon="email-outline"
                      color={colors.onSurfaceVariant}
                    />
                  }
                  error={Boolean(errors.email)}
                  theme={theme}
                  style={styles.input}
                  outlineStyle={styles.inputOutline}
                  accessibilityLabel="Email address"
                />

                <HelperText
                  type="error"
                  visible={Boolean(errors.email)}
                  theme={theme}
                >
                  {errors.email}
                </HelperText>
              </View>

              {/* Password */}
              <View>
                <TextInput
                  mode="outlined"
                  label="Password"
                  placeholder="Create a password"
                  value={password}
                  onChangeText={value => {
                    setPassword(value);

                    if (errors.password || errors.confirmPassword) {
                      setErrors(previous => ({
                        ...previous,
                        password: undefined,
                        confirmPassword: undefined,
                      }));
                    }
                  }}
                  secureTextEntry={obscure}
                  textContentType="newPassword"
                  autoComplete="new-password"
                  autoCapitalize="none"
                  returnKeyType="next"
                  left={
                    <TextInput.Icon
                      icon="lock-outline"
                      color={colors.onSurfaceVariant}
                    />
                  }
                  right={
                    <TextInput.Icon
                      icon={obscure ? 'eye-outline' : 'eye-off-outline'}
                      onPress={() => setObscure(previous => !previous)}
                      accessibilityLabel={
                        obscure ? 'Show password' : 'Hide password'
                      }
                    />
                  }
                  error={Boolean(errors.password)}
                  theme={theme}
                  style={styles.input}
                  outlineStyle={styles.inputOutline}
                  accessibilityLabel="Password"
                />

                <HelperText
                  type="error"
                  visible={Boolean(errors.password)}
                  theme={theme}
                >
                  {errors.password}
                </HelperText>
              </View>

              {/* Confirm password */}
              <View>
                <TextInput
                  mode="outlined"
                  label="Confirm password"
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  onChangeText={value => {
                    setConfirmPassword(value);
                    if (errors.confirmPassword) {
                      clearError('confirmPassword');
                    }
                  }}
                  secureTextEntry={obscureConfirm}
                  textContentType="newPassword"
                  autoComplete="new-password"
                  autoCapitalize="none"
                  returnKeyType="done"
                  onSubmitEditing={() => void submit()}
                  left={
                    <TextInput.Icon
                      icon="lock-check-outline"
                      color={colors.onSurfaceVariant}
                    />
                  }
                  right={
                    <TextInput.Icon
                      icon={obscureConfirm ? 'eye-outline' : 'eye-off-outline'}
                      onPress={() =>
                        setObscureConfirm(previous => !previous)
                      }
                      accessibilityLabel={
                        obscureConfirm ? 'Show password' : 'Hide password'
                      }
                    />
                  }
                  error={Boolean(errors.confirmPassword)}
                  theme={theme}
                  style={styles.input}
                  outlineStyle={styles.inputOutline}
                  accessibilityLabel="Confirm password"
                />

                <HelperText
                  type="error"
                  visible={Boolean(errors.confirmPassword)}
                  theme={theme}
                >
                  {errors.confirmPassword}
                </HelperText>
              </View>

              {/* Submit */}
              <View style={styles.buttonContainer}>
                <AuthSubmitButton
                  label="Create account"
                  loading={loading}
                  onPress={() => void submit()}
                />
              </View>

              {/* Security information */}
              <View style={styles.securityContainer}>
                <Text style={styles.securityIcon}>✦</Text>

                <Text style={styles.securityText}>
                  Your personal information is protected.
                </Text>
              </View>
            </View>
          </AuthCard>

          {/* Login navigation */}
          <View style={styles.footer}>
            <AuthSwitchPrompt
              prompt="Already have an account?"
              actionLabel="Sign in"
              disabled={loading}
              onPress={goToLogin}
            />
          </View>

          <Text style={styles.footerCaption}>
            FIND YOUR PLACE. MAKE IT HOME.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </AuthScaffold>
  );
}

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
  },

  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingBottom: spacing.xl,
  },

  headerContainer: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },

  brandIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },

  brandIconText: {
    color: colors.onPrimary,
    fontSize: 42,
    fontWeight: '600',
    lineHeight: 48,
  },

  headerDescription: {
    color: colors.onSurfaceVariant,
    fontSize: 13,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 20,
    paddingHorizontal: spacing.md,
  },

  form: {
    gap: spacing.md,
  },

  formHeading: {
    marginBottom: spacing.sm,
  },

  formTitle: {
    fontSize: 23,
    fontWeight: '700',
    color: colors.onSurface,
    marginBottom: 5,
  },

  formSubtitle: {
    fontSize: 13,
    color: colors.onSurfaceVariant,
    lineHeight: 19,
  },

  input: {
    backgroundColor: colors.surface,
    fontSize: 14,
  },

  inputOutline: {
    borderRadius: 14,
  },

  buttonContainer: {
    marginTop: spacing.sm,
  },

  securityContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 7,
    marginTop: spacing.sm,
  },

  securityIcon: {
    color: colors.primary,
    fontSize: 15,
  },

  securityText: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },

  footer: {
    alignItems: 'center',
    marginTop: spacing.xl,
  },

  footerCaption: {
    textAlign: 'center',
    marginTop: spacing.lg,
    fontSize: 10,
    letterSpacing: 2,
    fontWeight: '600',
    color: colors.onSurfaceVariant,
    opacity: 0.7,
  },
});
