import React, { useState } from 'react';
import {
  Keyboard,
  StyleSheet,
  View,
  Text,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { HelperText, TextInput } from 'react-native-paper';

import { Validators } from '../../core/validators';
import { getFriendlyAuthErrorMessage } from '../../core/auth-errors';
import { signIn } from '../../services/authService';
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
  email?: string;
  password?: string;
};

export default function LoginScreen() {
  const router = useRouter();

  const params = useLocalSearchParams<{ from?: string | string[] }>();
  const from = Array.isArray(params.from) ? params.from[0] : params.from;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [obscure, setObscure] = useState(true);
  const [loading, setLoading] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});

  const close = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  };

  const submit = async () => {
    const emailError = Validators.email(email.trim()) ?? undefined;
    const passwordError = Validators.password(password) ?? undefined;

    setErrors({
      email: emailError,
      password: passwordError,
    });

    if (emailError || passwordError) return;

    Keyboard.dismiss();
    setLoading(true);

    try {
      await signIn(email.trim(), password);

      // Root layout observes the Supabase session.
      // Navigation is handled by the root authentication flow.
    } catch (error) {
      setSnackbarMessage(getFriendlyAuthErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);

    if (errors.email) {
      setErrors(previous => ({
        ...previous,
        email: undefined,
      }));
    }
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);

    if (errors.password) {
      setErrors(previous => ({
        ...previous,
        password: undefined,
      }));
    }
  };

  return (
    <AuthScaffold
      leadingIcon="close"
      onLeadingPress={close}
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
              title="Welcome Back"
              subtitle="Sign in to discover your next place."
            />

            <Text style={styles.headerDescription}>
              Your dream property is just one step away.
            </Text>
          </View>

          {/* Form */}
          <AuthCard>
            <View style={styles.form}>
              <View style={styles.formHeading}>
                <Text style={styles.formTitle}>Sign in</Text>
                <Text style={styles.formSubtitle}>
                  Enter your credentials to continue.
                </Text>
              </View>

              {/* Email */}
              <View>
                <TextInput
                  mode="outlined"
                  label="Email address"
                  placeholder="example@email.com"
                  value={email}
                  onChangeText={handleEmailChange}
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
                  placeholder="Enter your password"
                  value={password}
                  onChangeText={handlePasswordChange}
                  secureTextEntry={obscure}
                  textContentType="password"
                  autoComplete="current-password"
                  autoCapitalize="none"
                  returnKeyType="done"
                  onSubmitEditing={() => void submit()}
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

              {/* Sign in button */}
              <View style={styles.buttonContainer}>
                <AuthSubmitButton
                  label="Sign in"
                  loading={loading}
                  onPress={() => void submit()}
                />
              </View>

              {/* Security note */}
              <View style={styles.securityContainer}>
                <Text style={styles.securityIcon}>✦</Text>
                <Text style={styles.securityText}>
                  Your information is safe and secure.
                </Text>
              </View>
            </View>
          </AuthCard>

          {/* Footer */}
          <View style={styles.footer}>
            <AuthSwitchPrompt
              prompt="New to DWELLIO?"
              actionLabel="Create an account"
              disabled={loading}
              onPress={() =>
                router.replace({
                  pathname: '/register' as never,
                  params: from ? { from } : {},
                })
              }
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
