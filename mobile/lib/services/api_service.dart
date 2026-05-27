import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// InventoSmart API Service
/// Android Emulator: 10.0.2.2 = localhost on host machine
/// Real device: use your computer's local IP e.g. 192.168.1.x:5000
class ApiService {
  static const String _baseUrl = 'http://10.0.2.2:5001/api';
  // For real device: 'http://192.168.1.100:5000/api'

  late final Dio _dio;

  ApiService() {
    _dio = Dio(BaseOptions(
      baseUrl: _baseUrl,
      connectTimeout: const Duration(seconds: 10),
      receiveTimeout: const Duration(seconds: 15),
      headers: {'Content-Type': 'application/json'},
    ));

    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          // JWT token auto-attach
          final prefs = await SharedPreferences.getInstance();
          final token = prefs.getString('token');
          if (token != null) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          return handler.next(options);
        },
        onError: (error, handler) async {
          if (error.response?.statusCode == 401) {
            // Token expired — clear storage
            final prefs = await SharedPreferences.getInstance();
            await prefs.clear();
          }
          return handler.next(error);
        },
      ),
    );
  }

  // ── Auth ──────────────────────────────────────────────────────────
  Future<Response> login(String email, String password) =>
      _dio.post('/auth/login', data: {'email': email, 'password': password});

  Future<Response> getMe() => _dio.get('/auth/me');

  // ── Dashboard ─────────────────────────────────────────────────────
  Future<Response> getDashboard() => _dio.get('/reports/dashboard');

  // ── Inventory ─────────────────────────────────────────────────────
  Future<Response> getProducts({int page = 1, int limit = 20, String search = ''}) =>
      _dio.get('/products', queryParameters: {
        'page': page,
        'limit': limit,
        if (search.isNotEmpty) 'search': search,
      });

  Future<Response> getProductById(String id) => _dio.get('/products/$id');

  Future<Response> createProduct(Map<String, dynamic> data) =>
      _dio.post('/products', data: data);

  Future<Response> updateProduct(String id, Map<String, dynamic> data) =>
      _dio.put('/products/$id', data: data);

  Future<Response> deleteProduct(String id) => _dio.delete('/products/$id');

  Future<Response> getLowStock() => _dio.get('/products/low-stock');

  Future<Response> stockIn(String productId, int qty, String reason) =>
      _dio.post('/inventory/stock-in', data: {
        'productId': productId,
        'qty': qty,
        'reason': reason,
      });

  Future<Response> stockOut(String productId, int qty, String reason) =>
      _dio.post('/inventory/stock-out', data: {
        'productId': productId,
        'qty': qty,
        'reason': reason,
      });

  Future<Response> getCategories() => _dio.get('/products/categories');

  // ── Invoices ──────────────────────────────────────────────────────
  Future<Response> getInvoices({int page = 1, String status = ''}) =>
      _dio.get('/invoices', queryParameters: {
        'page': page,
        'limit': 20,
        if (status.isNotEmpty) 'status': status,
      });

  Future<Response> getInvoiceById(String id) => _dio.get('/invoices/$id');
}

// Global singleton
final apiService = ApiService();