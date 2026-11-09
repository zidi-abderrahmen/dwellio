import React, { useEffect, useRef, useState } from 'react';
import { Keyboard, StyleSheet, View } from 'react-native';
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

  const submit = async () => {
    const fullNameError = Validators.fullName(fullName) ?? undefined;
    const emailError = Validators.email(email) ?? undefined;
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
          'Account created. Check your email to confirm.',
        );

        // Keep the confirmation message visible before navigating to Login.
        redirectTimeout.current = setTimeout(() => {
          goToLogin();
        }, 1800);
      }

      // If a session is returned, the root layout observes it and
      // redirects the authenticated user automatically.
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
      <AuthHeader
        title="Create an account"
        subtitle="Join Immobilier in a few seconds"
      />

      <AuthCard>
        <View style={styles.form}>
          <View>
            <TextInput
              mode="outlined"
              label="Full name"
              value={fullName}
              onChangeText={(value) => {
                setFullName(value);
                if (errors.fullName) {
                  setErrors((previous) => ({
                    ...previous,
                    fullName: undefined,
                  }));
                }
              }}
              autoCapitalize="words"
              autoComplete="name"
              textContentType="name"
              returnKeyType="next"
              left={<TextInput.Icon icon="account-outline" />}
              error={Boolean(errors.fullName)}
              theme={theme}
              style={styles.input}
            />
            <HelperText
              type="error"
              visible={Boolean(errors.fullName)}
              theme={theme}
            >
              {errors.fullName}
            </HelperText>
          </View>

          <View>
            <TextInput
              mode="outlined"
              label="Email"
              value={email}
              onChangeText={(value) => {
                setEmail(value);
                if (errors.email) {
                  setErrors((previous) => ({
                    ...previous,
                    email: undefined,
                  }));
                }
              }}
              keyboardType="email-address"
              textContentType="emailAddress"
              autoComplete="email"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
              left={<TextInput.Icon icon="email-outline" />}
              error={Boolean(errors.email)}
              theme={theme}
              style={styles.input}
            />
            <HelperText
              type="error"
              visible={Boolean(errors.email)}
              theme={theme}
            >
              {errors.email}
            </HelperText>
          </View>

          <View>
            <TextInput
              mode="outlined"
              label="Password"
              value={password}
              onChangeText={(value) => {
                setPassword(value);
                if (errors.password || errors.confirmPassword) {
                  setErrors((previous) => ({
                    ...previous,
                    password: undefined,
                    confirmPassword: undefined,
                  }));
                }
              }}
              secureTextEntry={obscure}
              textContentType="newPassword"
              autoComplete="new-password"
              returnKeyType="next"
              left={<TextInput.Icon icon="lock-outline" />}
              right={
                <TextInput.Icon
                  icon={obscure ? 'eye-outline' : 'eye-off-outline'}
                  onPress={() => setObscure((previous) => !previous)}
                  accessibilityLabel={obscure ? 'Show password' : 'Hide password'}
                />
              }
              error={Boolean(errors.password)}
              theme={theme}
              style={styles.input}
            />
            <HelperText
              type="error"
              visible={Boolean(errors.password)}
              theme={theme}
            >
              {errors.password}
            </HelperText>
          </View>

          <View>
            <TextInput
              mode="outlined"
              label="Confirm password"
              value={confirmPassword}
              onChangeText={(value) => {
                setConfirmPassword(value);
                if (errors.confirmPassword) {
                  setErrors((previous) => ({
                    ...previous,
                    confirmPassword: undefined,
                  }));
                }
              }}
              secureTextEntry={obscure}
              textContentType="newPassword"
              autoComplete="new-password"
              returnKeyType="done"
              onSubmitEditing={() => void submit()}
              left={<TextInput.Icon icon="lock-outline" />}
              error={Boolean(errors.confirmPassword)}
              theme={theme}
              style={styles.input}
            />
            <HelperText
              type="error"
              visible={Boolean(errors.confirmPassword)}
              theme={theme}
            >
              {errors.confirmPassword}
            </HelperText>
          </View>

          <AuthSubmitButton
            label="Sign up"
            loading={loading}
            onPress={() => void submit()}
          />
        </View>
      </AuthCard>

      <AuthSwitchPrompt
        prompt="Already have an account?"
        actionLabel="Sign in"
        disabled={loading}
        onPress={goToLogin}
      />
    </AuthScaffold>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: spacing.md,
  },

  input: {
    backgroundColor: colors.surface,
  },
});
