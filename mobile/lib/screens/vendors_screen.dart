import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/app_providers.dart';
import '../services/api_service.dart';
import '../utils/app_theme.dart';
import '../utils/helpers.dart';
import '../widgets/common_widgets.dart';

class VendorsScreen extends ConsumerStatefulWidget {
  const VendorsScreen({super.key});
  @override
  ConsumerState<VendorsScreen> createState() => _State();
}

class _State extends ConsumerState<VendorsScreen> with SingleTickerProviderStateMixin {
  late TabController _tabs;
  final _search = TextEditingController();
  bool _showSearch = false;

  @override
  void initState() { super.initState(); _tabs = TabController(length: 2, vsync: this); }
  @override
  void dispose() { _tabs.dispose(); _search.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(vendorsProvider);
    return Scaffold(
      appBar: AppBar(
        title: _showSearch
            ? TextField(controller: _search, autofocus: true,
                onChanged: (v) => ref.read(vendorsProvider.notifier).load(search: v),
                decoration: const InputDecoration(hintText: 'Search vendors...', border: InputBorder.none,
                  enabledBorder: InputBorder.none, focusedBorder: InputBorder.none, filled: false, contentPadding: EdgeInsets.zero))
            : const Text('Vendors'),
        actions: [
          IconButton(icon: Icon(_showSearch ? Icons.close : Icons.search_rounded), onPressed: () {
            setState(() => _showSearch = !_showSearch);
            if (!_showSearch) { _search.clear(); ref.read(vendorsProvider.notifier).load(); }
          }),
          IconButton(icon: const Icon(Icons.add_rounded), onPressed: () => _openForm(context)),
        ],
        bottom: TabBar(
          controller: _tabs,
          indicatorColor: AppTheme.primary,
          labelColor: AppTheme.primary,
          unselectedLabelColor: AppTheme.slate400,
          labelStyle: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
          tabs: const [Tab(text: 'Vendors'), Tab(text: 'Purchase Orders')],
        ),
      ),
      body: TabBarView(controller: _tabs, children: [
        // ── Vendors Tab ──
        state.isLoading
            ? _skeleton()
            : state.items.isEmpty
                ? EmptyState(icon: Icons.local_shipping_outlined, title: 'No vendors', subtitle: 'Tap + to add a vendor',
                    action: ElevatedButton.icon(onPressed: () => _openForm(context),
                      icon: const Icon(Icons.add, size: 18), label: const Text('Add Vendor')))
                : RefreshIndicator(color: AppTheme.primary,
                    onRefresh: () => ref.read(vendorsProvider.notifier).load(),
                    child: ListView.builder(
                      padding: const EdgeInsets.all(12),
                      itemCount: state.items.length,
                      itemBuilder: (_, i) => _VendorCard(
                        vendor: state.items[i],
                        onTap: () => _openDetail(context, state.items[i]),
                        onEdit: () => _openForm(context, vendor: state.items[i]),
                        onCreatePO: () => _openCreatePO(context, state.items[i])))),
        // ── Purchase Orders Tab ──
        const _POList(),
      ]),
    );
  }

  Widget _skeleton() => ListView.builder(padding: const EdgeInsets.all(12), itemCount: 6,
    itemBuilder: (_, __) => Container(margin: const EdgeInsets.only(bottom: 10), height: 72,
      decoration: BoxDecoration(color: AppTheme.slate200, borderRadius: BorderRadius.circular(14))));

  void _openForm(BuildContext ctx, {Map<String, dynamic>? vendor}) =>
      Navigator.push(ctx, MaterialPageRoute(builder: (_) => VendorFormScreen(vendor: vendor)))
          .then((ok) { if (ok == true) ref.read(vendorsProvider.notifier).load(); });

  void _openDetail(BuildContext ctx, Map<String, dynamic> v) =>
      Navigator.push(ctx, MaterialPageRoute(builder: (_) => VendorDetailScreen(vendor: v)));

  void _openCreatePO(BuildContext ctx, Map<String, dynamic> vendor) =>
      Navigator.push(ctx, MaterialPageRoute(builder: (_) => CreatePOScreen(vendor: vendor)))
          .then((_) => ref.invalidate(purchaseOrdersProvider));
}

// ── Vendor Card ────────────────────────────────────────────────────
class _VendorCard extends StatelessWidget {
  final Map<String, dynamic> vendor;
  final VoidCallback onTap, onEdit, onCreatePO;
  const _VendorCard({required this.vendor, required this.onTap, required this.onEdit, required this.onCreatePO});

  @override
  Widget build(BuildContext context) => Container(
    margin: const EdgeInsets.only(bottom: 10),
    decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: AppTheme.slate200)),
    child: InkWell(borderRadius: BorderRadius.circular(14), onTap: onTap,
      child: Padding(padding: const EdgeInsets.all(14), child: Row(children: [
        Container(width: 44, height: 44,
          decoration: BoxDecoration(color: const Color(0xFFFEF3C7), borderRadius: BorderRadius.circular(22)),
          child: Center(child: Text((vendor['name'] as String? ?? 'V')[0].toUpperCase(),
            style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppTheme.amber)))),
        const SizedBox(width: 12),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(vendor['name'] ?? '', style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600), maxLines: 1, overflow: TextOverflow.ellipsis),
          if (vendor['phone'] != null) Text(vendor['phone'], style: const TextStyle(fontSize: 12, color: AppTheme.slate400)),
          if (vendor['gstin'] != null) Text('GSTIN: ${vendor['gstin']}', style: const TextStyle(fontSize: 11, color: AppTheme.primary)),
        ])),
        Column(children: [
          IconButton(icon: const Icon(Icons.shopping_cart_outlined, size: 20, color: AppTheme.amber),
            onPressed: onCreatePO, tooltip: 'Create PO'),
          IconButton(icon: const Icon(Icons.edit_outlined, size: 18, color: AppTheme.slate400),
            onPressed: onEdit, constraints: const BoxConstraints()),
        ]),
      ]))),
  );
}

// ── PO List ────────────────────────────────────────────────────────
class _POList extends ConsumerWidget {
  const _POList();
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final pos = ref.watch(purchaseOrdersProvider);
    return pos.when(
      loading: () => const Center(child: CircularProgressIndicator(color: AppTheme.primary)),
      error: (e, _) => ErrorState(msg: errorMessage(e), onRetry: () => ref.invalidate(purchaseOrdersProvider)),
      data: (list) => list.isEmpty
          ? const EmptyState(icon: Icons.shopping_cart_outlined, title: 'No purchase orders', subtitle: 'Go to Vendors → tap cart icon to create one')
          : RefreshIndicator(color: AppTheme.primary,
              onRefresh: () => ref.refresh(purchaseOrdersProvider.future),
              child: ListView.builder(
                padding: const EdgeInsets.all(12), itemCount: list.length,
                itemBuilder: (_, i) {
                  final po = list[i];
                  final status = po['status'] as String? ?? 'PENDING';
                  return Container(
                    margin: const EdgeInsets.only(bottom: 10),
                    decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: AppTheme.slate200)),
                    child: ListTile(
                      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                      leading: Container(width: 44, height: 44,
                        decoration: BoxDecoration(color: const Color(0xFFFEF3C7), borderRadius: BorderRadius.circular(12)),
                        child: const Icon(Icons.shopping_cart_rounded, color: AppTheme.amber, size: 22)),
                      title: Text(po['po_number'] ?? '', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, fontFamily: 'monospace')),
                      subtitle: Text((po['vendor'] as Map?)?['name'] ?? '', style: const TextStyle(fontSize: 12, color: AppTheme.slate400)),
                      trailing: Column(mainAxisAlignment: MainAxisAlignment.center, crossAxisAlignment: CrossAxisAlignment.end, children: [
                        Text(formatINR(po['total'] ?? 0), style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
                        StatusBadge(status),
                      ]),
                      onTap: status == 'PENDING' ? () => _showReceivePO(context, ref, po) : null,
                    ));
                })),
    );
  }

  void _showReceivePO(BuildContext context, WidgetRef ref, Map po) {
    showDialog(context: context, builder: (_) => AlertDialog(
      title: Text('Receive ${po['po_number']}'),
      content: Text('Receive all items and update stock for ${(po['vendor'] as Map?)?['name']}?'),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
        ElevatedButton(
          onPressed: () async {
            Navigator.pop(context);
            try {
              await api.receivePO(po['id']);
              ref.invalidate(purchaseOrdersProvider);
              ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('PO received — stock updated'), backgroundColor: AppTheme.emerald));
            } catch (e) {
              ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(errorMessage(e)), backgroundColor: AppTheme.red));
            }
          },
          child: const Text('Receive & Update Stock')),
      ],
    ));
  }
}

// ── Vendor Detail ──────────────────────────────────────────────────
class VendorDetailScreen extends StatelessWidget {
  final Map<String, dynamic> vendor;
  const VendorDetailScreen({super.key, required this.vendor});

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: Text(vendor['name'] ?? 'Vendor')),
    body: ListView(padding: const EdgeInsets.all(16), children: [
      AppCard(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Container(width: 56, height: 56,
            decoration: BoxDecoration(color: const Color(0xFFFEF3C7), borderRadius: BorderRadius.circular(28)),
            child: Center(child: Text((vendor['name'] as String? ?? 'V')[0].toUpperCase(),
              style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: AppTheme.amber)))),
          const SizedBox(width: 14),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(vendor['name'] ?? '', style: const TextStyle(fontSize: 17, fontWeight: FontWeight.bold)),
            if (vendor['address'] != null) Text(vendor['address'], style: const TextStyle(fontSize: 12, color: AppTheme.slate400)),
          ])),
        ]),
        if (vendor['phone'] != null || vendor['email'] != null || vendor['gstin'] != null) ...[
          const SizedBox(height: 12), const AppDivider(), const SizedBox(height: 12),
          if (vendor['phone'] != null) InfoRow(label: 'Phone', value: vendor['phone']),
          if (vendor['email'] != null) InfoRow(label: 'Email', value: vendor['email']),
          if (vendor['gstin']  != null) InfoRow(label: 'GSTIN', value: vendor['gstin'], valueColor: AppTheme.primary),
        ],
      ])),
    ]),
  );
}

// ── Vendor Form ────────────────────────────────────────────────────
class VendorFormScreen extends StatefulWidget {
  final Map<String, dynamic>? vendor;
  const VendorFormScreen({super.key, this.vendor});
  @override
  State<VendorFormScreen> createState() => _VFormState();
}

class _VFormState extends State<VendorFormScreen> {
  final _form = GlobalKey<FormState>();
  bool _saving = false; String? _err;
  late final _name  = TextEditingController(text: widget.vendor?['name']    ?? '');
  late final _phone = TextEditingController(text: widget.vendor?['phone']   ?? '');
  late final _email = TextEditingController(text: widget.vendor?['email']   ?? '');
  late final _gstin = TextEditingController(text: widget.vendor?['gstin']   ?? '');
  late final _addr  = TextEditingController(text: widget.vendor?['address'] ?? '');

  @override
  void dispose() { [_name,_phone,_email,_gstin,_addr].forEach((c)=>c.dispose()); super.dispose(); }

  Future<void> _save() async {
    if (!_form.currentState!.validate()) return;
    setState(() { _saving = true; _err = null; });
    try {
      final data = { 'name':_name.text.trim(), 'phone':_phone.text.trim().isEmpty?null:_phone.text.trim(),
        'email':_email.text.trim().isEmpty?null:_email.text.trim(),
        'gstin':_gstin.text.trim().isEmpty?null:_gstin.text.trim().toUpperCase(),
        'address':_addr.text.trim().isEmpty?null:_addr.text.trim() };
      if (widget.vendor != null) await api.updateVendor(widget.vendor!['id'], data);
      else await api.createVendor(data);
      if (mounted) Navigator.pop(context, true);
    } catch (e) { setState(() { _err = errorMessage(e); _saving = false; }); }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: Text(widget.vendor != null ? 'Edit Vendor' : 'Add Vendor'),
      actions: [TextButton(onPressed: _saving ? null : _save,
        child: _saving ? const SizedBox(width:18,height:18,child:CircularProgressIndicator(strokeWidth:2))
            : Text(widget.vendor != null ? 'Update' : 'Save',
                style: const TextStyle(color: AppTheme.primary, fontWeight: FontWeight.w700)))]),
    body: Form(key: _form, child: ListView(padding: const EdgeInsets.all(16), children: [
      if (_err != null) ...[
        Container(padding: const EdgeInsets.all(12), decoration: BoxDecoration(color: const Color(0xFFFEF2F2), borderRadius: BorderRadius.circular(12), border: Border.all(color: const Color(0xFFFECACA))),
          child: Text(_err!, style: const TextStyle(color: Color(0xFFB91C1C), fontSize: 13))),
        const SizedBox(height: 12),
      ],
      AppTextField(controller: _name, label: 'Vendor Name *', hint: 'Supplier name', prefixIcon: Icons.local_shipping_outlined,
        validator: (v) => v==null||v.trim().isEmpty ? 'Required' : null),
      const SizedBox(height: 12),
      Row(children: [
        Expanded(child: AppTextField(controller: _phone, label: 'Phone', hint: '9876543210', prefixIcon: Icons.phone_outlined, keyboardType: TextInputType.phone)),
        const SizedBox(width: 12),
        Expanded(child: AppTextField(controller: _email, label: 'Email', hint: 'vendor@email.com', prefixIcon: Icons.email_outlined, keyboardType: TextInputType.emailAddress)),
      ]),
      const SizedBox(height: 12),
      AppTextField(controller: _gstin, label: 'GSTIN', hint: '22AAAAA0000A1Z5', prefixIcon: Icons.badge_outlined),
      const SizedBox(height: 12),
      AppTextField(controller: _addr, label: 'Address', hint: 'Street, City, State', prefixIcon: Icons.home_outlined),
      const SizedBox(height: 80),
    ])),
    bottomNavigationBar: SafeArea(child: Padding(padding: const EdgeInsets.fromLTRB(16,8,16,8),
      child: SizedBox(height: 52, child: ElevatedButton(onPressed: _saving ? null : _save,
        child: _saving ? const SizedBox(width:22,height:22,child:CircularProgressIndicator(strokeWidth:2.5,color:Colors.white))
            : Text(widget.vendor != null ? 'Update Vendor' : 'Add Vendor'))))),
  );
}

// ── Create PO Screen ───────────────────────────────────────────────
class CreatePOScreen extends ConsumerStatefulWidget {
  final Map<String, dynamic> vendor;
  const CreatePOScreen({super.key, required this.vendor});
  @override
  ConsumerState<CreatePOScreen> createState() => _POState();
}

class _POState extends ConsumerState<CreatePOScreen> {
  bool _saving = false; String? _err;
  final _notes = TextEditingController();
  List<Map<String, dynamic>> _items = [{'productId': null, 'qty': '1', 'price': ''}];

  @override
  void dispose() { _notes.dispose(); super.dispose(); }

  double get _total => _items.fold(0.0, (s, i) =>
    s + (double.tryParse(i['price'] ?? '') ?? 0) * (int.tryParse(i['qty'] ?? '1') ?? 1));

  Future<void> _save() async {
    if (_items.any((i) => i['productId'] == null)) { setState(() => _err = 'Select product for each item'); return; }
    setState(() { _saving = true; _err = null; });
    try {
      await api.createPurchaseOrder({
        'vendorId': widget.vendor['id'], 'notes': _notes.text.trim().isEmpty ? null : _notes.text.trim(),
        'items': _items.map((i) => {'productId': i['productId'], 'qty': int.tryParse(i['qty'] ?? '1') ?? 1, 'price': double.tryParse(i['price'] ?? '0') ?? 0}).toList(),
      });
      if (mounted) Navigator.pop(context, true);
    } catch (e) { setState(() { _err = errorMessage(e); _saving = false; }); }
  }

  @override
  Widget build(BuildContext context) {
    final products = ref.watch(productsProvider);
    return Scaffold(
      appBar: AppBar(title: Text('PO — ${widget.vendor['name']}'),
        actions: [TextButton(onPressed: _saving ? null : _save,
          child: _saving ? const SizedBox(width:18,height:18,child:CircularProgressIndicator(strokeWidth:2))
              : const Text('Create', style: TextStyle(color: AppTheme.primary, fontWeight: FontWeight.w700)))]),
      body: ListView(padding: const EdgeInsets.all(16), children: [
        if (_err != null) ...[
          Container(padding: const EdgeInsets.all(12), decoration: BoxDecoration(color: const Color(0xFFFEF2F2), borderRadius: BorderRadius.circular(12), border: Border.all(color: const Color(0xFFFECACA))),
            child: Text(_err!, style: const TextStyle(color: Color(0xFFB91C1C), fontSize: 13))),
          const SizedBox(height: 12),
        ],
        Row(children: [
          const Text('Items', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
          const Spacer(),
          TextButton.icon(onPressed: () => setState(() => _items.add({'productId':null,'qty':'1','price':''})),
            icon: const Icon(Icons.add, size: 16), label: const Text('Add Item')),
        ]),
        ..._items.asMap().entries.map((e) => Container(
          margin: const EdgeInsets.only(bottom: 10), padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppTheme.slate200)),
          child: Column(children: [
            Row(children: [
              Expanded(child: products.isLoading
                  ? const LinearProgressIndicator()
                  : DropdownButtonFormField<String?>(
                      value: e.value['productId'],
                      decoration: const InputDecoration(labelText: 'Product', contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 10)),
                      items: [const DropdownMenuItem(value: null, child: Text('— Select —')),
                        ...products.products.map((p) => DropdownMenuItem(value: p['id'] as String,
                          child: Text('${p['name']} (${p['stock_qty']} ${p['unit']})', overflow: TextOverflow.ellipsis)))],
                      onChanged: (v) => setState(() { _items[e.key] = {..._items[e.key], 'productId': v, 'price': v == null ? '' : '${products.products.firstWhere((p) => p['id'] == v, orElse: () => {})['cost_price'] ?? ''}'}; }))),
              if (_items.length > 1) IconButton(icon: const Icon(Icons.close, size: 18, color: AppTheme.red),
                onPressed: () => setState(() => _items.removeAt(e.key))),
            ]),
            const SizedBox(height: 8),
            Row(children: [
              Expanded(child: TextFormField(initialValue: e.value['qty'], decoration: const InputDecoration(labelText: 'Qty', contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 10)),
                keyboardType: TextInputType.number, onChanged: (v) => setState(() => _items[e.key] = {..._items[e.key], 'qty': v}))),
              const SizedBox(width: 8),
              Expanded(child: TextFormField(initialValue: e.value['price'], decoration: const InputDecoration(labelText: 'Unit Price (₹)', contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 10)),
                keyboardType: const TextInputType.numberWithOptions(decimal: true), onChanged: (v) => setState(() => _items[e.key] = {..._items[e.key], 'price': v}))),
            ]),
          ]))),
        const SizedBox(height: 12),
        AppTextField(controller: _notes, label: 'Notes (optional)', hint: 'PO notes...', maxLines: 2),
        const SizedBox(height: 16),
        AppCard(child: Row(children: [
          const Text('Total', style: TextStyle(color: AppTheme.slate400, fontSize: 13)),
          const Spacer(),
          Text(formatINR(_total), style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: AppTheme.primary)),
        ])),
        const SizedBox(height: 80),
      ]),
      bottomNavigationBar: SafeArea(child: Padding(padding: const EdgeInsets.fromLTRB(16,8,16,8),
        child: SizedBox(height: 52, child: ElevatedButton(onPressed: _saving ? null : _save,
          child: _saving ? const SizedBox(width:22,height:22,child:CircularProgressIndicator(strokeWidth:2.5,color:Colors.white))
              : const Text('Create Purchase Order'))))),
    );
  }
}