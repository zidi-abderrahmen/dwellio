import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../services/auth_service.dart';

final authServiceProvider = Provider<AuthService>(
  (ref) => AuthService(Supabase.instance.client),
);

final authStateProvider = StreamProvider<AuthState>(
  (ref) => ref.watch(authServiceProvider).authChanges,
);

final sessionProvider = Provider<Session?>((ref) {
  ref.watch(authStateProvider);
  return ref.watch(authServiceProvider).currentSession;
});