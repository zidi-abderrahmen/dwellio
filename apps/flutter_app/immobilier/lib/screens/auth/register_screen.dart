import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/router.dart';
import '../../core/theme.dart';
import '../../core/validators.dart';
import '../../providers/auth_providers.dart';
import '../../services/auth_service.dart';

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

    // session == null ya3ni "Confirm email" mazel mfa3el
    if (res.session == null) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
        content: Text('Compte créé. Vérifiez votre email pour confirmer.'),
      ));
      context.go(AppRoutes.loginLocation(from: widget.from));
    }
    // sinon el router yredirecti lel Home wa7du
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
    return Scaffold(
      appBar: AppBar(
        backgroundColor: AppColors.background,
        surfaceTintColor: Colors.transparent,
        leading: BackButton(
          onPressed: () =>
              context.go(AppRoutes.loginLocation(from: widget.from)),
        ),
      ),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Text(
                      'Créer un compte',
                      textAlign: TextAlign.center,
                      style: Theme.of(context)
                          .textTheme
                          .headlineMedium
                          ?.copyWith(color: AppColors.primary),
                    ),
                    const SizedBox(height: 32),
                    TextFormField(
                      controller: _nameController,
                      textCapitalization: TextCapitalization.words,
                      textInputAction: TextInputAction.next,
                      decoration: const InputDecoration(
                        labelText: 'Nom complet',
                        prefixIcon: Icon(Icons.person_outline),
                        border: OutlineInputBorder(),
                      ),
                      validator: Validators.fullName,
                    ),
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: _emailController,
                      keyboardType: TextInputType.emailAddress,
                      textInputAction: TextInputAction.next,
                      decoration: const InputDecoration(
                        labelText: 'Email',
                        prefixIcon: Icon(Icons.email_outlined),
                        border: OutlineInputBorder(),
                      ),
                      validator: Validators.email,
                    ),
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: _passwordController,
                      obscureText: _obscure,
                      textInputAction: TextInputAction.next,
                      decoration: InputDecoration(
                        labelText: 'Mot de passe',
                        prefixIcon: const Icon(Icons.lock_outline),
                        border: const OutlineInputBorder(),
                        suffixIcon: IconButton(
                          icon: Icon(_obscure
                              ? Icons.visibility_outlined
                              : Icons.visibility_off_outlined),
                          onPressed: () =>
                              setState(() => _obscure = !_obscure),
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
                      decoration: const InputDecoration(
                        labelText: 'Confirmer le mot de passe',
                        prefixIcon: Icon(Icons.lock_outline),
                        border: OutlineInputBorder(),
                      ),
                      validator: Validators.confirmPassword(
                        () => _passwordController.text,
                      ),
                    ),
                    const SizedBox(height: 24),
                    FilledButton(
                      onPressed: _loading ? null : _submit,
                      style: FilledButton.styleFrom(
                        minimumSize: const Size.fromHeight(48),
                      ),
                      child: _loading
                          ? const SizedBox(
                              height: 20,
                              width: 20,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : const Text("S'inscrire"),
                    ),
                    const SizedBox(height: 12),
                    TextButton(
                      onPressed: _loading
                          ? null
                          : () => context.go(
                                AppRoutes.loginLocation(from: widget.from),
                              ),
                      child: const Text('Déjà un compte ? Se connecter'),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}