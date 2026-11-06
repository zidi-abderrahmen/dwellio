abstract final class Validators {
  static final RegExp _emailRegex =
      RegExp(r'^[\w.+\-]+@[\w\-]+(\.[\w\-]+)+$');

  static String? fullName(String? value) {
    final v = value?.trim() ?? '';
    if (v.isEmpty) return 'Le nom complet est obligatoire';
    if (v.length < 3) return 'Le nom est trop court';
    return null;
  }

  static String? email(String? value) {
    final v = value?.trim() ?? '';
    if (v.isEmpty) return "L'email est obligatoire";
    if (!_emailRegex.hasMatch(v)) return 'Email invalide';
    return null;
  }

  // Supabase par défaut: 6 caractères minimum
  static String? password(String? value) {
    final v = value ?? '';
    if (v.isEmpty) return 'Le mot de passe est obligatoire';
    if (v.length < 6) return 'Minimum 6 caractères';
    return null;
  }

  static String? Function(String?) confirmPassword(String Function() original) {
    return (value) {
      if (value == null || value.isEmpty) return 'Confirmez le mot de passe';
      if (value != original()) return 'Les mots de passe ne correspondent pas';
      return null;
    };
  }
}