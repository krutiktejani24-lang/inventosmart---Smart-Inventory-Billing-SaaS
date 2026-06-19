import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'providers/app_providers.dart';
import 'utils/app_theme.dart';
import 'screens/login_screen.dart';
import 'screens/main_shell.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  SystemChrome.setPreferredOrientations([DeviceOrientation.portraitUp]);
  SystemChrome.setSystemUIOverlayStyle(const SystemUiOverlayStyle(
    statusBarColor: Colors.transparent,
    statusBarIconBrightness: Brightness.dark,
  ));
  runApp(const ProviderScope(child: InventoSmartApp()));
}

class InventoSmartApp extends ConsumerWidget {
  const InventoSmartApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authProvider);
    return MaterialApp(
      title: 'InventoSmart',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.theme,
      home: auth.isLoading
          ? const _Splash()
          : auth.isAuthenticated
              ? const MainShell()
              : const LoginScreen(),
    );
  }
}

class _Splash extends StatelessWidget {
  const _Splash();
  @override
  Widget build(BuildContext context) => Scaffold(
    backgroundColor: AppTheme.primary,
    body: const Center(child: Column(mainAxisSize: MainAxisSize.min, children: [
      Icon(Icons.inventory_2_rounded, size: 60, color: Colors.white),
      SizedBox(height: 16),
      Text('InventoSmart', style: TextStyle(color: Colors.white, fontSize: 26, fontWeight: FontWeight.bold)),
      SizedBox(height: 6),
      Text('GST Inventory & Billing', style: TextStyle(color: Color(0xFFBFDBFE), fontSize: 14)),
      SizedBox(height: 40),
      CircularProgressIndicator(color: Colors.white54, strokeWidth: 2),
    ])),
  );
}