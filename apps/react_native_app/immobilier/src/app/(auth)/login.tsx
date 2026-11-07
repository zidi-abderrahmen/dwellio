import React, { useState } from 'react';
import { Keyboard, StyleSheet, View } from 'react-native';
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
    const emailError = Validators.email(email) ?? undefined;
    const passwordError = Validators.password(password) ?? undefined;

    setErrors({ email: emailError, password: passwordError });

    if (emailError || passwordError) {
      return;
    }

    Keyboard.dismiss();
    setLoading(true);

    try {
      router.replace('/');
      await signIn(email.trim(), password);
      // On success, the root layout observes the Supabase session
      // and redirects to the requested tab or Home (/).
    } catch (error) {
      setSnackbarMessage(getFriendlyAuthErrorMessage(error));
    } finally {
      setLoading(false);
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
      <AuthHeader
        title="Immobilier"
        subtitle="Sign in to your account"
      />

      <AuthCard>
        <View style={styles.form}>
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
                if (errors.password) {
                  setErrors((previous) => ({
                    ...previous,
                    password: undefined,
                  }));
                }
              }}
              secureTextEntry={obscure}
              textContentType="password"
              autoComplete="password"
              returnKeyType="done"
              onSubmitEditing={() => void submit()}
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

          <AuthSubmitButton
            label="Sign in"
            loading={loading}
            onPress={() => void submit()}
          />
        </View>
      </AuthCard>

      <AuthSwitchPrompt
        prompt="Don't have an account?"
        actionLabel="Sign up"
        disabled={loading}
        onPress={() =>
          router.replace({
              pathname: '/register' as never,
            params: from ? { from } : {},
          })
        }
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
