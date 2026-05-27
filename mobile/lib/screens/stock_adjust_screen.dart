import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../services/api_service.dart';
import '../providers/inventory_provider.dart';

class StockAdjustScreen extends StatefulWidget {
  final Product product;
  const StockAdjustScreen({super.key, required this.product});

  @override
  State<StockAdjustScreen> createState() => _StockAdjustScreenState();
}

class _StockAdjustScreenState extends State<StockAdjustScreen> {
  final _formKey    = GlobalKey<FormState>();
  final _qtyCtrl    = TextEditingController();
  final _reasonCtrl = TextEditingController();

  bool   _isStockIn = true;
  bool   _saving    = false;
  String? _error;

  @override
  void dispose() {
    _qtyCtrl.dispose();
    _reasonCtrl.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    FocusScope.of(context).unfocus();
    setState(() { _saving = true; _error = null; });

    try {
      final qty    = int.parse(_qtyCtrl.text.trim());
      final reason = _reasonCtrl.text.trim();

      if (_isStockIn) {
        await apiService.stockIn(widget.product.id, qty, reason.isEmpty ? 'Manual stock in' : reason);
      } else {
        await apiService.stockOut(widget.product.id, qty, reason.isEmpty ? 'Manual stock out' : reason);
      }

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              _isStockIn
                  ? 'Added $qty ${widget.product.unit} to stock'
                  : 'Removed $qty ${widget.product.unit} from stock',
            ),
            backgroundColor: _isStockIn ? const Color(0xFF10B981) : const Color(0xFFEF4444),
          ),
        );
        Navigator.pop(context, true);
      }
    } catch (e) {
      String msg = 'Failed to update stock';
      if (e.toString().contains('Insufficient')) msg = 'Insufficient stock available';
      setState(() { _error = msg; _saving = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    final product    = widget.product;
    final stockColor = _isStockIn ? const Color(0xFF10B981) : const Color(0xFFEF4444);

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(title: const Text('Adjust Stock')),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [

            // Product info card
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color:        Colors.white,
                borderRadius: BorderRadius.circular(16),
                border:       Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Row(
                children: [
                  Container(
                    width: 48, height: 48,
                    decoration: BoxDecoration(
                      color:        const Color(0xFFEEF2FF),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Icon(Icons.inventory_2_rounded, color: Color(0xFF6366F1), size: 24),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(product.name,
                          style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: Color(0xFF0F172A)),
                          maxLines: 1, overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 4),
                        Row(
                          children: [
                            const Text('Current Stock: ', style: TextStyle(fontSize: 12, color: Color(0xFF94A3B8))),
                            Text(
                              '${product.stockQty} ${product.unit}',
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w700,
                                color: product.isOutOfStock
                                    ? const Color(0xFFEF4444)
                                    : product.isLowStock
                                        ? const Color(0xFFF59E0B)
                                        : const Color(0xFF10B981),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // IN / OUT toggle
            Container(
              decoration: BoxDecoration(
                color:        Colors.white,
                borderRadius: BorderRadius.circular(14),
                border:       Border.all(color: const Color(0xFFE2E8F0)),
              ),
              padding: const EdgeInsets.all(6),
              child: Row(
                children: [
                  _TypeButton(
                    label:    'Stock In',
                    icon:     Icons.add_circle_outline_rounded,
                    selected: _isStockIn,
                    color:    const Color(0xFF10B981),
                    onTap:    () => setState(() => _isStockIn = true),
                  ),
                  const SizedBox(width: 6),
                  _TypeButton(
                    label:    'Stock Out',
                    icon:     Icons.remove_circle_outline_rounded,
                    selected: !_isStockIn,
                    color:    const Color(0xFFEF4444),
                    onTap:    () => setState(() => _isStockIn = false),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Error
            if (_error != null) ...[
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color:        const Color(0xFFFEF2F2),
                  borderRadius: BorderRadius.circular(12),
                  border:       Border.all(color: const Color(0xFFFECACA)),
                ),
                child: Text(_error!, style: const TextStyle(color: Color(0xFFB91C1C), fontSize: 13)),
              ),
              const SizedBox(height: 12),
            ],

            // Quantity
            TextFormField(
              controller:      _qtyCtrl,
              keyboardType:    TextInputType.number,
              autofocus:       true,
              inputFormatters: [FilteringTextInputFormatter.digitsOnly],
              style: const TextStyle(fontSize: 28, fontWeight: FontWeight.bold),
              textAlign: TextAlign.center,
              decoration: InputDecoration(
                labelText:  'Quantity (${product.unit})',
                hintText:   '0',
                prefixIcon: Icon(
                  _isStockIn ? Icons.add_rounded : Icons.remove_rounded,
                  color: stockColor, size: 24,
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide:   BorderSide(color: stockColor, width: 1.5),
                ),
              ),
              validator: (v) {
                if (v == null || v.trim().isEmpty) return 'Quantity is required';
                final n = int.tryParse(v);
                if (n == null || n <= 0) return 'Enter a valid quantity (min 1)';
                if (!_isStockIn && n > product.stockQty) {
                  return 'Cannot remove more than current stock (${product.stockQty})';
                }
                return null;
              },
            ),
            const SizedBox(height: 16),

            // Reason
            TextFormField(
              controller:  _reasonCtrl,
              maxLines:    2,
              decoration:  const InputDecoration(
                labelText:  'Reason (optional)',
                hintText:   'e.g. Purchase from vendor, Damaged goods...',
                prefixIcon: Icon(Icons.notes_rounded, size: 20),
              ),
            ),
            const SizedBox(height: 24),

            // Preview
            AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              padding:  const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color:        stockColor.withOpacity(0.08),
                borderRadius: BorderRadius.circular(14),
                border:       Border.all(color: stockColor.withOpacity(0.2)),
              ),
              child: Row(
                children: [
                  Icon(
                    _isStockIn ? Icons.trending_up_rounded : Icons.trending_down_rounded,
                    color: stockColor, size: 22,
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          _isStockIn ? 'After stock in' : 'After stock out',
                          style: const TextStyle(fontSize: 11, color: Color(0xFF94A3B8)),
                        ),
                        Text(
                          () {
                            final qty = int.tryParse(_qtyCtrl.text) ?? 0;
                            final after = _isStockIn
                                ? product.stockQty + qty
                                : product.stockQty - qty;
                            return '${after < 0 ? 0 : after} ${product.unit}';
                          }(),
                          style: TextStyle(
                            fontSize: 20, fontWeight: FontWeight.bold, color: stockColor,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 100),
          ],
        ),
      ),
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
          child: SizedBox(
            height: 52,
            child: ElevatedButton(
              onPressed: _saving ? null : _save,
              style: ElevatedButton.styleFrom(
                backgroundColor: stockColor,
                shape:           RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              child: _saving
                  ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.white))
                  : Text(
                      _isStockIn ? 'Confirm Stock In' : 'Confirm Stock Out',
                      style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: Colors.white),
                    ),
            ),
          ),
        ),
      ),
    );
  }
}

class _TypeButton extends StatelessWidget {
  final String     label;
  final IconData   icon;
  final bool       selected;
  final Color      color;
  final VoidCallback onTap;

  const _TypeButton({
    required this.label,
    required this.icon,
    required this.selected,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) => Expanded(
    child: GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding:  const EdgeInsets.symmetric(vertical: 12),
        decoration: BoxDecoration(
          color:        selected ? color : Colors.transparent,
          borderRadius: BorderRadius.circular(10),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, color: selected ? Colors.white : const Color(0xFF94A3B8), size: 18),
            const SizedBox(width: 6),
            Text(
              label,
              style: TextStyle(
                color:      selected ? Colors.white : const Color(0xFF94A3B8),
                fontWeight: FontWeight.w600,
                fontSize:   14,
              ),
            ),
          ],
        ),
      ),
    ),
  );
}