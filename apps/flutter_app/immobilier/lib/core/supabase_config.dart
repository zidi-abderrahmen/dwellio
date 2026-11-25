import 'package:flutter_dotenv/flutter_dotenv.dart';

abstract final class SupabaseConfig {
  static String get url => _required('SUPABASE_URL');
  static String get anonKey => _required('SUPABASE_ANON_KEY');
  static String get propertyImagesBucket =>
      _required('SUPABASE_IMAGES_BUCKET');

  static String _required(String name) {
    final value = dotenv.env[name]?.trim();
    if (value == null ||
        value.isEmpty ||
        value.startsWith('YOUR_') ||
        value.startsWith('your_')) {
      throw StateError(
        'Set $name in .env. Copy .env.example to .env and provide its value.',
      );
    }
    return value;
  }
}
