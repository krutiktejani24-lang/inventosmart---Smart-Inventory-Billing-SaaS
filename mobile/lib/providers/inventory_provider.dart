import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/api_service.dart';

// ── Product Model ─────────────────────────────────────────────────
class Product {
  final String  id;
  final String  name;
  final String? sku;
  final String? hsnCode;
  final double  price;
  final double  costPrice;
  final int     stockQty;
  final int     minThreshold;
  final String  unit;
  final double  gstRate;
  final String? categoryId;
  final String? categoryName;

  const Product({
    required this.id,
    required this.name,
    this.sku,
    this.hsnCode,
    required this.price,
    required this.costPrice,
    required this.stockQty,
    required this.minThreshold,
    required this.unit,
    required this.gstRate,
    this.categoryId,
    this.categoryName,
  });

  bool get isLowStock => stockQty < minThreshold;
  bool get isOutOfStock => stockQty == 0;

  factory Product.fromJson(Map<String, dynamic> json) => Product(
    id:            json['id']            ?? '',
    name:          json['name']          ?? '',
    sku:           json['sku'],
    hsnCode:       json['hsn_code'],
    price:         (json['price']         as num? ?? 0).toDouble(),
    costPrice:     (json['cost_price']    as num? ?? 0).toDouble(),
    stockQty:      json['stock_qty']      as int? ?? 0,
    minThreshold:  json['min_threshold']  as int? ?? 5,
    unit:          json['unit']           ?? 'Pcs',
    gstRate:       (json['gst_rate']      as num? ?? 18).toDouble(),
    categoryId:    json['category_id'],
    categoryName:  json['category']?['name'],
  );
}

// ── Inventory State ───────────────────────────────────────────────
class InventoryState {
  final List<Product> products;
  final bool          isLoading;
  final bool          isLoadingMore;
  final String?       error;
  final int           page;
  final int           totalPages;
  final String        search;

  const InventoryState({
    this.products      = const [],
    this.isLoading     = false,
    this.isLoadingMore = false,
    this.error,
    this.page          = 1,
    this.totalPages    = 1,
    this.search        = '',
  });

  bool get hasMore => page < totalPages;

  InventoryState copyWith({
    List<Product>? products,
    bool?          isLoading,
    bool?          isLoadingMore,
    String?        error,
    bool           clearError = false,
    int?           page,
    int?           totalPages,
    String?        search,
  }) =>
      InventoryState(
        products:      products      ?? this.products,
        isLoading:     isLoading     ?? this.isLoading,
        isLoadingMore: isLoadingMore ?? this.isLoadingMore,
        error:         clearError ? null : (error ?? this.error),
        page:          page          ?? this.page,
        totalPages:    totalPages    ?? this.totalPages,
        search:        search        ?? this.search,
      );
}

// ── Inventory Notifier ────────────────────────────────────────────
class InventoryNotifier extends StateNotifier<InventoryState> {
  InventoryNotifier() : super(const InventoryState());

  /// Fresh load (pull-to-refresh or first load)
  Future<void> loadProducts({String search = ''}) async {
    state = state.copyWith(isLoading: true, clearError: true, search: search);
    try {
      final res   = await apiService.getProducts(page: 1, search: search);
      final data  = res.data as Map<String, dynamic>;
      final list  = (data['products'] as List)
          .map((e) => Product.fromJson(e as Map<String, dynamic>))
          .toList();
      final pagination = data['pagination'] as Map<String, dynamic>;

      state = state.copyWith(
        products:   list,
        isLoading:  false,
        page:       1,
        totalPages: pagination['totalPages'] as int? ?? 1,
      );
    } catch (e) {
      state = state.copyWith(isLoading: false, error: 'Failed to load products');
    }
  }

  /// Load more (pagination)
  Future<void> loadMore() async {
    if (!state.hasMore || state.isLoadingMore) return;
    state = state.copyWith(isLoadingMore: true);
    try {
      final nextPage = state.page + 1;
      final res      = await apiService.getProducts(page: nextPage, search: state.search);
      final data     = res.data as Map<String, dynamic>;
      final list     = (data['products'] as List)
          .map((e) => Product.fromJson(e as Map<String, dynamic>))
          .toList();
      state = state.copyWith(
        products:      [...state.products, ...list],
        isLoadingMore: false,
        page:          nextPage,
      );
    } catch (_) {
      state = state.copyWith(isLoadingMore: false);
    }
  }

  /// Add product locally after create (no re-fetch needed)
  void addProduct(Product product) {
    state = state.copyWith(products: [product, ...state.products]);
  }
}

// ── Providers ─────────────────────────────────────────────────────
final inventoryProvider = StateNotifierProvider<InventoryNotifier, InventoryState>(
  (ref) => InventoryNotifier(),
);

/// Dashboard stats provider
final dashboardProvider = FutureProvider<Map<String, dynamic>>((ref) async {
  final res = await apiService.getDashboard();
  return res.data as Map<String, dynamic>;
});

/// Invoices provider
final invoicesProvider = FutureProvider.family<List, String>((ref, status) async {
  final res  = await apiService.getInvoices(status: status);
  final data = res.data as Map<String, dynamic>;
  return data['invoices'] as List? ?? [];
});