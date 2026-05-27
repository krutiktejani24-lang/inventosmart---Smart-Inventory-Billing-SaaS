import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'providers/auth_provider.dart';
import 'screens/login_screen.dart';
import 'screens/home_screen.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
    DeviceOrientation.portraitDown,
  ]);
  SystemChrome.setSystemUIOverlayStyle(const SystemUiOverlayStyle(
    statusBarColor:            Colors.transparent,
    statusBarIconBrightness:   Brightness.dark,
  ));
  runApp(const ProviderScope(child: InventoSmartApp()));
}

class InventoSmartApp extends ConsumerWidget {
  const InventoSmartApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authProvider);

    return MaterialApp(
      title:                 'InventoSmart',
      debugShowCheckedModeBanner: false,

      // Material 3 theme — Indigo
      theme: ThemeData(
        useMaterial3:      true,
        colorSchemeSeed:   const Color(0xFF6366F1),
        fontFamily:        'Roboto',
        appBarTheme: const AppBarTheme(
          backgroundColor: Colors.white,
          foregroundColor: Color(0xFF0F172A),
          elevation:       0,
          centerTitle:     false,
          titleTextStyle: TextStyle(
            color:      Color(0xFF0F172A),
            fontSize:   17,
            fontWeight: FontWeight.w600,
          ),
          systemOverlayStyle: SystemUiOverlayStyle(
            statusBarColor:          Colors.transparent,
            statusBarIconBrightness: Brightness.dark,
          ),
        ),
        scaffoldBackgroundColor: const Color(0xFFF8FAFC),
        cardTheme: CardThemeData(
          elevation:    0,
          shape:        RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          color:        Colors.white,
          surfaceTintColor: Colors.transparent,
        ),
        inputDecorationTheme: InputDecorationTheme(
          filled:            true,
          fillColor:         Colors.white,
          contentPadding:    const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          border:            OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide:   const BorderSide(color: Color(0xFFE2E8F0)),
          ),
          enabledBorder:     OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide:   const BorderSide(color: Color(0xFFE2E8F0)),
          ),
          focusedBorder:     OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide:   const BorderSide(color: Color(0xFF6366F1), width: 1.5),
          ),
          errorBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide:   const BorderSide(color: Color(0xFFEF4444)),
          ),
        ),
        elevatedButtonTheme: ElevatedButtonThemeData(
          style: ElevatedButton.styleFrom(
            backgroundColor: const Color(0xFF6366F1),
            foregroundColor: Colors.white,
            elevation:       0,
            padding:         const EdgeInsets.symmetric(vertical: 14),
            shape:           RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            textStyle:       const TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
          ),
        ),
        bottomNavigationBarTheme: const BottomNavigationBarThemeData(
          backgroundColor:      Colors.white,
          selectedItemColor:    Color(0xFF6366F1),
          unselectedItemColor:  Color(0xFF94A3B8),
          type:                 BottomNavigationBarType.fixed,
          elevation:            8,
          selectedLabelStyle:   TextStyle(fontSize: 11, fontWeight: FontWeight.w600),
          unselectedLabelStyle: TextStyle(fontSize: 11),
        ),
      ),

      // Auth-gated routing
      home: authState.isLoading
          ? const _SplashScreen()
          : authState.isAuthenticated
              ? const HomeScreen()
              : const LoginScreen(),
    );
  }
}

class _SplashScreen extends StatelessWidget {
  const _SplashScreen();

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      backgroundColor: Color(0xFF6366F1),
      body: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.inventory_2_rounded, size: 56, color: Colors.white),
            SizedBox(height: 16),
            Text(
              'InventoSmart',
              style: TextStyle(
                color:      Colors.white,
                fontSize:   24,
                fontWeight: FontWeight.bold,
              ),
            ),
            SizedBox(height: 8),
            Text(
              'GST Inventory & Billing',
              style: TextStyle(color: Color(0xFFBFDBFE), fontSize: 14),
            ),
            SizedBox(height: 40),
            CircularProgressIndicator(color: Colors.white54, strokeWidth: 2),
          ],
        ),
      ),
    );
  }
}