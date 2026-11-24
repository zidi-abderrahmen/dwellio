import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme, spacing, radius, typography } from '../../theme';

const colors = theme.colors;

interface FormSectionProps {
 icon?: React.ComponentProps<typeof Ionicons>['name'];
 title: string;
 subtitle?: string;
 children: React.ReactNode;
}

export function FormSection({ icon, title, subtitle, children }: FormSectionProps) {
 return (
 <View style={styles.section}>
 <View style={styles.sectionHeader}>
 {icon ? (
 <View style={styles.iconBubble}>
 <Ionicons name={icon} size={18} color={colors.primary} />
 </View>
 ) : null}
 <View style={{ flex: 1 }}>
 <Text style={styles.sectionTitle}>{title}</Text>
 {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
 </View>
 </View>
 <View style={styles.sectionCard}>{children}</View>
 </View>
 );
}

interface FormFieldProps {
 label: string;
 error?: string;
 hint?: string;
 accessory?: React.ReactNode;
 children: React.ReactNode;
}

export function FormField({ label, error, hint, accessory, children }: FormFieldProps) {
 return (
 <View style={styles.field}>
 <View style={styles.fieldHeader}>
 <Text style={styles.fieldLabel}>{label}</Text>
 {accessory}
 </View>
 {children}
 {error ? (
 <View style={styles.errorRow}>
 <Ionicons name="alert-circle" size={14} color={colors.error} />
 <Text accessibilityRole="alert" style={styles.fieldError}>
 {error}
 </Text>
 </View>
 ) : hint ? (
 <Text style={styles.fieldHint}>{hint}</Text>
 ) : null}
 </View>
 );
}

interface OptionFieldProps<T extends string> {
 label: string;
 error?: string;
 options: { value: T; label: string }[];
 selected: T | null;
 disabled?: boolean;
 onSelect: (value: T) => void;
}

export function OptionField<T extends string>({
 label,
 error,
 options,
 selected,
 disabled = false,
 onSelect,
}: OptionFieldProps<T>) {
 return (
 <FormField label={label} error={error}>
 <View style={styles.optionRow}>
 {options.map((option) => {
 const isSelected = selected === option.value;
 return (
 <Pressable
 key={option.value}
 accessibilityRole="radio"
 accessibilityState={{ checked: isSelected, disabled }}
 disabled={disabled}
 onPress={() => onSelect(option.value)}
 style={[
 styles.option,
 isSelected && styles.optionSelected,
 disabled && styles.disabled,
 ]}
 >
 <Text
 style={[
 styles.optionText,
 isSelected && styles.optionTextSelected,
 ]}
 >
 {option.label}
 </Text>
 </Pressable>
 );
 })}
 </View>
 </FormField>
 );
}

const styles = StyleSheet.create({
 section: { gap: spacing.sm },
 sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
 iconBubble: {
 width: 32,
 height: 32,
 borderRadius: radius.full,
 alignItems: 'center',
 justifyContent: 'center',
 backgroundColor: colors.outlineVariant,
 },
 sectionTitle: { ...theme.fonts.titleMedium, color: colors.onBackground },
 sectionSubtitle: {
 ...typography.caption,
 color: colors.secondary,
 marginTop: 2,
 },
 sectionCard: {
 gap: spacing.lg,
 padding: spacing.lg,
 borderRadius: radius.lg,
 backgroundColor: colors.surface,
 borderWidth: 1,
 borderColor: colors.outlineVariant,
 },
 field: { gap: spacing.sm },
 fieldHeader: {
 flexDirection: 'row',
 alignItems: 'center',
 justifyContent: 'space-between',
 },
 fieldLabel: { ...theme.fonts.titleSmall, color: colors.onBackground },
 fieldError: { ...typography.caption, color: colors.error, flex: 1 },
 fieldHint: { ...typography.caption, color: colors.secondary },
 errorRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
 optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
 option: {
 minHeight: 44,
 paddingHorizontal: spacing.lg,
 justifyContent: 'center',
 alignItems: 'center',
 borderWidth: 1,
 borderColor: colors.outline,
 borderRadius: radius.full,
 backgroundColor: colors.surface,
 },
 optionSelected: {
 backgroundColor: colors.primary,
 borderColor: colors.primary,
 },
 optionText: { ...typography.body, color: colors.secondary },
 optionTextSelected: { color: colors.onPrimary, fontWeight: '600' },
 disabled: { opacity: 0.5 },
});