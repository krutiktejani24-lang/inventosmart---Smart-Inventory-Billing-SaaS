import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

class AppTheme {
  static const Color primary   = Color(0xFF6366F1);
  static const Color emerald   = Color(0xFF10B981);
  static const Color amber     = Color(0xFFF59E0B);
  static const Color red       = Color(0xFFEF4444);
  static const Color slate800  = Color(0xFF1E293B);
  static const Color slate600  = Color(0xFF475569);
  static const Color slate400  = Color(0xFF94A3B8);
  static const Color slate200  = Color(0xFFE2E8F0);
  static const Color slate100  = Color(0xFFF1F5F9);
  static const Color slate50   = Color(0xFFF8FAFC);
  static const Color indigo50  = Color(0xFFEEF2FF);
  static const Color white     = Colors.white;

  static ThemeData get theme => ThemeData(
    useMaterial3:    true,
    colorSchemeSeed: primary,
    fontFamily:      'Roboto',
    scaffoldBackgroundColor: slate50,
    appBarTheme: const AppBarTheme(
      backgroundColor:  white,
      foregroundColor:  slate800,
      elevation:        0,
      centerTitle:      false,
      surfaceTintColor: Colors.transparent,
      titleTextStyle: TextStyle(
        color: slate800, fontSize: 17, fontWeight: FontWeight.w600,
      ),
      systemOverlayStyle: SystemUiOverlayStyle(
        statusBarColor:          Colors.transparent,
        statusBarIconBrightness: Brightness.dark,
      ),
    ),
    cardTheme: CardThemeData(
      elevation:        0,
      color:            white,
      surfaceTintColor: Colors.transparent,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: const BorderSide(color: slate200),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled:         true,
      fillColor:      white,
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      border:         OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: slate200)),
      enabledBorder:  OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: slate200)),
      focusedBorder:  OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: primary, width: 1.5)),
      errorBorder:    OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: red)),
      labelStyle:     const TextStyle(color: slate400, fontSize: 14),
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: primary,
        foregroundColor: white,
        elevation:       0,
        padding:         const EdgeInsets.symmetric(vertical: 14),
        shape:           RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        textStyle:       const TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
      ),
    ),
    bottomNavigationBarTheme: const BottomNavigationBarThemeData(
      backgroundColor:      white,
      selectedItemColor:    primary,
      unselectedItemColor:  slate400,
      type:                 BottomNavigationBarType.fixed,
      elevation:            12,
      selectedLabelStyle:   TextStyle(fontSize: 11, fontWeight: FontWeight.w600),
      unselectedLabelStyle: TextStyle(fontSize: 11),
    ),
    dividerTheme: const DividerThemeData(color: slate100, thickness: 1, space: 0),
    chipTheme: ChipThemeData(
      backgroundColor:  slate100,
      selectedColor:    indigo50,
      labelStyle:       const TextStyle(fontSize: 12, fontWeight: FontWeight.w500),
      shape:            RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
    ),
  );
}

// ── Reusable status badge colors ───────────────────────────────────
extension InvoiceStatusColor on String {
  Color get statusColor {
    switch (this) {
      case 'PAID':      return AppTheme.emerald;
      case 'SENT':      return const Color(0xFF3B82F6);
      case 'CANCELLED': return AppTheme.red;
      case 'RECEIVED':  return AppTheme.emerald;
      case 'PENDING':   return AppTheme.amber;
      default:          return AppTheme.slate400;
    }
  }
  Color get statusBg {
    switch (this) {
      case 'PAID':      return const Color(0xFFECFDF5);
      case 'SENT':      return const Color(0xFFEFF6FF);
      case 'CANCELLED': return const Color(0xFFFEF2F2);
      case 'RECEIVED':  return const Color(0xFFECFDF5);
      case 'PENDING':   return const Color(0xFFFEF3C7);
      default:          return AppTheme.slate100;
    }
  }
}