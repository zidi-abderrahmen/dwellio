import 'package:flutter/material.dart';

class AppColors {
  AppColors._();

  static const primary = Color(0xFF00677F);
  static const secondary = Color(0xFF40484C);

  static const background = Color(0xFFF8F9FA);
  static const surface = Color(0xFFFFFFFF);
  static const surfaceVariant = Color(0xFFEFF1F2);

  static const onPrimary = Color(0xFFFFFFFF);
  static const onSecondary = Color(0xFFFFFFFF);
  static const onBackground = Color(0xFF191C1D);
  static const onSurface = Color(0xFF191C1D);
  static const onSurfaceVariant = Color(0xFF40484C);

  static const outline = Color(0xFFBFC8CC);
  static const outlineVariant = Color(0xFFE1E3E4);

  static const error = Color(0xFFBA1A1A);
  static const success = Color(0xFF2E7D32);

  static const favorite = Color(0xFFD32F2F);
  static const placeholder = Color(0xFF70787D);
}

// Shared design tokens
class AppSpacing {
  AppSpacing._();

  static const double xs = 4;
  static const double sm = 8;
  static const double md = 12;
  static const double lg = 16;
  static const double xl = 24;
  static const double xxl = 32;
}

class AppRadius {
  AppRadius._();

  static const double sm = 8;
  static const double md = 12;
  static const double lg = 16;
  static const double xl = 24;
  static const double full = 999;
}

// Custom text styles (equivalent to `typography` export)
class AppTypography {
  AppTypography._();

  static const price = TextStyle(
    fontSize: 22,
    fontWeight: FontWeight.w500,
    height: 28 / 22,
    color: AppColors.primary,
  );

  static const title = TextStyle(
    fontSize: 16,
    fontWeight: FontWeight.w500,
    height: 24 / 16,
    color: AppColors.onBackground,
  );

  static const body = TextStyle(
    fontSize: 14,
    fontWeight: FontWeight.w400,
    height: 20 / 14,
    color: AppColors.secondary,
  );

  static const caption = TextStyle(
    fontSize: 12,
    fontWeight: FontWeight.w400,
    height: 16 / 12,
    color: AppColors.secondary,
  );
}

// Card decoration with the exact shadow from the RN cardTheme
// (Flutter's Card widget can't set shadowOffset/shadowRadius, so use this
// with a Container if you need the identical look)
final BoxDecoration appCardDecoration = BoxDecoration(
  color: AppColors.surface,
  borderRadius: BorderRadius.circular(AppRadius.md),
  border: Border.all(color: AppColors.outline, width: 1),
  boxShadow: const [
    BoxShadow(
      color: Color(0x14000000), // black @ 0.08 opacity
      offset: Offset(0, 2),
      blurRadius: 4,
    ),
  ],
);

// Application theme
class AppTheme {
  AppTheme._();

  static const String _fontFamily = 'Roboto';

  static ThemeData get light {
    final colorScheme = ColorScheme.light(
      primary: AppColors.primary,
      onPrimary: AppColors.onPrimary,
      secondary: AppColors.secondary,
      onSecondary: AppColors.onSecondary,
      surface: AppColors.surface,
      onSurface: AppColors.onSurface,
      surfaceContainerHighest: AppColors.surfaceVariant,
      onSurfaceVariant: AppColors.onSurfaceVariant,
      outline: AppColors.outline,
      outlineVariant: AppColors.outlineVariant,
      error: AppColors.error,
    );

    // Start from the Material 3 defaults, then override like the RN config
    final base = ThemeData(useMaterial3: true).textTheme.apply(
          fontFamily: _fontFamily,
          bodyColor: AppColors.onSurface,
          displayColor: AppColors.onSurface,
        );

    final textTheme = base.copyWith(
      titleLarge: base.titleLarge?.copyWith(
        fontWeight: FontWeight.w500,
        fontSize: 22,
        height: 28 / 22,
      ),
      titleMedium: base.titleMedium?.copyWith(
        fontWeight: FontWeight.w500,
        fontSize: 16,
        height: 24 / 16,
        letterSpacing: 0.15,
      ),
      bodyLarge: base.bodyLarge?.copyWith(
        fontSize: 16,
        height: 24 / 16,
      ),
      bodyMedium: base.bodyMedium?.copyWith(
        fontSize: 14,
        height: 20 / 14,
        letterSpacing: 0.25,
      ),
      bodySmall: base.bodySmall?.copyWith(
        fontSize: 12,
        height: 16 / 12,
        letterSpacing: 0.4,
      ),
      labelMedium: base.labelMedium?.copyWith(
        fontWeight: FontWeight.w500,
        fontSize: 12,
        height: 16 / 12,
        letterSpacing: 0.5,
      ),
    );

    final roundedShape = RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(AppRadius.md), // roundness: 12
    );

    return ThemeData(
      useMaterial3: true,
      colorScheme: colorScheme,
      scaffoldBackgroundColor: AppColors.background,
      fontFamily: _fontFamily,
      textTheme: textTheme,

      // Default card theme
      // NOTE: on Flutter < 3.27 use `CardTheme(` instead of `CardThemeData(`
      cardTheme: CardThemeData(
        elevation: 1,
        color: AppColors.surface,
        shadowColor: const Color(0x14000000),
        clipBehavior: Clip.antiAlias,
        margin: EdgeInsets.zero,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppRadius.md),
          side: const BorderSide(color: AppColors.outline, width: 1),
        ),
      ),

      // Apply the global roundness (12) to common components
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(shape: roundedShape),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(shape: roundedShape),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(shape: roundedShape),
      ),
      inputDecorationTheme: InputDecorationTheme(
        hintStyle: const TextStyle(color: AppColors.placeholder),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppRadius.md),
        ),
      ),
    );
  }
}

// Usage:
// MaterialApp(
//   theme: AppTheme.light,
//   home: ...,
// );