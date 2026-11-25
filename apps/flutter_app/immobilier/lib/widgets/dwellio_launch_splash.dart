import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

import '../core/theme.dart';

class DwellioLaunchSplash extends StatefulWidget {
  const DwellioLaunchSplash({super.key, required this.child});

  final Widget child;

  @override
  State<DwellioLaunchSplash> createState() => _DwellioLaunchSplashState();
}

class _DwellioLaunchSplashState extends State<DwellioLaunchSplash>
    with SingleTickerProviderStateMixin {
  late final AnimationController _pulseController;
  late final Animation<double> _logoScale;
  Timer? _dismissTimer;
  bool _splashVisible = true;
  bool _splashRemoved = false;

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1100),
    )..repeat(reverse: true);
    _logoScale = Tween<double>(begin: 0.96, end: 1.04).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut),
    );
    _dismissTimer = Timer(const Duration(milliseconds: 1800), () {
      if (mounted) setState(() => _splashVisible = false);
    });
  }

  @override
  void dispose() {
    _dismissTimer?.cancel();
    _pulseController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Stack(
      fit: StackFit.expand,
      children: [
        widget.child,
        if (!_splashRemoved)
          IgnorePointer(
            ignoring: !_splashVisible,
            child: AnimatedOpacity(
              opacity: _splashVisible ? 1 : 0,
              duration: const Duration(milliseconds: 450),
              onEnd: () {
                if (!_splashVisible && mounted) {
                  setState(() => _splashRemoved = true);
                }
              },
              child: _DwellioSplashContent(logoScale: _logoScale),
            ),
          ),
      ],
    );
  }
}

class _DwellioSplashContent extends StatelessWidget {
  const _DwellioSplashContent({required this.logoScale});

  final Animation<double> logoScale;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [Color(0xFFF9FCFD), Color(0xFFEAF6F5)],
        ),
      ),
      child: SafeArea(
        child: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              SizedBox(
                width: 184,
                height: 184,
                child: Stack(
                  alignment: Alignment.center,
                  children: [
                    AnimatedBuilder(
                      animation: logoScale,
                      builder: (context, child) => Container(
                        width: 164 * logoScale.value,
                        height: 164 * logoScale.value,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          border: Border.all(
                            color: const Color(0x331FB2A3),
                            width: 1.5,
                          ),
                        ),
                      ),
                    ),
                    Container(
                      width: 142,
                      height: 142,
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: AppColors.surface,
                        borderRadius: BorderRadius.circular(38),
                        boxShadow: const [
                          BoxShadow(
                            color: Color(0x180C3448),
                            blurRadius: 28,
                            offset: Offset(0, 12),
                          ),
                        ],
                      ),
                      child: ScaleTransition(
                        scale: logoScale,
                        child: SvgPicture.asset(
                          'assets/images/dwellio_logo.svg',
                          semanticsLabel: 'Dwellio logo',
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 22),
              const Text(
                'Dwellio',
                style: TextStyle(
                  color: Color(0xFF103053),
                  fontSize: 32,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 0.4,
                ),
              ),
              const SizedBox(height: 8),
              const Text(
                'A place to call home',
                style: TextStyle(
                  color: AppColors.secondary,
                  fontSize: 15,
                  letterSpacing: 0.2,
                ),
              ),
              const SizedBox(height: 30),
              SizedBox(
                width: 120,
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(8),
                  child: TweenAnimationBuilder<double>(
                    tween: Tween(begin: 0, end: 1),
                    duration: const Duration(milliseconds: 1500),
                    curve: Curves.easeInOut,
                    builder: (context, value, child) => LinearProgressIndicator(
                      value: value,
                      minHeight: 3,
                      backgroundColor: const Color(0x221FB2A3),
                      color: const Color(0xFF1FB2A3),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
