import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../services/profile_service.dart';
import 'auth_providers.dart';

final profileServiceProvider = Provider<ProfileService>(
  (ref) => ProfileService(Supabase.instance.client),
);

final myProfileProvider = FutureProvider.autoDispose<UserProfile>(
  (ref) async {
    final session = ref.watch(sessionProvider);

    if (session == null) {
      throw const ProfileFailure(
        'You must be signed in to view your profile.',
      );
    }

    return ref.watch(profileServiceProvider).getMyProfile();
  },
);