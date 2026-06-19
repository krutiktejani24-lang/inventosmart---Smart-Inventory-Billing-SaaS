import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/app_providers.dart';
import '../services/api_service.dart';
import '../utils/app_theme.dart';
import '../utils/helpers.dart';
import '../widgets/common_widgets.dart';

class InventoryScreen extends ConsumerStatefulWidget {
  const InventoryScreen({super.key});
  @override
  ConsumerState<InventoryScreen> createState() => _State();
}

class _State extends ConsumerState<InventoryScreen> {
  final _search = TextEditingController();
  final _scroll = ScrollController();
  bool _showSearch = false;

  @override
  void initState() {
    super.initState();
    _scroll.addListener(() {
      if (_scroll.position.pixels >= _scroll.position.maxScrollExtent - 200)
        ref.read(productsProvider.notifier).loadMore();
    });
  }

  @override
  void dispose() { _search.dispose(); _scroll.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(productsProvider);
    final lowCount = state.products.where((p) => (p['stock_qty'] as int? ?? 0) < (p['min_threshold'] as int? ?? 5)).length;
    final outCount = state.products.where((p) => (p['stock_qty'] as int? ?? 0) == 0).length;

    return Scaffold(
      appBar: AppBar(
        title: _showSearch
            ? TextField(controller: _search, autofocus: true, onChanged: (v) =>
                ref.read(productsProvider.notifier).load(search: v),
                decoration: const InputDecoration(hintText: 'Search products...', border: InputBorder.none,
                  enabledBorder: InputBorder.none, focusedBorder: InputBorder.none, filled: false, contentPadding: EdgeInsets.zero))
            : const Text('Inventory'),
        actions: [
          IconButton(icon: Icon(_showSearch ? Icons.close : Icons.search_rounded), onPressed: () {
            setState(() => _showSearch = !_showSearch);
            if (!_showSearch) { _search.clear(); ref.read(productsProvider.notifier).load(); }
          }),
          IconButton(icon: const Icon(Icons.add_rounded), onPressed: () => _openForm(context)),
        ],
      ),
      body: Column(children: [
        // Summary bar
        if (!state.isLoading && state.products.isNotEmpty)
          Container(color: Colors.white, padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            child: Row(children: [
              _Chip('Total: ${state.products.length}', AppTheme.primary),
              const SizedBox(width: 8),
              _Chip('Low: $lowCount', AppTheme.amber),
              const SizedBox(width: 8),
              _Chip('Out: $outCount', AppTheme.red),
            ])),
        Expanded(child: state.isLoading
            ? _buildSkeleton()
            : state.products.isEmpty
                ? EmptyState(icon: Icons.inventory_2_outlined, title: 'No products',
                    subtitle: 'Tap + to add your first product',
                    action: ElevatedButton.icon(onPressed: () => _openForm(context),
                      icon: const Icon(Icons.add, size: 18), label: const Text('Add Product')))
                : RefreshIndicator(color: AppTheme.primary,
                    onRefresh: () => ref.read(productsProvider.notifier).load(),
                    child: ListView.builder(
                      controller: _scroll, padding: const EdgeInsets.all(12),
                      itemCount: state.products.length + (state.isLoadingMore ? 1 : 0),
                      itemBuilder: (_, i) {
                        if (i == state.products.length)
                          return const Center(child: Padding(padding: EdgeInsets.all(16),
                            child: CircularProgressIndicator(strokeWidth: 2)));
                        return _ProductCard(product: state.products[i],
                          onEdit: () => _openForm(context, product: state.products[i]),
                          onStockTap: () => _openStockAdjust(context, state.products[i]),
                          onDelete: () => _confirmDelete(context, state.products[i]));
                      }))),
      ]),
    );
  }

  Widget _buildSkeleton() => ListView.builder(
    padding: const EdgeInsets.all(12), itemCount: 8,
    itemBuilder: (_, __) => Container(margin: const EdgeInsets.only(bottom: 10),
      height: 84, decoration: BoxDecoration(color: AppTheme.slate200, borderRadius: BorderRadius.circular(14))));

  void _openForm(BuildContext context, {Map<String, dynamic>? product}) {
    Navigator.push(context, MaterialPageRoute(builder: (_) => ProductFormScreen(product: product)))
        .then((ok) { if (ok == true) ref.read(productsProvider.notifier).load(); });
  }

  void _openStockAdjust(BuildContext context, Map<String, dynamic> product) {
    Navigator.push(context, MaterialPageRoute(builder: (_) => StockAdjustScreen(product: product)))
        .then((_) => ref.read(productsProvider.notifier).load());
  }

  Future<void> _confirmDelete(BuildContext context, Map<String, dynamic> p) async {
    final ok = await showDialog<bool>(context: context, builder: (_) => AlertDialog(
      title: const Text('Delete Product'), content: Text('Delete "${p['name']}"?'),
      actions: [TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
        TextButton(onPressed: () => Navigator.pop(context, true),
          child: const Text('Delete', style: TextStyle(color: AppTheme.red)))],
    ));
    if (ok == true) {
      await api.deleteProduct(p['id']); ref.read(productsProvider.notifier).load();
    }
  }
}

// ── Product Card ───────────────────────────────────────────────────
class _ProductCard extends StatelessWidget {
  final Map<String, dynamic> product;
  final VoidCallback onEdit, onStockTap, onDelete;
  const _ProductCard({required this.product, required this.onEdit, required this.onStockTap, required this.onDelete});

  @override
  Widget build(BuildContext context) {
    final qty = product['stock_qty'] as int? ?? 0;
    final min = product['min_threshold'] as int? ?? 5;
    final isOut  = qty == 0;
    final isLow  = qty < min && !isOut;
    final color  = isOut ? AppTheme.red : isLow ? AppTheme.amber : AppTheme.emerald;
    final bg     = isOut ? const Color(0xFFFEF2F2) : isLow ? const Color(0xFFFEF3C7) : const Color(0xFFECFDF5);
    final label  = isOut ? 'Out of Stock' : isLow ? 'Low Stock' : 'In Stock';

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: AppTheme.slate200)),
      child: InkWell(borderRadius: BorderRadius.circular(14), onTap: onEdit,
        child: Padding(padding: const EdgeInsets.all(14), child: Row(children: [
          Container(width:44, height:44,
            decoration: BoxDecoration(color: AppTheme.indigo50, borderRadius: BorderRadius.circular(12)),
            child: const Icon(Icons.inventory_2_rounded, color: AppTheme.primary, size: 22)),
          const SizedBox(width: 12),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(product['name'] ?? '', style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
              maxLines: 1, overflow: TextOverflow.ellipsis),
            const SizedBox(height: 3),
            Row(children: [
              if (product['sku'] != null) ...[
                Text(product['sku'], style: const TextStyle(fontSize: 11, color: AppTheme.slate400, fontFamily: 'monospace')),
                const SizedBox(width: 6),
                const Text('·', style: TextStyle(color: AppTheme.slate200)),
                const SizedBox(width: 6),
              ],
              Container(padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(20)),
                child: Text(label, style: TextStyle(fontSize: 10, color: color, fontWeight: FontWeight.w600))),
            ]),
          ])),
          const SizedBox(width: 10),
          Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
            Text(formatINR(product['price'] ?? 0), style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold)),
            const SizedBox(height: 4),
            GestureDetector(onTap: onStockTap,
              child: Container(padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(8), border: Border.all(color: color.withOpacity(0.3))),
                child: Text('$qty ${product['unit'] ?? 'Pcs'}', style: TextStyle(fontSize: 11, color: color, fontWeight: FontWeight.w700)))),
          ]),
        ]))),
    );
  }
}

class _Chip extends StatelessWidget {
  final String text; final Color color;
  const _Chip(this.text, this.color);
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
    decoration: BoxDecoration(color: color.withOpacity(0.1), borderRadius: BorderRadius.circular(20)),
    child: Text(text, style: TextStyle(fontSize: 11, color: color, fontWeight: FontWeight.w600)));
}

// ── Product Form Screen ────────────────────────────────────────────
class ProductFormScreen extends ConsumerStatefulWidget {
  final Map<String, dynamic>? product;
  const ProductFormScreen({super.key, this.product});
  @override
  ConsumerState<ProductFormScreen> createState() => _FormState();
}

class _FormState extends ConsumerState<ProductFormScreen> {
  final _form = GlobalKey<FormState>();
  bool  _saving = false;
  String? _err;

  final _name  = TextEditingController();
  final _sku   = TextEditingController();
  final _hsn   = TextEditingController();
  final _price = TextEditingController();
  final _cost  = TextEditingController();
  final _stock = TextEditingController(text: '0');
  final _min   = TextEditingController(text: '5');
  final _desc  = TextEditingController();
  String _unit    = 'Pcs';
  double _gst     = 18;
  String? _catId;

  final _units = ['Pcs','Kg','Gm','L','Ml','Box','Pkt','Carton','Dozen','Mtr'];
  final _gstRates = [0.0,5.0,12.0,18.0,28.0];

  @override
  void initState() {
    super.initState();
    final p = widget.product;
    if (p != null) {
      _name.text  = p['name']          ?? '';
      _sku.text   = p['sku']           ?? '';
      _hsn.text   = p['hsn_code']      ?? '';
      _price.text = '${p['price']      ?? ''}';
      _cost.text  = '${p['cost_price'] ?? ''}';
      _stock.text = '${p['stock_qty']  ?? 0}';
      _min.text   = '${p['min_threshold'] ?? 5}';
      _desc.text  = p['description']   ?? '';
      _unit       = p['unit']          ?? 'Pcs';
      _gst        = (p['gst_rate'] as num? ?? 18).toDouble();
      _catId      = p['category_id'];
    }
  }

  @override
  void dispose() {
    [_name,_sku,_hsn,_price,_cost,_stock,_min,_desc].forEach((c) => c.dispose());
    super.dispose();
  }

  Future<void> _save() async {
    if (!_form.currentState!.validate()) return;
    FocusScope.of(context).unfocus();
    setState(() { _saving = true; _err = null; });
    try {
      final data = {
        'name': _name.text.trim(), 'sku': _sku.text.trim().isEmpty ? null : _sku.text.trim(),
        'hsn_code': _hsn.text.trim().isEmpty ? null : _hsn.text.trim(),
        'price': double.tryParse(_price.text) ?? 0, 'cost_price': double.tryParse(_cost.text) ?? 0,
        'stock_qty': int.tryParse(_stock.text) ?? 0, 'min_threshold': int.tryParse(_min.text) ?? 5,
        'unit': _unit, 'gst_rate': _gst, 'description': _desc.text.trim().isEmpty ? null : _desc.text.trim(),
        if (_catId != null) 'category_id': _catId,
      };
      if (widget.product != null) await api.updateProduct(widget.product!['id'], data);
      else await api.createProduct(data);
      if (mounted) Navigator.pop(context, true);
    } catch (e) {
      setState(() { _err = errorMessage(e); _saving = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    final cats = ref.watch(categoriesProvider);
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.product != null ? 'Edit Product' : 'Add Product'),
        actions: [TextButton(onPressed: _saving ? null : _save,
          child: _saving ? const SizedBox(width:18,height:18,child:CircularProgressIndicator(strokeWidth:2))
              : Text(widget.product != null ? 'Update' : 'Save',
                  style: const TextStyle(color: AppTheme.primary, fontWeight: FontWeight.w700)))],
      ),
      body: Form(key: _form, child: ListView(padding: const EdgeInsets.all(16), children: [
        if (_err != null) ...[
          Container(padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(color: const Color(0xFFFEF2F2), borderRadius: BorderRadius.circular(12), border: Border.all(color: const Color(0xFFFECACA))),
            child: Text(_err!, style: const TextStyle(color: Color(0xFFB91C1C), fontSize: 13))),
          const SizedBox(height: 12),
        ],
        _label('Basic Info'),
        AppTextField(controller: _name, label: 'Product Name *', hint: 'e.g. Tata Salt 1kg',
          prefixIcon: Icons.inventory_2_outlined,
          validator: (v) => v == null || v.trim().isEmpty ? 'Required' : null),
        const SizedBox(height: 12),
        Row(children: [
          Expanded(child: AppTextField(controller: _sku, label: 'SKU', hint: 'Auto if empty', prefixIcon: Icons.qr_code)),
          const SizedBox(width: 12),
          Expanded(child: AppTextField(controller: _hsn, label: 'HSN Code', hint: 'e.g. 2501',
            prefixIcon: Icons.tag, keyboardType: TextInputType.number)),
        ]),
        const SizedBox(height: 20),
        _label('Pricing'),
        Row(children: [
          Expanded(child: AppTextField(controller: _price, label: 'Selling Price (₹) *', hint: '0.00',
            prefixIcon: Icons.currency_rupee, keyboardType: const TextInputType.numberWithOptions(decimal: true),
            validator: (v) => v==null||v.isEmpty ? 'Required' : null)),
          const SizedBox(width: 12),
          Expanded(child: AppTextField(controller: _cost, label: 'Cost Price (₹)', hint: '0.00',
            prefixIcon: Icons.currency_rupee, keyboardType: const TextInputType.numberWithOptions(decimal: true))),
        ]),
        const SizedBox(height: 20),
        _label('Stock'),
        Row(children: [
          Expanded(child: AppTextField(controller: _stock, label: 'Opening Stock', hint: '0',
            prefixIcon: Icons.warehouse_outlined, keyboardType: TextInputType.number)),
          const SizedBox(width: 12),
          Expanded(child: AppTextField(controller: _min, label: 'Min Threshold', hint: '5',
            prefixIcon: Icons.warning_amber_outlined, keyboardType: TextInputType.number)),
        ]),
        const SizedBox(height: 20),
        _label('Unit & GST'),
        Row(children: [
          Expanded(child: _dropdownField<String>('Unit', _unit, _units, (u) => u, (v) => setState(()=>_unit=v!), Icons.straighten)),
          const SizedBox(width: 12),
          Expanded(child: _dropdownField<double>('GST Rate', _gst, _gstRates, (r) => '${r.toInt()}%', (v) => setState(()=>_gst=v!), Icons.percent)),
        ]),
        const SizedBox(height: 12),
        // Category
        cats.when(
          loading: () => const Skeleton(height: 56),
          error: (_, __) => const SizedBox.shrink(),
          data: (list) => InputDecorator(
            decoration: const InputDecoration(labelText: 'Category', prefixIcon: Icon(Icons.category_outlined, size: 18)),
            child: DropdownButtonHideUnderline(child: DropdownButton<String?>(
              value: _catId, isDense: true, isExpanded: true,
              icon: const Icon(Icons.keyboard_arrow_down_rounded, size: 20, color: AppTheme.slate400),
              items: [const DropdownMenuItem(value: null, child: Text('— No Category —', style: TextStyle(fontSize: 14))),
                ...list.map((c) => DropdownMenuItem(value: c['id'] as String, child: Text(c['name'] as String, style: const TextStyle(fontSize: 14))))],
              onChanged: (v) => setState(() => _catId = v),
            ))),
        ),
        const SizedBox(height: 20),
        _label('Description (Optional)'),
        AppTextField(controller: _desc, label: 'Description', hint: 'Product notes...', maxLines: 3),
        const SizedBox(height: 80),
      ])),
      bottomNavigationBar: SafeArea(child: Padding(
        padding: const EdgeInsets.fromLTRB(16,8,16,8),
        child: SizedBox(height: 52, child: ElevatedButton(
          onPressed: _saving ? null : _save,
          child: _saving ? const SizedBox(width:22,height:22,child:CircularProgressIndicator(strokeWidth:2.5,color:Colors.white))
              : Text(widget.product != null ? 'Update Product' : 'Add Product'))),
      )),
    );
  }

  Widget _label(String t) => Padding(padding: const EdgeInsets.only(bottom: 8),
    child: Text(t, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppTheme.primary, letterSpacing: 0.5)));

  Widget _dropdownField<T>(String label, T value, List<T> items, String Function(T) display, void Function(T?) onChange, IconData icon) =>
    InputDecorator(
      decoration: InputDecoration(labelText: label, prefixIcon: Icon(icon, size: 18, color: AppTheme.slate400)),
      child: DropdownButtonHideUnderline(child: DropdownButton<T>(
        value: value, isDense: true, isExpanded: true,
        icon: const Icon(Icons.keyboard_arrow_down_rounded, size: 20, color: AppTheme.slate400),
        items: items.map((i) => DropdownMenuItem(value: i, child: Text(display(i), style: const TextStyle(fontSize: 14)))).toList(),
        onChanged: onChange)));
}

// ── Stock Adjust Screen ────────────────────────────────────────────
class StockAdjustScreen extends StatefulWidget {
  final Map<String, dynamic> product;
  const StockAdjustScreen({super.key, required this.product});
  @override
  State<StockAdjustScreen> createState() => _StockState();
}

class _StockState extends State<StockAdjustScreen> {
  final _form   = GlobalKey<FormState>();
  final _qtyC   = TextEditingController();
  final _reasonC = TextEditingController();
  bool _isIn = true, _saving = false;
  String? _err;

  @override
  void dispose() { _qtyC.dispose(); _reasonC.dispose(); super.dispose(); }

  Future<void> _save() async {
    if (!_form.currentState!.validate()) return;
    FocusScope.of(context).unfocus();
    setState(() { _saving = true; _err = null; });
    try {
      final qty = int.parse(_qtyC.text.trim());
      final reason = _reasonC.text.trim().isEmpty ? (_isIn ? 'Manual stock in' : 'Manual stock out') : _reasonC.text.trim();
      if (_isIn) await api.stockIn(widget.product['id'], qty, reason);
      else await api.stockOut(widget.product['id'], qty, reason);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text(_isIn ? 'Added $qty ${widget.product['unit']} to stock' : 'Removed $qty ${widget.product['unit']} from stock'),
          backgroundColor: _isIn ? AppTheme.emerald : AppTheme.red));
        Navigator.pop(context, true);
      }
    } catch (e) { setState(() { _err = errorMessage(e); _saving = false; }); }
  }

  @override
  Widget build(BuildContext context) {
    final qty = widget.product['stock_qty'] as int? ?? 0;
    final unit = widget.product['unit'] as String? ?? 'Pcs';
    final color = _isIn ? AppTheme.emerald : AppTheme.red;
    final newQty = (int.tryParse(_qtyC.text) ?? 0).clamp(0, 99999);

    return Scaffold(
      appBar: AppBar(title: const Text('Adjust Stock')),
      body: Form(key: _form, child: ListView(padding: const EdgeInsets.all(16), children: [
        // Product info
        AppCard(child: Row(children: [
          Container(width:48,height:48,decoration:BoxDecoration(color:AppTheme.indigo50,borderRadius:BorderRadius.circular(12)),
            child:const Icon(Icons.inventory_2_rounded,color:AppTheme.primary,size:24)),
          const SizedBox(width:14),
          Expanded(child: Column(crossAxisAlignment:CrossAxisAlignment.start,children:[
            Text(widget.product['name']??'',style:const TextStyle(fontSize:15,fontWeight:FontWeight.w700),maxLines:1,overflow:TextOverflow.ellipsis),
            const SizedBox(height:4),
            RichText(text: TextSpan(style:const TextStyle(fontSize:12),children:[
              const TextSpan(text:'Current: ',style:TextStyle(color:AppTheme.slate400)),
              TextSpan(text:'$qty $unit',style:TextStyle(color:qty==0?AppTheme.red:qty<(widget.product['min_threshold']as int? ??5)?AppTheme.amber:AppTheme.emerald,fontWeight:FontWeight.w700)),
            ])),
          ])),
        ])),
        const SizedBox(height:16),

        // Toggle
        Container(decoration:BoxDecoration(color:Colors.white,borderRadius:BorderRadius.circular(14),border:Border.all(color:AppTheme.slate200)),
          padding:const EdgeInsets.all(6),
          child:Row(children:[
            _TypeBtn('Stock In',Icons.add_circle_outline_rounded,_isIn,AppTheme.emerald,()=>setState(()=>_isIn=true)),
            const SizedBox(width:6),
            _TypeBtn('Stock Out',Icons.remove_circle_outline_rounded,!_isIn,AppTheme.red,()=>setState(()=>_isIn=false)),
          ])),
        const SizedBox(height:16),

        if (_err!=null)...[
          Container(padding:const EdgeInsets.all(12),decoration:BoxDecoration(color:const Color(0xFFFEF2F2),borderRadius:BorderRadius.circular(12),border:Border.all(color:const Color(0xFFFECACA))),
            child:Text(_err!,style:const TextStyle(color:Color(0xFFB91C1C),fontSize:13))),
          const SizedBox(height:12),
        ],

        TextFormField(
          controller:_qtyC, keyboardType:TextInputType.number, autofocus:true,
          inputFormatters:[FilteringTextInputFormatter.digitsOnly],
          style:const TextStyle(fontSize:28,fontWeight:FontWeight.bold),
          textAlign:TextAlign.center,
          decoration:InputDecoration(labelText:'Quantity ($unit)',hintText:'0',
            focusedBorder:OutlineInputBorder(borderRadius:BorderRadius.circular(12),borderSide:BorderSide(color:color,width:1.5)),
            prefixIcon:Icon(_isIn?Icons.add_rounded:Icons.remove_rounded,color:color,size:24)),
          onChanged:(_)=>setState((){}),
          validator:(v){
            if(v==null||v.isEmpty)return 'Required';
            final n=int.tryParse(v);
            if(n==null||n<=0)return 'Min 1';
            if(!_isIn&&n>qty)return 'Exceeds current stock ($qty)';
            return null;
          }),
        const SizedBox(height:14),

        AppTextField(controller:_reasonC,label:'Reason (optional)',hint:'e.g. Purchase from vendor...',prefixIcon:Icons.notes_rounded),
        const SizedBox(height:16),

        // Preview
        AnimatedContainer(duration:const Duration(milliseconds:200),
          padding:const EdgeInsets.all(14),
          decoration:BoxDecoration(color:color.withOpacity(0.08),borderRadius:BorderRadius.circular(14),border:Border.all(color:color.withOpacity(0.2))),
          child:Row(children:[
            Icon(_isIn?Icons.trending_up_rounded:Icons.trending_down_rounded,color:color,size:22),
            const SizedBox(width:12),
            Column(crossAxisAlignment:CrossAxisAlignment.start,children:[
              Text(_isIn?'After stock in':'After stock out',style:const TextStyle(fontSize:11,color:AppTheme.slate400)),
              Text('${_isIn?qty+newQty:(qty-newQty).clamp(0,99999)} $unit',style:TextStyle(fontSize:20,fontWeight:FontWeight.bold,color:color)),
            ]),
          ])),
        const SizedBox(height:80),
      ])),
      bottomNavigationBar:SafeArea(child:Padding(padding:const EdgeInsets.fromLTRB(16,8,16,8),
        child:SizedBox(height:52,child:ElevatedButton(
          onPressed:_saving?null:_save,
          style:ElevatedButton.styleFrom(backgroundColor:color,shape:RoundedRectangleBorder(borderRadius:BorderRadius.circular(12))),
          child:_saving?const SizedBox(width:22,height:22,child:CircularProgressIndicator(strokeWidth:2.5,color:Colors.white))
              :Text(_isIn?'Confirm Stock In':'Confirm Stock Out',style:const TextStyle(fontSize:15,fontWeight:FontWeight.w600,color:Colors.white)))))),
    );
  }
}

class _TypeBtn extends StatelessWidget {
  final String label; final IconData icon; final bool selected; final Color color; final VoidCallback onTap;
  const _TypeBtn(this.label,this.icon,this.selected,this.color,this.onTap);
  @override
  Widget build(BuildContext context) => Expanded(child: GestureDetector(onTap:onTap,
    child:AnimatedContainer(duration:const Duration(milliseconds:200),
      padding:const EdgeInsets.symmetric(vertical:12),
      decoration:BoxDecoration(color:selected?color:Colors.transparent,borderRadius:BorderRadius.circular(10)),
      child:Row(mainAxisAlignment:MainAxisAlignment.center,children:[
        Icon(icon,color:selected?Colors.white:AppTheme.slate400,size:18),
        const SizedBox(width:6),
        Text(label,style:TextStyle(color:selected?Colors.white:AppTheme.slate400,fontWeight:FontWeight.w600,fontSize:14)),
      ]))));
}