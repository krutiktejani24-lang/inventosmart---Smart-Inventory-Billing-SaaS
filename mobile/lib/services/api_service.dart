import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';

class ApiService {
  static const String baseUrl = 'http://10.0.2.2:5001/api';


  late final Dio _dio;

  ApiService() {
    _dio = Dio(BaseOptions(
      baseUrl:        baseUrl,
      connectTimeout: const Duration(seconds: 10),
      receiveTimeout: const Duration(seconds: 15),
      headers:        {'Content-Type': 'application/json'},
    ));

    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        final prefs = await SharedPreferences.getInstance();
        final token = prefs.getString('token');
        if (token != null) options.headers['Authorization'] = 'Bearer $token';
        return handler.next(options);
      },
      onError: (error, handler) async {
        if (error.response?.statusCode == 401) {
          final prefs = await SharedPreferences.getInstance();
          await prefs.clear();
        }
        return handler.next(error);
      },
    ));
  }

  // ── Auth ──────────────────────────────────────────────────────────
  Future<Response> login(String email, String password) =>
      _dio.post('/auth/login', data: {'email': email, 'password': password});
  Future<Response> getMe() => _dio.get('/auth/me');
  Future<Response> changePassword(String current, String newPass) =>
      _dio.post('/auth/change-password', data: {'currentPassword': current, 'newPassword': newPass});
  Future<Response> updateBusiness(Map<String, dynamic> data) =>
      _dio.put('/auth/business', data: data);
  Future<Response> getTeam() => _dio.get('/auth/team');
  Future<Response> addTeamMember(Map<String, dynamic> data) =>
      _dio.post('/auth/team', data: data);

  // ── Dashboard ─────────────────────────────────────────────────────
  Future<Response> getDashboard() => _dio.get('/reports/dashboard');

  // ── Inventory ─────────────────────────────────────────────────────
  Future<Response> getProducts({int page = 1, int limit = 20, String search = '', String? categoryId}) =>
      _dio.get('/products', queryParameters: {
        'page': page, 'limit': limit,
        if (search.isNotEmpty) 'search': search,
        if (categoryId != null) 'categoryId': categoryId,
      });
  Future<Response> createProduct(Map<String, dynamic> data) => _dio.post('/products', data: data);
  Future<Response> updateProduct(String id, Map<String, dynamic> data) => _dio.put('/products/$id', data: data);
  Future<Response> deleteProduct(String id) => _dio.delete('/products/$id');
  Future<Response> getLowStock() => _dio.get('/products/low-stock');
  Future<Response> getCategories() => _dio.get('/products/categories');
  Future<Response> createCategory(String name) => _dio.post('/products/categories', data: {'name': name});
  Future<Response> stockIn(String productId, int qty, String reason) =>
      _dio.post('/inventory/stock-in', data: {'productId': productId, 'qty': qty, 'reason': reason});
  Future<Response> stockOut(String productId, int qty, String reason) =>
      _dio.post('/inventory/stock-out', data: {'productId': productId, 'qty': qty, 'reason': reason});
  Future<Response> getMovements(String productId) =>
      _dio.get('/inventory/movements/$productId');

  // ── Billing ───────────────────────────────────────────────────────
  Future<Response> getInvoices({int page = 1, String status = ''}) =>
      _dio.get('/invoices', queryParameters: {'page': page, 'limit': 20, if (status.isNotEmpty) 'status': status});
  Future<Response> getInvoice(String id) => _dio.get('/invoices/$id');
  Future<Response> createInvoice(Map<String, dynamic> data) => _dio.post('/invoices', data: data);
  Future<Response> updateInvoiceStatus(String id, String status) =>
      _dio.put('/invoices/$id/status', data: {'status': status});
  Future<Response> recordPayment(String id, Map<String, dynamic> data) =>
      _dio.post('/invoices/$id/payment', data: data);
  Future<Response> sendInvoiceEmail(String id) => _dio.post('/invoices/$id/send-email');
  Future<Response> getWhatsAppLink(String id) => _dio.get('/invoices/$id/whatsapp');
  Future<Response> getUpiQR(String id) => _dio.get('/invoices/$id/upi-qr');
  Future<Response> getPdfBuffer(String id) =>
      _dio.get('/invoices/$id/pdf', options: Options(responseType: ResponseType.bytes));

  // ── Customers ─────────────────────────────────────────────────────
  Future<Response> getCustomers({int page = 1, String search = ''}) =>
      _dio.get('/customers', queryParameters: {'page': page, 'limit': 20, if (search.isNotEmpty) 'search': search});
  Future<Response> createCustomer(Map<String, dynamic> data) => _dio.post('/customers', data: data);
  Future<Response> updateCustomer(String id, Map<String, dynamic> data) => _dio.put('/customers/$id', data: data);
  Future<Response> deleteCustomer(String id) => _dio.delete('/customers/$id');
  Future<Response> getCustomerInvoices(String id) => _dio.get('/customers/$id/invoices');
  Future<Response> getCustomerBalance(String id) => _dio.get('/customers/$id/balance');

  // ── Vendors ───────────────────────────────────────────────────────
  Future<Response> getVendors({int page = 1, String search = ''}) =>
      _dio.get('/vendors', queryParameters: {'page': page, 'limit': 20, if (search.isNotEmpty) 'search': search});
  Future<Response> createVendor(Map<String, dynamic> data) => _dio.post('/vendors', data: data);
  Future<Response> updateVendor(String id, Map<String, dynamic> data) => _dio.put('/vendors/$id', data: data);
  Future<Response> getPurchaseOrders({int page = 1}) =>
      _dio.get('/purchase-orders', queryParameters: {'page': page, 'limit': 20});
  Future<Response> createPurchaseOrder(Map<String, dynamic> data) =>
      _dio.post('/purchase-orders', data: data);
  Future<Response> receivePO(String id) => _dio.put('/purchase-orders/$id/receive');

  // ── Reports ───────────────────────────────────────────────────────
  Future<Response> getSalesReport(String from, String to) =>
      _dio.get('/reports/sales', queryParameters: {'from': from, 'to': to});
  Future<Response> getPLReport(String from, String to) =>
      _dio.get('/reports/profit-loss', queryParameters: {'from': from, 'to': to});
  Future<Response> getInventoryValuation() => _dio.get('/reports/inventory-valuation');
  Future<Response> getTopProducts({int limit = 10}) =>
      _dio.get('/reports/top-products', queryParameters: {'limit': limit});
  Future<Response> getGSTR1(int month, int year) =>
      _dio.get('/reports/gstr1', queryParameters: {'month': month, 'year': year});
  Future<Response> getLowStockReport() => _dio.get('/reports/low-stock');
}

final ApiService api = ApiService();