import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Button,
  IconButton,
  Snackbar,
  Text,
} from 'react-native-paper';

import { AppLogo } from '../AppLogo';
import { theme, spacing, radius } from '../../theme';

const colors = theme.colors;

type AuthScaffoldProps = {
  leadingIcon: 'close' | 'arrow-left';
  onLeadingPress: () => void;
  leadingDisabled?: boolean;
  children: ReactNode;
  snackbarMessage: string;
  onDismissSnackbar: () => void;
};

export function AuthScaffold({
  leadingIcon,
  onLeadingPress,
  leadingDisabled = false,
  children,
  snackbarMessage,
  onDismissSnackbar,
}: AuthScaffoldProps) {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            <View style={styles.leadingContainer}>
              <IconButton
                icon={leadingIcon}
                iconColor={colors.onSurface}
                size={24}
                disabled={leadingDisabled}
                onPress={onLeadingPress}
                accessibilityLabel={
                  leadingIcon === 'close' ? 'Close' : 'Go back'
                }
                theme={theme}
              />
            </View>

            {children}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Snackbar
        visible={snackbarMessage.length > 0}
        onDismiss={onDismissSnackbar}
        duration={4000}
        theme={theme}
      >
        {snackbarMessage}
      </Snackbar>
    </SafeAreaView>
  );
}

type AuthHeaderProps = {
  title: string;
  subtitle: string;
};

export function AuthHeader({ title, subtitle }: AuthHeaderProps) {
  return (
    <View style={styles.header}>
      <AppLogo size={44} />
      <Text variant="headlineMedium" style={styles.headerTitle} theme={theme}>
        {title}
      </Text>
      <Text variant="bodyMedium" style={styles.headerSubtitle} theme={theme}>
        {subtitle}
      </Text>
    </View>
  );
}

type AuthCardProps = {
  children: ReactNode;
};

export function AuthCard({ children }: AuthCardProps) {
  return <View style={styles.card}>{children}</View>;
}

type AuthSubmitButtonProps = {
  label: string;
  loading: boolean;
  onPress: () => void;
};

export function AuthSubmitButton({
  label,
  loading,
  onPress,
}: AuthSubmitButtonProps) {
  return (
    <Button
      mode="contained"
      onPress={onPress}
      loading={loading}
      disabled={loading}
      contentStyle={styles.submitButtonContent}
      style={styles.submitButton}
      labelStyle={styles.submitButtonLabel}
      theme={theme}
    >
      {label}
    </Button>
  );
}

type AuthSwitchPromptProps = {
  prompt: string;
  actionLabel: string;
  disabled?: boolean;
  onPress: () => void;
};

export function AuthSwitchPrompt({
  prompt,
  actionLabel,
  disabled = false,
  onPress,
}: AuthSwitchPromptProps) {
  return (
    <View style={styles.switchPrompt}>
      <Text variant="bodyMedium" style={styles.switchPromptText} theme={theme}>
        {prompt}
      </Text>
      <Button
        mode="text"
        compact
        disabled={disabled}
        onPress={onPress}
        labelStyle={styles.switchActionLabel}
        theme={theme}
      >
        {actionLabel}
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },

  keyboardAvoidingView: {
    flex: 1,
  },

  scrollContent: {
    flexGrow: 1,
  },

  content: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxl,
  },

  leadingContainer: {
    height: 48,
    alignItems: 'flex-start',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },

  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },

  headerTitle: {
    color: colors.primary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },

  headerSubtitle: {
    color: colors.secondary,
    textAlign: 'center',
  },

  card: {
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.outline,
    borderRadius: radius.lg,
  },

  submitButton: {
    borderRadius: radius.md,
  },

  submitButtonContent: {
    minHeight: 48,
  },

  submitButtonLabel: {
    fontWeight: '500',
  },

  switchPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginTop: spacing.md,
  },

  switchPromptText: {
    color: colors.secondary,
  },

  switchActionLabel: {
    fontWeight: '500',
  },
});
