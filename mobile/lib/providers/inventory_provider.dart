import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/api_service.dart';

final inventoryProvider = FutureProvider<List>((ref) async {
  final res = await apiService.get('/products');
  return res.data['products'] ?? [];
});
