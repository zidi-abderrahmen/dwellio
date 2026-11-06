import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../services/auth_service.dart';

final authServiceProvider = Provider<AuthService>(
  (ref) => AuthService(Supabase.instance.client),
);

/// Session listener: yemchi m3a onAuthStateChange
final authStateProvider = StreamProvider<AuthState>(
  (ref) => ref.watch(authServiceProvider).authChanges,
);

/// Source unique lel session (null = ma7ach connecté)
final sessionProvider = Provider<Session?>((ref) {
  ref.watch(authStateProvider); // y3awed y7seb ki el auth state ybaddel
  return ref.watch(authServiceProvider).currentSession;
});