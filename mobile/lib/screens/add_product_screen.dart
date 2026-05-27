import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/api_service.dart';
import '../providers/inventory_provider.dart';

class AddProductScreen extends ConsumerStatefulWidget {
  final Product? editProduct; // null = add, non-null = edit
  const AddProductScreen({super.key, this.editProduct});

  @override
  ConsumerState<AddProductScreen> createState() => _AddProductScreenState();
}

class _AddProductScreenState extends ConsumerState<AddProductScreen> {
  final _formKey     = GlobalKey<FormState>();
  bool  _saving      = false;
  String? _error;

  // Controllers
  final _nameCtrl         = TextEditingController();
  final _skuCtrl          = TextEditingController();
  final _hsnCtrl          = TextEditingController();
  final _priceCtrl        = TextEditingController();
  final _costPriceCtrl    = TextEditingController();
  final _stockCtrl        = TextEditingController(text: '0');
  final _minThresholdCtrl = TextEditingController(text: '5');
  final _descCtrl         = TextEditingController();

  String _unit    = 'Pcs';
  double _gstRate = 18;

  final _units    = ['Pcs', 'Kg', 'Gm', 'L', 'Ml', 'Box', 'Pkt', 'Carton', 'Dozen', 'Mtr'];
  final _gstRates = [0.0, 5.0, 12.0, 18.0, 28.0];

  @override
  void initState() {
    super.initState();
    if (widget.editProduct != null) {
      final p = widget.editProduct!;
      _nameCtrl.text         = p.name;
      _skuCtrl.text          = p.sku          ?? '';
      _hsnCtrl.text          = p.hsnCode      ?? '';
      _priceCtrl.text        = p.price.toString();
      _costPriceCtrl.text    = p.costPrice.toString();
      _stockCtrl.text        = p.stockQty.toString();
      _minThresholdCtrl.text = p.minThreshold.toString();
      _unit                  = p.unit;
      _gstRate               = p.gstRate;
    }
  }

  @override
  void dispose() {
    _nameCtrl.dispose(); _skuCtrl.dispose(); _hsnCtrl.dispose();
    _priceCtrl.dispose(); _costPriceCtrl.dispose(); _stockCtrl.dispose();
    _minThresholdCtrl.dispose(); _descCtrl.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    FocusScope.of(context).unfocus();
    setState(() { _saving = true; _error = null; });

    try {
      final data = {
        'name':          _nameCtrl.text.trim(),
        'sku':           _skuCtrl.text.trim().isEmpty ? null : _skuCtrl.text.trim(),
        'hsn_code':      _hsnCtrl.text.trim().isEmpty ? null : _hsnCtrl.text.trim(),
        'price':         double.tryParse(_priceCtrl.text)     ?? 0,
        'cost_price':    double.tryParse(_costPriceCtrl.text)  ?? 0,
        'stock_qty':     int.tryParse(_stockCtrl.text)         ?? 0,
        'min_threshold': int.tryParse(_minThresholdCtrl.text)  ?? 5,
        'unit':          _unit,
        'gst_rate':      _gstRate,
        'description':   _descCtrl.text.trim().isEmpty ? null : _descCtrl.text.trim(),
      };

      if (widget.editProduct != null) {
        await apiService.updateProduct(widget.editProduct!.id, data);
      } else {
        await apiService.createProduct(data);
      }

      if (mounted) Navigator.pop(context, true);
    } catch (e) {
      String msg = 'Failed to save product';
      if (e.toString().contains('422')) msg = 'Validation failed — check all fields';
      else if (e.toString().contains('connection')) msg = 'Cannot connect to server';
      setState(() { _error = msg; _saving = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    final isEdit = widget.editProduct != null;

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: Text(isEdit ? 'Edit Product' : 'Add Product'),
        actions: [
          TextButton(
            onPressed: _saving ? null : _save,
            child: _saving
                ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))
                : Text(isEdit ? 'Update' : 'Save',
                    style: const TextStyle(color: Color(0xFF6366F1), fontWeight: FontWeight.w700)),
          ),
        ],
      ),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [

            // Error
            if (_error != null)
              Container(
                margin: const EdgeInsets.only(bottom: 12),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color:        const Color(0xFFFEF2F2),
                  borderRadius: BorderRadius.circular(12),
                  border:       Border.all(color: const Color(0xFFFECACA)),
                ),
                child: Text(_error!, style: const TextStyle(color: Color(0xFFB91C1C), fontSize: 13)),
              ),

            // ── Section: Basic Info ──
            _SectionLabel(label: 'Basic Information'),
            const SizedBox(height: 8),

            _FormField(
              controller: _nameCtrl,
              label:      'Product Name *',
              hint:       'e.g. Tata Salt 1kg',
              prefixIcon: Icons.inventory_2_outlined,
              validator:  (v) => v == null || v.trim().isEmpty ? 'Product name is required' : null,
            ),
            const SizedBox(height: 12),

            Row(children: [
              Expanded(child: _FormField(
                controller: _skuCtrl,
                label:      'SKU',
                hint:       'Auto if empty',
                prefixIcon: Icons.qr_code,
              )),
              const SizedBox(width: 12),
              Expanded(child: _FormField(
                controller: _hsnCtrl,
                label:      'HSN Code',
                hint:       'e.g. 2501',
                prefixIcon: Icons.tag,
                keyboardType: TextInputType.number,
              )),
            ]),
            const SizedBox(height: 20),

            // ── Section: Pricing ──
            _SectionLabel(label: 'Pricing'),
            const SizedBox(height: 8),

            Row(children: [
              Expanded(child: _FormField(
                controller:   _priceCtrl,
                label:        'Selling Price (₹) *',
                hint:         '0.00',
                prefixIcon:   Icons.currency_rupee,
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'^\d*\.?\d*'))],
                validator: (v) {
                  if (v == null || v.isEmpty) return 'Required';
                  if ((double.tryParse(v) ?? -1) < 0) return 'Invalid';
                  return null;
                },
              )),
              const SizedBox(width: 12),
              Expanded(child: _FormField(
                controller:   _costPriceCtrl,
                label:        'Cost Price (₹)',
                hint:         '0.00',
                prefixIcon:   Icons.currency_rupee,
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'^\d*\.?\d*'))],
              )),
            ]),
            const SizedBox(height: 20),

            // ── Section: Stock ──
            _SectionLabel(label: 'Stock'),
            const SizedBox(height: 8),

            Row(children: [
              Expanded(child: _FormField(
                controller:   _stockCtrl,
                label:        'Opening Stock',
                hint:         '0',
                prefixIcon:   Icons.warehouse_outlined,
                keyboardType: TextInputType.number,
                inputFormatters: [FilteringTextInputFormatter.digitsOnly],
              )),
              const SizedBox(width: 12),
              Expanded(child: _FormField(
                controller:   _minThresholdCtrl,
                label:        'Min Threshold',
                hint:         '5',
                prefixIcon:   Icons.warning_amber_outlined,
                keyboardType: TextInputType.number,
                inputFormatters: [FilteringTextInputFormatter.digitsOnly],
              )),
            ]),
            const SizedBox(height: 20),

            // ── Section: Unit & GST ──
            _SectionLabel(label: 'Unit & GST'),
            const SizedBox(height: 8),

            Row(children: [
              // Unit dropdown
              Expanded(
                child: _DropdownField<String>(
                  label:   'Unit',
                  value:   _unit,
                  items:   _units,
                  display: (u) => u,
                  onChanged: (v) => setState(() => _unit = v!),
                  icon: Icons.straighten,
                ),
              ),
              const SizedBox(width: 12),
              // GST dropdown
              Expanded(
                child: _DropdownField<double>(
                  label:   'GST Rate',
                  value:   _gstRate,
                  items:   _gstRates,
                  display: (r) => '${r.toInt()}%',
                  onChanged: (v) => setState(() => _gstRate = v!),
                  icon: Icons.percent,
                ),
              ),
            ]),
            const SizedBox(height: 20),

            // ── Description ──
            _SectionLabel(label: 'Description (Optional)'),
            const SizedBox(height: 8),
            TextFormField(
              controller:  _descCtrl,
              maxLines:    3,
              decoration:  InputDecoration(
                hintText:      'Product notes, description...',
                hintStyle:     const TextStyle(fontSize: 13, color: Color(0xFFCBD5E1)),
                border:        OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
                enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
                focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFF6366F1), width: 1.5)),
                filled:        true,
                fillColor:     Colors.white,
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
              child: _saving
                  ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.white))
                  : Text(isEdit ? 'Update Product' : 'Add Product'),
            ),
          ),
        ),
      ),
    );
  }
}

// ── Helper Widgets ─────────────────────────────────────────────────

class _SectionLabel extends StatelessWidget {
  final String label;
  const _SectionLabel({required this.label});

  @override
  Widget build(BuildContext context) => Text(
    label,
    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF6366F1), letterSpacing: 0.5),
  );
}

class _FormField extends StatelessWidget {
  final TextEditingController controller;
  final String label, hint;
  final IconData prefixIcon;
  final TextInputType? keyboardType;
  final List<TextInputFormatter>? inputFormatters;
  final String? Function(String?)? validator;

  const _FormField({
    required this.controller,
    required this.label,
    required this.hint,
    required this.prefixIcon,
    this.keyboardType,
    this.inputFormatters,
    this.validator,
  });

  @override
  Widget build(BuildContext context) => TextFormField(
    controller:       controller,
    keyboardType:     keyboardType,
    inputFormatters:  inputFormatters,
    validator:        validator,
    style: const TextStyle(fontSize: 14),
    decoration: InputDecoration(
      labelText:  label,
      hintText:   hint,
      hintStyle:  const TextStyle(fontSize: 13, color: Color(0xFFCBD5E1)),
      prefixIcon: Icon(prefixIcon, size: 18, color: const Color(0xFF94A3B8)),
    ),
  );
}

class _DropdownField<T> extends StatelessWidget {
  final String     label;
  final T          value;
  final List<T>    items;
  final String Function(T) display;
  final void Function(T?) onChanged;
  final IconData   icon;

  const _DropdownField({
    required this.label,
    required this.value,
    required this.items,
    required this.display,
    required this.onChanged,
    required this.icon,
  });

  @override
  Widget build(BuildContext context) => InputDecorator(
    decoration: InputDecoration(
      labelText:  label,
      prefixIcon: Icon(icon, size: 18, color: const Color(0xFF94A3B8)),
    ),
    child: DropdownButtonHideUnderline(
      child: DropdownButton<T>(
        value:       value,
        items:       items.map((i) => DropdownMenuItem(value: i, child: Text(display(i), style: const TextStyle(fontSize: 14)))).toList(),
        onChanged:   onChanged,
        isDense:     true,
        isExpanded:  true,
        icon: const Icon(Icons.keyboard_arrow_down_rounded, size: 20, color: Color(0xFF94A3B8)),
      ),
    ),
  );
}