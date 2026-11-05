
import { MD3LightTheme, configureFonts } from 'react-native-paper';
import { Platform } from 'react-native';

// Brand colors
const colors = {
  primary: '#00677F',
  secondary: '#40484C',

  background: '#F8F9FA',
  surface: '#FFFFFF',
  surfaceVariant: '#EFF1F2',

  onPrimary: '#FFFFFF',
  onSecondary: '#FFFFFF',
  onBackground: '#191C1D',
  onSurface: '#191C1D',
  onSurfaceVariant: '#40484C',

  outline: '#BFC8CC',
  outlineVariant: '#E1E3E4',

  error: '#BA1A1A',
  success: '#2E7D32',

  favorite: '#D32F2F',
  placeholder: '#70787D',
};

// Standard typography
const fontConfig = {
  fontFamily: Platform.select({
    web: 'Roboto, sans-serif',
    default: 'Roboto',
  }),

  fontWeight: '400' as const,

  letterSpacing: 0,
  lineHeight: 20,
};

// Application theme
export const theme = {
  ...MD3LightTheme,

  colors: {
    ...MD3LightTheme.colors,
    ...colors,
  },

  fonts: configureFonts({
    config: {
      ...MD3LightTheme.fonts,

      displayLarge: {
        ...MD3LightTheme.fonts.displayLarge,
        fontFamily: fontConfig.fontFamily,
      },

      headlineLarge: {
        ...MD3LightTheme.fonts.headlineLarge,
        fontFamily: fontConfig.fontFamily,
      },

      titleLarge: {
        ...MD3LightTheme.fonts.titleLarge,
        fontFamily: fontConfig.fontFamily,
        fontWeight: '500',
        fontSize: 22,
        lineHeight: 28,
      },

      titleMedium: {
        ...MD3LightTheme.fonts.titleMedium,
        fontFamily: fontConfig.fontFamily,
        fontWeight: '500',
        fontSize: 16,
        lineHeight: 24,
        letterSpacing: 0.15,
      },

      bodyLarge: {
        ...MD3LightTheme.fonts.bodyLarge,
        fontFamily: fontConfig.fontFamily,
        fontSize: 16,
        lineHeight: 24,
      },

      bodyMedium: {
        ...MD3LightTheme.fonts.bodyMedium,
        fontFamily: fontConfig.fontFamily,
        fontSize: 14,
        lineHeight: 20,
        letterSpacing: 0.25,
      },

      bodySmall: {
        ...MD3LightTheme.fonts.bodySmall,
        fontFamily: fontConfig.fontFamily,
        fontSize: 12,
        lineHeight: 16,
        letterSpacing: 0.4,
      },

      labelMedium: {
        ...MD3LightTheme.fonts.labelMedium,
        fontFamily: fontConfig.fontFamily,
        fontWeight: '500',
        fontSize: 12,
        lineHeight: 16,
        letterSpacing: 0.5,
      },
    },
  }),

  roundness: 12,
};

// Default CardTheme
export const cardTheme = {
  elevation: 1,

  borderRadius: 12,

  borderWidth: 1,
  borderColor: colors.outline,

  backgroundColor: colors.surface,

  shadowColor: '#000000',

  shadowOffset: {
    width: 0,
    height: 2,
  },

  shadowOpacity: 0.08,
  shadowRadius: 4,

  overflow: 'hidden' as const,
};

// Shared design tokens
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
};

export const typography = {
  price: {
    fontSize: 22,
    fontWeight: '500' as const,
    lineHeight: 28,
    color: colors.primary,
  },

  title: {
    fontSize: 16,
    fontWeight: '500' as const,
    lineHeight: 24,
    color: colors.onBackground,
  },

  body: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
    color: colors.secondary,
  },

  caption: {
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 16,
    color: colors.secondary,
  },
};

export default theme;
