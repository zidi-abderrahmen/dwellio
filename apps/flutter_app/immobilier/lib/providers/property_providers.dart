import 'package:flutter_riverpod/flutter_riverpod.dart';

final homePropertyRefreshProvider =
    NotifierProvider<HomePropertyRefreshNotifier, int>(
      HomePropertyRefreshNotifier.new,
    );

class HomePropertyRefreshNotifier extends Notifier<int> {
  @override
  int build() => 0;

  void refresh() => state++;
}
