import 'package:flutter/material.dart';

import '../core/theme.dart';

// --------------------------------------------------
// Auth Scaffold
// Shared page frame: transparent app bar + centered, scrollable content
// --------------------------------------------------

class AuthScaffold extends StatelessWidget {
  const AuthScaffold({
    super.key,
    required this.leading,
    required this.child,
  });

  final Widget leading;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.background,
        surfaceTintColor: Colors.transparent,
        foregroundColor: AppColors.onSurface,
        elevation: 0,
        scrolledUnderElevation: 0,
        leading: leading,
      ),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: child,
            ),
          ),
        ),
      ),
    );
  }
}

// --------------------------------------------------
// Auth Header
// Brand mark + title + subtitle
// --------------------------------------------------

class AuthHeader extends StatelessWidget {
  const AuthHeader({
    super.key,
    required this.title,
    required this.subtitle,
  });

  final String title;
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Container(
          width: 56,
          height: 56,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: AppColors.primary,
            borderRadius: BorderRadius.circular(12),
          ),
          child: const Icon(
            Icons.home_filled,
            size: 32,
            color: AppColors.onPrimary,
          ),
        ),
        const SizedBox(height: 16),
        Text(
          title,
          textAlign: TextAlign.center,
          style: Theme.of(context)
              .textTheme
              .headlineMedium
              ?.copyWith(color: AppColors.primary),
        ),
        const SizedBox(height: 4),
        Text(
          subtitle,
          textAlign: TextAlign.center,
          style: const TextStyle(
            fontFamily: AppFontConfig.fontFamily,
            fontSize: 14,
            fontWeight: FontWeight.w400,
            height: 20 / 14,
            letterSpacing: 0.25,
            color: AppColors.secondary,
          ),
        ),
      ],
    );
  }
}

// --------------------------------------------------
// Auth Card
// Same surface treatment as PropertyCard
// --------------------------------------------------

class AuthCard extends StatelessWidget {
  const AuthCard({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(width: 1, color: AppColors.outline),
        boxShadow: const [
          BoxShadow(
            color: Color.fromRGBO(0, 0, 0, 0.08),
            offset: Offset(0, 2),
            blurRadius: 4,
          ),
        ],
      ),
      child: child,
    );
  }
}

// --------------------------------------------------
// Input decoration
// --------------------------------------------------

OutlineInputBorder _border(Color color, {double width = 1}) {
  return OutlineInputBorder(
    borderRadius: BorderRadius.circular(12),
    borderSide: BorderSide(color: color, width: width),
  );
}

InputDecoration authInputDecoration({
  required String label,
  required IconData icon,
  Widget? suffixIcon,
}) {
  return InputDecoration(
    labelText: label,
    labelStyle: const TextStyle(
      fontFamily: AppFontConfig.fontFamily,
      fontSize: 16,
      color: AppColors.secondary,
    ),
    floatingLabelStyle: WidgetStateTextStyle.resolveWith((states) {
      final color = states.contains(WidgetState.error)
          ? AppColors.error
          : states.contains(WidgetState.focused)
              ? AppColors.primary
              : AppColors.secondary;
      return TextStyle(
        fontFamily: AppFontConfig.fontFamily,
        fontSize: 12,
        fontWeight: FontWeight.w500,
        letterSpacing: 0.4,
        color: color,
      );
    }),
    errorStyle: const TextStyle(
      fontFamily: AppFontConfig.fontFamily,
      fontSize: 12,
      height: 16 / 12,
      letterSpacing: 0.4,
      color: AppColors.error,
    ),
    prefixIcon: Icon(icon, size: 24),
    prefixIconColor: WidgetStateColor.resolveWith((states) {
      if (states.contains(WidgetState.error)) return AppColors.error;
      if (states.contains(WidgetState.focused)) return AppColors.primary;
      return AppColors.secondary;
    }),
    suffixIcon: suffixIcon,
    suffixIconColor: AppColors.secondary,
    filled: true,
    fillColor: AppColors.surface,
    contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
    border: _border(AppColors.outline),
    enabledBorder: _border(AppColors.outline),
    focusedBorder: _border(AppColors.primary, width: 2),
    errorBorder: _border(AppColors.error),
    focusedErrorBorder: _border(AppColors.error, width: 2),
  );
}

// --------------------------------------------------
// Submit button
// --------------------------------------------------

class AuthSubmitButton extends StatelessWidget {
  const AuthSubmitButton({
    super.key,
    required this.label,
    required this.loading,
    required this.onPressed,
  });

  final String label;
  final bool loading;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return FilledButton(
      onPressed: loading ? null : onPressed,
      style: FilledButton.styleFrom(
        backgroundColor: AppColors.primary,
        foregroundColor: AppColors.onPrimary,
        disabledBackgroundColor: AppColors.primary.withValues(alpha: 0.6),
        disabledForegroundColor: AppColors.onPrimary,
        minimumSize: const Size.fromHeight(48),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
        ),
        textStyle: const TextStyle(
          fontFamily: AppFontConfig.fontFamily,
          fontSize: 16,
          fontWeight: FontWeight.w500,
          height: 24 / 16,
          letterSpacing: 0.15,
        ),
      ),
      child: loading
          ? const SizedBox(
              height: 20,
              width: 20,
              child: CircularProgressIndicator(
                strokeWidth: 2,
                color: AppColors.onPrimary,
              ),
            )
          : Text(label),
    );
  }
}

// --------------------------------------------------
// Switch prompt ("Don't have an account? Sign up")
// --------------------------------------------------

class AuthSwitchPrompt extends StatelessWidget {
  const AuthSwitchPrompt({
    super.key,
    required this.prompt,
    required this.actionLabel,
    required this.onPressed,
  });

  final String prompt;
  final String actionLabel;
  final VoidCallback? onPressed;

  @override
  Widget build(BuildContext context) {
    return Wrap(
      alignment: WrapAlignment.center,
      crossAxisAlignment: WrapCrossAlignment.center,
      children: [
        Text(
          prompt,
          style: const TextStyle(
            fontFamily: AppFontConfig.fontFamily,
            fontSize: 14,
            fontWeight: FontWeight.w400,
            height: 20 / 14,
            letterSpacing: 0.25,
            color: AppColors.secondary,
          ),
        ),
        TextButton(
          onPressed: onPressed,
          style: TextButton.styleFrom(
            foregroundColor: AppColors.primary,
            minimumSize: const Size(48, 48),
            padding: const EdgeInsets.symmetric(horizontal: 8),
            textStyle: const TextStyle(
              fontFamily: AppFontConfig.fontFamily,
              fontSize: 14,
              fontWeight: FontWeight.w500,
              height: 20 / 14,
              letterSpacing: 0.25,
            ),
          ),
          child: Text(actionLabel),
        ),
      ],
    );
  }
}