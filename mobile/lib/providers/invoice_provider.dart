import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/api_service.dart';

final invoiceProvider = FutureProvider<List>((ref) async {
  final res = await apiService.get('/invoices');
  return res.data['invoices'] ?? [];
});
