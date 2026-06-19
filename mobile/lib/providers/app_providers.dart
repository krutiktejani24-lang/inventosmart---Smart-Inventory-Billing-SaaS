import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../services/api_service.dart';

// ── Auth State ─────────────────────────────────────────────────────
class AuthState {
  final String? token;
  final Map<String, dynamic>? user;
  final Map<String, dynamic>? business;
  final bool isLoading;
  final String? error;

  const AuthState({this.token, this.user, this.business, this.isLoading = false, this.error});
  bool get isAuthenticated => token != null && token!.isNotEmpty;

  AuthState copyWith({String? token, Map<String, dynamic>? user, Map<String, dynamic>? business,
    bool? isLoading, String? error, bool clearError = false}) =>
      AuthState(
        token: token ?? this.token, user: user ?? this.user,
        business: business ?? this.business, isLoading: isLoading ?? this.isLoading,
        error: clearError ? null : (error ?? this.error),
      );
}

class AuthNotifier extends StateNotifier<AuthState> {
  AuthNotifier() : super(const AuthState()) { _load(); }

  Future<void> _load() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('token');
    if (token == null) return;
    state = state.copyWith(token: token, isLoading: true);
    try {
      final res = await api.getMe();
      final u = (res.data['user'] as Map<String, dynamic>);
      state = state.copyWith(token: token, user: u, business: u['business'] as Map<String, dynamic>?, isLoading: false, clearError: true);
    } catch (_) {
      final prefs = await SharedPreferences.getInstance();
      await prefs.clear();
      state = const AuthState();
    }
  }

  Future<bool> login(String email, String password) async {
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      final res  = await api.login(email.trim(), password);
      final data = res.data as Map<String, dynamic>;
      final token = data['token'] as String;
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('token', token);
      state = state.copyWith(token: token, user: data['user'] as Map<String, dynamic>?,
        business: data['business'] as Map<String, dynamic>?, isLoading: false, clearError: true);
      return true;
    } catch (e) {
      String msg = 'Login failed';
      if (e.toString().contains('401')) msg = 'Invalid email or password';
      else if (e.toString().contains('connection')) msg = 'Cannot connect to server';
      state = state.copyWith(isLoading: false, error: msg);
      return false;
    }
  }

  Future<void> logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.clear();
    state = const AuthState();
  }

  void clearError() => state = state.copyWith(clearError: true);
}

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) => AuthNotifier());

// ── Dashboard ──────────────────────────────────────────────────────
final dashboardProvider = FutureProvider.autoDispose<Map<String, dynamic>>((ref) async {
  final res = await api.getDashboard();
  return res.data as Map<String, dynamic>;
});

// ── Products ───────────────────────────────────────────────────────
class ProductsState {
  final List<Map<String, dynamic>> products;
  final bool isLoading, isLoadingMore;
  final String? error;
  final int page, totalPages;
  final String search;

  const ProductsState({this.products = const [], this.isLoading = false, this.isLoadingMore = false,
    this.error, this.page = 1, this.totalPages = 1, this.search = ''});
  bool get hasMore => page < totalPages;

  ProductsState copyWith({List<Map<String, dynamic>>? products, bool? isLoading, bool? isLoadingMore,
    String? error, bool clearError = false, int? page, int? totalPages, String? search}) =>
      ProductsState(products: products ?? this.products, isLoading: isLoading ?? this.isLoading,
        isLoadingMore: isLoadingMore ?? this.isLoadingMore,
        error: clearError ? null : (error ?? this.error),
        page: page ?? this.page, totalPages: totalPages ?? this.totalPages, search: search ?? this.search);
}

class ProductsNotifier extends StateNotifier<ProductsState> {
  ProductsNotifier() : super(const ProductsState());

  Future<void> load({String search = ''}) async {
    state = state.copyWith(isLoading: true, clearError: true, search: search);
    try {
      final res  = await api.getProducts(page: 1, search: search);
      final data = res.data as Map<String, dynamic>;
      final list = (data['products'] as List).cast<Map<String, dynamic>>();
      final pagination = data['pagination'] as Map<String, dynamic>;
      state = state.copyWith(products: list, isLoading: false,
        page: 1, totalPages: pagination['totalPages'] as int? ?? 1);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: 'Failed to load products');
    }
  }

  Future<void> loadMore() async {
    if (!state.hasMore || state.isLoadingMore) return;
    state = state.copyWith(isLoadingMore: true);
    try {
      final res  = await api.getProducts(page: state.page + 1, search: state.search);
      final list = ((res.data as Map)['products'] as List).cast<Map<String, dynamic>>();
      state = state.copyWith(products: [...state.products, ...list],
        isLoadingMore: false, page: state.page + 1);
    } catch (_) { state = state.copyWith(isLoadingMore: false); }
  }
}

final productsProvider = StateNotifierProvider.autoDispose<ProductsNotifier, ProductsState>(
  (ref) => ProductsNotifier()..load());

// ── Categories ─────────────────────────────────────────────────────
final categoriesProvider = FutureProvider.autoDispose<List<Map<String, dynamic>>>((ref) async {
  final res = await api.getCategories();
  return ((res.data['categories']) as List).cast<Map<String, dynamic>>();
});

// ── Invoices ───────────────────────────────────────────────────────
final invoicesProvider = FutureProvider.autoDispose.family<List<Map<String, dynamic>>, String>((ref, status) async {
  final res = await api.getInvoices(status: status);
  return ((res.data['invoices']) as List? ?? []).cast<Map<String, dynamic>>();
});

// ── Customers ──────────────────────────────────────────────────────
class PaginatedState<T> {
  final List<T> items;
  final bool isLoading;
  final String? error;
  final int page, totalPages;
  final String search;

  const PaginatedState({this.items = const [], this.isLoading = false,
    this.error, this.page = 1, this.totalPages = 1, this.search = ''});
  bool get hasMore => page < totalPages;

  PaginatedState<T> copyWith({List<T>? items, bool? isLoading, String? error,
    bool clearError = false, int? page, int? totalPages, String? search}) =>
      PaginatedState<T>(items: items ?? this.items, isLoading: isLoading ?? this.isLoading,
        error: clearError ? null : (error ?? this.error),
        page: page ?? this.page, totalPages: totalPages ?? this.totalPages, search: search ?? this.search);
}

class CustomersNotifier extends StateNotifier<PaginatedState<Map<String, dynamic>>> {
  CustomersNotifier() : super(const PaginatedState()) { load(); }

  Future<void> load({String search = ''}) async {
    state = state.copyWith(isLoading: true, clearError: true, search: search);
    try {
      final res  = await api.getCustomers(search: search);
      final data = res.data as Map<String, dynamic>;
      final list = ((data['customers']) as List).cast<Map<String, dynamic>>();
      final pg   = data['pagination'] as Map<String, dynamic>;
      state = state.copyWith(items: list, isLoading: false, page: 1,
        totalPages: pg['totalPages'] as int? ?? 1);
    } catch (e) { state = state.copyWith(isLoading: false, error: 'Failed'); }
  }
}

final customersProvider = StateNotifierProvider.autoDispose<CustomersNotifier, PaginatedState<Map<String, dynamic>>>(
  (ref) => CustomersNotifier());

class VendorsNotifier extends StateNotifier<PaginatedState<Map<String, dynamic>>> {
  VendorsNotifier() : super(const PaginatedState()) { load(); }

  Future<void> load({String search = ''}) async {
    state = state.copyWith(isLoading: true, clearError: true, search: search);
    try {
      final res  = await api.getVendors(search: search);
      final list = ((res.data['vendors']) as List).cast<Map<String, dynamic>>();
      final pg   = (res.data['pagination']) as Map<String, dynamic>;
      state = state.copyWith(items: list, isLoading: false, page: 1,
        totalPages: pg['totalPages'] as int? ?? 1);
    } catch (e) { state = state.copyWith(isLoading: false, error: 'Failed'); }
  }
}

final vendorsProvider = StateNotifierProvider.autoDispose<VendorsNotifier, PaginatedState<Map<String, dynamic>>>(
  (ref) => VendorsNotifier());

final purchaseOrdersProvider = FutureProvider.autoDispose<List<Map<String, dynamic>>>((ref) async {
  final res = await api.getPurchaseOrders();
  return ((res.data['purchase_orders']) as List? ?? []).cast<Map<String, dynamic>>();
});

// ── Reports ────────────────────────────────────────────────────────
final topProductsProvider = FutureProvider.autoDispose<List<Map<String, dynamic>>>((ref) async {
  final res = await api.getTopProducts();
  return ((res.data['rows']) as List? ?? []).cast<Map<String, dynamic>>();
});

final lowStockReportProvider = FutureProvider.autoDispose<List<Map<String, dynamic>>>((ref) async {
  final res = await api.getLowStockReport();
  return ((res.data['rows']) as List? ?? []).cast<Map<String, dynamic>>();
});