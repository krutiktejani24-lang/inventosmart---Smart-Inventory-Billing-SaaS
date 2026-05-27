import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../providers/inventory_provider.dart';
import 'add_product_screen.dart';
import 'stock_adjust_screen.dart';

class InventoryScreen extends ConsumerStatefulWidget {
  const InventoryScreen({super.key});

  @override
  ConsumerState<InventoryScreen> createState() => _InventoryScreenState();
}

class _InventoryScreenState extends ConsumerState<InventoryScreen> {
  final _searchCtrl   = TextEditingController();
  final _scrollCtrl   = ScrollController();
  bool  _showSearch   = false;

  @override
  void initState() {
    super.initState();
    // Load products on first mount
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(inventoryProvider.notifier).loadProducts();
    });

    // Pagination — load more on scroll end
    _scrollCtrl.addListener(() {
      if (_scrollCtrl.position.pixels >= _scrollCtrl.position.maxScrollExtent - 200) {
        ref.read(inventoryProvider.notifier).loadMore();
      }
    });
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    _scrollCtrl.dispose();
    super.dispose();
  }

  Future<void> _onRefresh() async {
    await ref.read(inventoryProvider.notifier).loadProducts(search: _searchCtrl.text.trim());
  }

  void _onSearchChanged(String val) {
    ref.read(inventoryProvider.notifier).loadProducts(search: val.trim());
  }

  @override
  Widget build(BuildContext context) {
    final state  = ref.watch(inventoryProvider);
    final fmtINR = NumberFormat.currency(locale: 'en_IN', symbol: '₹', decimalDigits: 0);

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: _showSearch
            ? TextField(
                controller:    _searchCtrl,
                autofocus:     true,
                onChanged:     _onSearchChanged,
                style:         const TextStyle(fontSize: 15),
                decoration:    const InputDecoration(
                  hintText:       'Search products, SKU...',
                  border:         InputBorder.none,
                  enabledBorder:  InputBorder.none,
                  focusedBorder:  InputBorder.none,
                  filled:         false,
                  contentPadding: EdgeInsets.zero,
                ),
              )
            : const Text('Inventory'),
        actions: [
          IconButton(
            icon: Icon(_showSearch ? Icons.close : Icons.search_rounded),
            onPressed: () {
              setState(() => _showSearch = !_showSearch);
              if (!_showSearch) {
                _searchCtrl.clear();
                ref.read(inventoryProvider.notifier).loadProducts();
              }
            },
          ),
          IconButton(
            icon: const Icon(Icons.filter_list_rounded),
            onPressed: () => _showFilterSheet(context),
          ),
        ],
      ),
      body: Column(
        children: [
          // ── Summary bar ──────────────────────────────────────────
          if (!state.isLoading && state.products.isNotEmpty)
            Container(
              color: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              child: Row(
                children: [
                  _SummaryChip(
                    label: 'Total',
                    value: '${state.products.length}',
                    color: const Color(0xFF6366F1),
                  ),
                  const SizedBox(width: 8),
                  _SummaryChip(
                    label: 'Low Stock',
                    value: '${state.products.where((p) => p.isLowStock).length}',
                    color: const Color(0xFFF59E0B),
                  ),
                  const SizedBox(width: 8),
                  _SummaryChip(
                    label: 'Out of Stock',
                    value: '${state.products.where((p) => p.isOutOfStock).length}',
                    color: const Color(0xFFEF4444),
                  ),
                ],
              ),
            ),

          // ── Product List ─────────────────────────────────────────
          Expanded(
            child: state.isLoading
                ? _buildSkeleton()
                : state.products.isEmpty
                    ? _buildEmptyState()
                    : RefreshIndicator(
                        color:     const Color(0xFF6366F1),
                        onRefresh: _onRefresh,
                        child: ListView.builder(
                          controller: _scrollCtrl,
                          padding:    const EdgeInsets.all(12),
                          itemCount:  state.products.length + (state.isLoadingMore ? 1 : 0),
                          itemBuilder: (ctx, i) {
                            if (i == state.products.length) {
                              return const Center(
                                child: Padding(
                                  padding: EdgeInsets.all(16),
                                  child: CircularProgressIndicator(strokeWidth: 2),
                                ),
                              );
                            }
                            return _ProductCard(
                              product: state.products[i],
                              fmtINR:  fmtINR,
                              onStockTap: () => _showStockAdjust(context, state.products[i]),
                            );
                          },
                        ),
                      ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _navigateToAddProduct(context),
        backgroundColor: const Color(0xFF6366F1),
        foregroundColor: Colors.white,
        icon:  const Icon(Icons.add_rounded),
        label: const Text('Add Product', style: TextStyle(fontWeight: FontWeight.w600)),
      ),
    );
  }

  Widget _buildSkeleton() {
    return ListView.builder(
      padding: const EdgeInsets.all(12),
      itemCount: 8,
      itemBuilder: (_, __) => Container(
        margin: const EdgeInsets.only(bottom: 10),
        height: 84,
        decoration: BoxDecoration(
          color:        const Color(0xFFE2E8F0),
          borderRadius: BorderRadius.circular(14),
        ),
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.inventory_2_outlined, size: 64, color: Colors.grey.shade300),
          const SizedBox(height: 16),
          Text(
            _searchCtrl.text.isNotEmpty ? 'No products found' : 'No products yet',
            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: Color(0xFF475569)),
          ),
          const SizedBox(height: 8),
          Text(
            _searchCtrl.text.isNotEmpty ? 'Try a different search' : 'Tap + to add your first product',
            style: const TextStyle(fontSize: 13, color: Color(0xFF94A3B8)),
          ),
        ],
      ),
    );
  }

  void _navigateToAddProduct(BuildContext context) async {
    final result = await Navigator.push<bool>(
      context,
      MaterialPageRoute(builder: (_) => const AddProductScreen()),
    );
    if (result == true) _onRefresh();
  }

  void _showStockAdjust(BuildContext context, Product product) {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => StockAdjustScreen(product: product)),
    ).then((_) => _onRefresh());
  }

  void _showFilterSheet(BuildContext context) {
    showModalBottomSheet(
      context:       context,
      shape:         const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (_) => Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Filter', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            const SizedBox(height: 16),
            ...[
              ('All Products',  ''),
              ('Low Stock Only','low'),
              ('Out of Stock',  'out'),
            ].map((item) => ListTile(
              title: Text(item.$1),
              onTap: () {
                Navigator.pop(context);
                final notifier = ref.read(inventoryProvider.notifier);
                notifier.loadProducts();
              },
            )),
          ],
        ),
      ),
    );
  }
}

// ── Product Card ───────────────────────────────────────────────────
class _ProductCard extends StatelessWidget {
  final Product      product;
  final NumberFormat fmtINR;
  final VoidCallback onStockTap;

  const _ProductCard({
    required this.product,
    required this.fmtINR,
    required this.onStockTap,
  });

  @override
  Widget build(BuildContext context) {
    final stockColor = product.isOutOfStock
        ? const Color(0xFFEF4444)
        : product.isLowStock
            ? const Color(0xFFF59E0B)
            : const Color(0xFF10B981);

    final stockBg = product.isOutOfStock
        ? const Color(0xFFFEF2F2)
        : product.isLowStock
            ? const Color(0xFFFEF3C7)
            : const Color(0xFFECFDF5);

    final stockLabel = product.isOutOfStock
        ? 'Out of Stock'
        : product.isLowStock
            ? 'Low Stock'
            : 'In Stock';

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration: BoxDecoration(
        color:        Colors.white,
        borderRadius: BorderRadius.circular(14),
        border:       Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: InkWell(
        borderRadius: BorderRadius.circular(14),
        onTap: () {},
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Row(
            children: [
              // Icon
              Container(
                width: 44, height: 44,
                decoration: BoxDecoration(
                  color:        const Color(0xFFEEF2FF),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(Icons.inventory_2_rounded, color: Color(0xFF6366F1), size: 22),
              ),
              const SizedBox(width: 12),

              // Name + SKU
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      product.name,
                      style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: Color(0xFF0F172A)),
                      maxLines: 1, overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 3),
                    Row(
                      children: [
                        if (product.sku != null) ...[
                          Text(product.sku!, style: const TextStyle(fontSize: 11, color: Color(0xFF94A3B8), fontFamily: 'monospace')),
                          const SizedBox(width: 6),
                          const Text('•', style: TextStyle(color: Color(0xFFCBD5E1))),
                          const SizedBox(width: 6),
                        ],
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color:        stockBg,
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: Text(
                            stockLabel,
                            style: TextStyle(fontSize: 10, color: stockColor, fontWeight: FontWeight.w600),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 10),

              // Price + Stock + Action
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    fmtINR.format(product.price),
                    style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
                  ),
                  const SizedBox(height: 4),
                  GestureDetector(
                    onTap: onStockTap,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color:        stockBg,
                        borderRadius: BorderRadius.circular(8),
                        border:       Border.all(color: stockColor.withOpacity(0.3)),
                      ),
                      child: Text(
                        '${product.stockQty} ${product.unit}',
                        style: TextStyle(fontSize: 11, color: stockColor, fontWeight: FontWeight.w700),
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ── Summary Chip ───────────────────────────────────────────────────
class _SummaryChip extends StatelessWidget {
  final String label, value;
  final Color  color;
  const _SummaryChip({required this.label, required this.value, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color:        color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        '$label: $value',
        style: TextStyle(fontSize: 11, color: color, fontWeight: FontWeight.w600),
      ),
    );
  }
}