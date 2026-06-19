import 'package:intl/intl.dart';

final fmtINR  = NumberFormat.currency(locale: 'en_IN', symbol: '₹', decimalDigits: 0);
final fmtINR2 = NumberFormat.currency(locale: 'en_IN', symbol: '₹', decimalDigits: 2);
final fmtDate = DateFormat('dd MMM yyyy');
final fmtDateShort = DateFormat('dd MMM');

String formatINR(num? n)  => fmtINR.format(n ?? 0);
String formatINR2(num? n) => fmtINR2.format(n ?? 0);
String formatDate(String? s) {
  if (s == null || s.isEmpty) return '—';
  try { return fmtDate.format(DateTime.parse(s)); } catch (_) { return s; }
}
String formatDateShort(String? s) {
  if (s == null || s.isEmpty) return '—';
  try { return fmtDateShort.format(DateTime.parse(s)); } catch (_) { return s; }
}

String greeting() {
  final h = DateTime.now().hour;
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

String errorMessage(dynamic e) {
  final s = e.toString();
  if (s.contains('401'))        return 'Session expired. Please login again.';
  if (s.contains('403'))        return 'Access denied.';
  if (s.contains('404'))        return 'Not found.';
  if (s.contains('422'))        return 'Validation failed. Check all fields.';
  if (s.contains('500'))        return 'Server error. Try again.';
  if (s.contains('connection')) return 'Cannot connect to server. Check if backend is running.';
  if (s.contains('timeout'))    return 'Request timed out. Check your connection.';
  return 'Something went wrong. Please try again.';
}