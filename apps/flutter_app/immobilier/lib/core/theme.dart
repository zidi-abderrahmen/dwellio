import 'package:flutter/material.dart';

// Brand colors
abstract final class AppColors {
  static const Color primary = Color(0xFF00677F);
  static const Color secondary = Color(0xFF40484C);

  static const Color background = Color(0xFFF8F9FA);
  static const Color surface = Color(0xFFFFFFFF);
  static const Color surfaceVariant = Color(0xFFEFF1F2);

  static const Color onPrimary = Color(0xFFFFFFFF);
  static const Color onSecondary = Color(0xFFFFFFFF);
  static const Color onBackground = Color(0xFF191C1D);
  static const Color onSurface = Color(0xFF191C1D);
  static const Color onSurfaceVariant = Color(0xFF40484C);

  static const Color outline = Color(0xFFBFC8CC);
  static const Color outlineVariant = Color(0xFFE1E3E4);

  static const Color error = Color(0xFFBA1A1A);
  static const Color success = Color(0xFF2E7D32);

  static const Color favorite = Color(0xFFD32F2F);
  static const Color placeholder = Color(0xFF70787D);

  static const Color featured = Color(0xFFFFDDB8);
  static const Color onFeatured = Color(0xFF2C1600);
}

// Standard typography
abstract final class AppFontConfig {
  static const String fontFamily = 'Roboto';

  static const FontWeight fontWeight = FontWeight.w400;

  static const double letterSpacing = 0.0;
  static const double lineHeight = 20.0;
}