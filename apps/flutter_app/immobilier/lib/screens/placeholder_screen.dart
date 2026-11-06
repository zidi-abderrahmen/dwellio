import 'package:flutter/material.dart';
import '../core/theme.dart';

class PlaceholderScreen extends StatelessWidget {
  const PlaceholderScreen({super.key, required this.title});

  final String title;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Text(title),
        backgroundColor: AppColors.background,
        surfaceTintColor: Colors.transparent,
      ),
      body: Center(
        child: Text(
          '$title (bientôt)',
          style: Theme.of(context).textTheme.titleMedium,
        ),
      ),
    );
  }
}