
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';

import { theme, spacing, radius } from '../../theme';

const colors = theme.colors;

export default function AddScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Add Property</Text>

        <Text style={styles.description}>
          Create and publish your property listing.
        </Text>

        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>
            Coming soon
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },

  title: {
    fontSize: 22,
    fontWeight: '500',
    color: colors.primary,
    marginBottom: spacing.sm,
  },

  description: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.secondary,
    textAlign: 'center',
  },

  placeholder: {
    marginTop: spacing.xl,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surfaceVariant,
    borderRadius: radius.full,
  },

  placeholderText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.secondary,
  },
});
