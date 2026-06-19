import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/api_service.dart';

final invoicesProvider =
    FutureProvider.family<List, String>((ref, status) async {
  final res = await api.getInvoices(status: status);
  return res.data['invoices'] ?? [];
}); 
