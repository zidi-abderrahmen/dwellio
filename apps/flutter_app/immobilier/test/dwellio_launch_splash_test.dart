import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:immobilier/widgets/dwellio_launch_splash.dart';

void main() {
  testWidgets('shows the Dwellio logo then reveals the app', (tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: DwellioLaunchSplash(child: Scaffold(body: Text('App ready'))),
      ),
    );

    expect(find.text('Dwellio'), findsOneWidget);
    expect(find.byType(SvgPicture), findsOneWidget);
    expect(find.text('App ready'), findsOneWidget);

    await tester.pump(const Duration(seconds: 2));
    await tester.pump(const Duration(milliseconds: 500));
    await tester.pump();

    expect(find.text('App ready'), findsOneWidget);
    expect(find.byType(SvgPicture), findsNothing);
  });
}
