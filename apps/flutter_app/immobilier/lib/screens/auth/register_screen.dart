import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/router.dart';
import '../../core/theme.dart';
import '../../core/validators.dart';
import '../../providers/auth_providers.dart';
import '../../services/auth_service.dart';
import '../../widgets/auth_form_widgets.dart';

class RegisterScreen extends ConsumerStatefulWidget {
  const RegisterScreen({super.key, this.from});

  final String? from;

  @override
  ConsumerState<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends ConsumerState<RegisterScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmController = TextEditingController();

  bool _obscure = true;
  bool _loading = false;

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    _confirmController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    FocusScope.of(context).unfocus();
    setState(() => _loading = true);

    try {
      final res = await ref.read(authServiceProvider).signUp(
            fullName: _nameController.text,
            email: _emailController.text,
            password: _passwordController.text,
          );

      if (!mounted) return;

      if (res.session == null) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
          content: Text('Account created. Check your email to confirm.'),
        ));
        context.go(AppRoutes.loginLocation(from: widget.from));
      }
    } on AuthFailure catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(e.message)));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return AuthScaffold(
      leading: BackButton(
        color: AppColors.onSurface,
        onPressed: _loading
            ? null
            : () => context.go(AppRoutes.loginLocation(from: widget.from)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const AuthHeader(
            title: 'Create an account',
            subtitle: 'Join Immobilier in a few seconds',
          ),
          const SizedBox(height: 24),
          AuthCard(
            child: Form(
              key: _formKey,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  TextFormField(
                    controller: _nameController,
                    textCapitalization: TextCapitalization.words,
                    textInputAction: TextInputAction.next,
                    autofillHints: const [AutofillHints.name],
                    decoration: authInputDecoration(
                      label: 'Full name',
                      icon: Icons.person_outline,
                    ),
                    validator: Validators.fullName,
                  ),
                  const SizedBox(height: 16),
                  TextFormField(
                    controller: _emailController,
                    keyboardType: TextInputType.emailAddress,
                    textInputAction: TextInputAction.next,
                    autofillHints: const [AutofillHints.email],
                    decoration: authInputDecoration(
                      label: 'Email',
                      icon: Icons.email_outlined,
                    ),
                    validator: Validators.email,
                  ),
                  const SizedBox(height: 16),
                  TextFormField(
                    controller: _passwordController,
                    obscureText: _obscure,
                    textInputAction: TextInputAction.next,
                    autofillHints: const [AutofillHints.newPassword],
                    decoration: authInputDecoration(
                      label: 'Password',
                      icon: Icons.lock_outline,
                      suffixIcon: IconButton(
                        icon: Icon(
                          _obscure
                              ? Icons.visibility_outlined
                              : Icons.visibility_off_outlined,
                        ),
                        onPressed: () => setState(() => _obscure = !_obscure),
                      ),
                    ),
                    validator: Validators.password,
                  ),
                  const SizedBox(height: 16),
                  TextFormField(
                    controller: _confirmController,
                    obscureText: _obscure,
                    textInputAction: TextInputAction.done,
                    onFieldSubmitted: (_) => _submit(),
                    autofillHints: const [AutofillHints.newPassword],
                    decoration: authInputDecoration(
                      label: 'Confirm password',
                      icon: Icons.lock_outline,
                    ),
                    validator: Validators.confirmPassword(
                      () => _passwordController.text,
                    ),
                  ),
                  const SizedBox(height: 24),
                  AuthSubmitButton(
                    label: 'Sign up',
                    loading: _loading,
                    onPressed: _submit,
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          AuthSwitchPrompt(
            prompt: 'Already have an account?',
            actionLabel: 'Sign in',
            onPressed: _loading
                ? null
                : () => context.go(
                      AppRoutes.loginLocation(from: widget.from),
                    ),
          ),
        ],
      ),
    );
  }
}