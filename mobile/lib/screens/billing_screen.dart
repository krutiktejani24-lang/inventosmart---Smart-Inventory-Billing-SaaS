import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';
import '../providers/app_providers.dart';
import '../services/api_service.dart';
import '../utils/app_theme.dart';
import '../utils/helpers.dart';
import '../widgets/common_widgets.dart';

class BillingScreen extends ConsumerStatefulWidget {
  const BillingScreen({super.key});
  @override
  ConsumerState<BillingScreen> createState() => _State();
}

class _State extends ConsumerState<BillingScreen> with SingleTickerProviderStateMixin {
  late TabController _tabs;
  final _tabLabels = [('All',''),('Draft','DRAFT'),('Sent','SENT'),('Paid','PAID'),('Cancelled','CANCELLED')];

  @override
  void initState() { super.initState(); _tabs = TabController(length: _tabLabels.length, vsync: this); }
  @override
  void dispose() { _tabs.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      title: const Text('Billing'),
      actions: [IconButton(icon: const Icon(Icons.add_rounded), onPressed: () => _openCreate(context))],
      bottom: TabBar(
        controller: _tabs, isScrollable: true, tabAlignment: TabAlignment.start,
        indicatorColor: AppTheme.primary, labelColor: AppTheme.primary,
        unselectedLabelColor: AppTheme.slate400,
        labelStyle: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
        tabs: _tabLabels.map((t) => Tab(text: t.$1)).toList()),
    ),
    body: TabBarView(
      controller: _tabs,
      children: _tabLabels.map((t) => _InvoiceList(status: t.$2, onTap: (inv) => _openDetail(context, inv))).toList()),
  );

  void _openCreate(BuildContext ctx) => Navigator.push(ctx, MaterialPageRoute(builder: (_) => const CreateInvoiceScreen()))
      .then((_) => ref.invalidate(invoicesProvider('')));

  void _openDetail(BuildContext ctx, Map inv) => Navigator.push(ctx, MaterialPageRoute(builder: (_) => InvoiceDetailScreen(invoice: inv)))
      .then((_) { for (final t in _tabLabels) ref.invalidate(invoicesProvider(t.$2)); });
}

// ── Invoice list per tab ───────────────────────────────────────────
class _InvoiceList extends ConsumerWidget {
  final String status;
  final void Function(Map) onTap;
  const _InvoiceList({required this.status, required this.onTap});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final invoices = ref.watch(invoicesProvider(status));
    return invoices.when(
      loading: () => const Center(child: CircularProgressIndicator(color: AppTheme.primary)),
      error: (e, _) => ErrorState(msg: errorMessage(e), onRetry: () => ref.invalidate(invoicesProvider(status))),
      data: (list) => list.isEmpty
          ? EmptyState(icon: Icons.receipt_long_outlined, title: 'No invoices', subtitle: 'Tap + to create one')
          : RefreshIndicator(color: AppTheme.primary,
              onRefresh: () => ref.refresh(invoicesProvider(status).future),
              child: ListView.builder(
                padding: const EdgeInsets.all(12),
                itemCount: list.length,
                itemBuilder: (_, i) => _InvoiceCard(invoice: list[i], onTap: () => onTap(list[i])))),
    );
  }
}

class _InvoiceCard extends StatelessWidget {
  final Map invoice; final VoidCallback onTap;
  const _InvoiceCard({required this.invoice, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final status = invoice['status'] as String? ?? 'DRAFT';
    final customer = invoice['customer'] as Map?;
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: AppTheme.slate200)),
      child: InkWell(borderRadius: BorderRadius.circular(14), onTap: onTap,
        child: Padding(padding: const EdgeInsets.all(14), child: Row(children: [
          Container(width: 44, height: 44,
            decoration: BoxDecoration(color: AppTheme.indigo50, borderRadius: BorderRadius.circular(12)),
            child: const Icon(Icons.receipt_long_rounded, color: AppTheme.primary, size: 22)),
          const SizedBox(width: 12),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(invoice['invoice_no'] ?? '', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, fontFamily: 'monospace')),
            const SizedBox(height: 3),
            Text(customer?['name'] ?? '', style: const TextStyle(fontSize: 12, color: AppTheme.slate400), maxLines: 1, overflow: TextOverflow.ellipsis),
            Text(formatDate(invoice['created_at']), style: const TextStyle(fontSize: 11, color: AppTheme.slate200)),
          ])),
          Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
            Text(formatINR(invoice['total'] ?? 0), style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
            const SizedBox(height: 5),
            StatusBadge(status),
          ]),
        ]))),
    );
  }
}

// ── Invoice Detail ─────────────────────────────────────────────────
class InvoiceDetailScreen extends ConsumerStatefulWidget {
  final Map invoice;
  const InvoiceDetailScreen({super.key, required this.invoice});
  @override
  ConsumerState<InvoiceDetailScreen> createState() => _DetailState();
}

class _DetailState extends ConsumerState<InvoiceDetailScreen> {
  Map? _invoice;
  bool _loading = true;
  String? _upiQR;

  @override
  void initState() { super.initState(); _load(); }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final res = await api.getInvoice(widget.invoice['id']);
      setState(() { _invoice = res.data['invoice'] as Map?; _loading = false; });
    } catch (_) { setState(() { _invoice = widget.invoice; _loading = false; }); }
  }

  Future<void> _loadUpiQR() async {
    try {
      final res = await api.getUpiQR(_invoice!['id']);
      setState(() => _upiQR = res.data['qrDataUrl'] as String?);
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(errorMessage(e)), backgroundColor: AppTheme.red));
    }
  }

  Future<void> _updateStatus(String status) async {
    try {
      await api.updateInvoiceStatus(_invoice!['id'], status);
      await _load();
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Marked as $status'), backgroundColor: AppTheme.emerald));
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(errorMessage(e)), backgroundColor: AppTheme.red));
    }
  }

  Future<void> _shareWhatsApp() async {
    try {
      final res = await api.getWhatsAppLink(_invoice!['id']);
      final url = res.data['whatsappURL'] as String?;
      if (url != null) await launchUrl(Uri.parse(url), mode: LaunchMode.externalApplication);
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(errorMessage(e)), backgroundColor: AppTheme.red));
    }
  }

  @override
  Widget build(BuildContext context) {
    final inv = _invoice ?? widget.invoice;
    final status = inv['status'] as String? ?? 'DRAFT';
    final items = (inv['items'] as List?)?.cast<Map>() ?? [];
    final payments = (inv['payments'] as List?)?.cast<Map>() ?? [];
    final totalTax = ((inv['cgst'] as num? ?? 0) + (inv['sgst'] as num? ?? 0) + (inv['igst'] as num? ?? 0)).toDouble();

    return Scaffold(
      appBar: AppBar(
        title: Text(inv['invoice_no'] ?? 'Invoice', style: const TextStyle(fontFamily: 'monospace', fontSize: 15)),
        actions: [
          IconButton(icon: const Icon(Icons.share_rounded), onPressed: _shareWhatsApp, tooltip: 'WhatsApp'),
          IconButton(icon: const Icon(Icons.qr_code_rounded), onPressed: () => _showUpiSheet(context), tooltip: 'UPI QR'),
          PopupMenuButton<String>(
            onSelected: _updateStatus,
            itemBuilder: (_) => ['DRAFT','SENT','PAID','CANCELLED']
                .where((s) => s != status)
                .map((s) => PopupMenuItem(value: s, child: Text('Mark as $s')))
                .toList()),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: AppTheme.primary))
          : RefreshIndicator(color: AppTheme.primary, onRefresh: _load, child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                // Status
                Container(padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(color: status.statusBg, borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: status.statusColor.withOpacity(0.3))),
                  child: Row(children: [
                    Icon(status == 'PAID' ? Icons.check_circle_rounded : status == 'CANCELLED' ? Icons.cancel_rounded : Icons.pending_rounded,
                      color: status.statusColor, size: 24),
                    const SizedBox(width: 12),
                    Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Text(status, style: TextStyle(fontWeight: FontWeight.bold, color: status.statusColor)),
                      Text(formatDate(inv['created_at']), style: const TextStyle(fontSize: 12, color: AppTheme.slate400)),
                    ]),
                    const Spacer(),
                    Text(formatINR(inv['total'] ?? 0), style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: status.statusColor)),
                  ])),
                const SizedBox(height: 16),

                // Customer
                AppCard(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  const Text('Bill To', style: TextStyle(fontSize: 11, color: AppTheme.slate400, fontWeight: FontWeight.w600)),
                  const SizedBox(height: 6),
                  Text((inv['customer'] as Map?)?['name'] ?? '', style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
                  if ((inv['customer'] as Map?)?['phone'] != null)
                    Text((inv['customer'] as Map?)!['phone'], style: const TextStyle(fontSize: 12, color: AppTheme.slate400)),
                  if ((inv['customer'] as Map?)?['gstin'] != null)
                    Text('GSTIN: ${(inv['customer'] as Map?)!['gstin']}', style: const TextStyle(fontSize: 11, color: AppTheme.primary)),
                  if (inv['due_date'] != null) ...[
                    const SizedBox(height: 6),
                    Text('Due: ${formatDate(inv['due_date'])}', style: const TextStyle(fontSize: 12, color: AppTheme.amber, fontWeight: FontWeight.w600)),
                  ],
                ])),
                const SizedBox(height: 12),

                // Items
                AppCard(padding: EdgeInsets.zero, child: Column(children: [
                  const Padding(padding: EdgeInsets.all(14),
                    child: Row(children: [
                      Expanded(child: Text('Item', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: AppTheme.slate400))),
                      Text('Qty', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: AppTheme.slate400)),
                      SizedBox(width: 16),
                      SizedBox(width: 80, child: Text('Amount', textAlign: TextAlign.right, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: AppTheme.slate400))),
                    ])),
                  const AppDivider(),
                  ...items.map((item) => Padding(padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                    child: Row(children: [
                      Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Text(item['name'] ?? '', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                        Text('₹${item['price']} × ${item['qty']} • GST ${item['gst_rate']}%',
                          style: const TextStyle(fontSize: 11, color: AppTheme.slate400)),
                      ])),
                      Text('${item['qty']}', style: const TextStyle(fontSize: 13, color: AppTheme.slate600)),
                      const SizedBox(width: 16),
                      SizedBox(width: 80, child: Text(formatINR(item['total'] ?? 0), textAlign: TextAlign.right,
                        style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold))),
                    ]))),
                ])),
                const SizedBox(height: 12),

                // Totals
                AppCard(child: Column(children: [
                  InfoRow(label: 'Subtotal', value: formatINR(inv['subtotal'] ?? 0)),
                  if ((inv['discount'] as num? ?? 0) > 0) ...[
                    const AppDivider(),
                    InfoRow(label: 'Discount', value: '-${formatINR(inv['discount'] ?? 0)}', valueColor: AppTheme.emerald),
                  ],
                  if ((inv['cgst'] as num? ?? 0) > 0) ...[const AppDivider(), InfoRow(label: 'CGST', value: formatINR(inv['cgst'] ?? 0))],
                  if ((inv['sgst'] as num? ?? 0) > 0) ...[const AppDivider(), InfoRow(label: 'SGST', value: formatINR(inv['sgst'] ?? 0))],
                  if ((inv['igst'] as num? ?? 0) > 0) ...[const AppDivider(), InfoRow(label: 'IGST', value: formatINR(inv['igst'] ?? 0))],
                  const AppDivider(),
                  Padding(padding: const EdgeInsets.symmetric(vertical: 6),
                    child: Row(children: [
                      const Text('Total', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                      const Spacer(),
                      Text(formatINR(inv['total'] ?? 0), style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppTheme.primary)),
                    ])),
                ])),

                // Payments
                if (payments.isNotEmpty) ...[
                  const SizedBox(height: 12),
                  AppCard(padding: EdgeInsets.zero, child: Column(children: [
                    const Padding(padding: EdgeInsets.all(14),
                      child: Align(alignment: Alignment.centerLeft,
                        child: Text('Payment History', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700)))),
                    const AppDivider(),
                    ...payments.map((p) => ListTile(dense: true,
                      leading: const Icon(Icons.payment_rounded, color: AppTheme.emerald, size: 20),
                      title: Text(p['method'] ?? 'CASH', style: const TextStyle(fontSize: 13)),
                      subtitle: Text(formatDate(p['created_at']), style: const TextStyle(fontSize: 11)),
                      trailing: Text(formatINR(p['amount'] ?? 0), style: const TextStyle(color: AppTheme.emerald, fontWeight: FontWeight.bold)))),
                  ])),
                ],

                if (inv['notes'] != null) ...[
                  const SizedBox(height: 12),
                  AppCard(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    const Text('Notes', style: TextStyle(fontSize: 11, color: AppTheme.slate400, fontWeight: FontWeight.w600)),
                    const SizedBox(height: 6),
                    Text(inv['notes'], style: const TextStyle(fontSize: 13)),
                  ])),
                ],
                const SizedBox(height: 80),
              ])),
      bottomNavigationBar: status != 'PAID' && status != 'CANCELLED' ? SafeArea(child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
        child: Row(children: [
          if (status == 'DRAFT') ...[
            Expanded(child: OutlinedButton(
              onPressed: () => _updateStatus('SENT'),
              style: OutlinedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 14), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
              child: const Text('Mark Sent'))),
            const SizedBox(width: 12),
          ],
          Expanded(child: ElevatedButton(
            onPressed: () => _updateStatus('PAID'),
            child: const Text('Mark Paid'))),
        ]))) : null,
    );
  }

  void _showUpiSheet(BuildContext context) {
    if (_upiQR == null) _loadUpiQR();
    showModalBottomSheet(context: context, shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (_) => StatefulBuilder(builder: (ctx, setS) => Padding(
        padding: const EdgeInsets.all(24),
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          Container(width: 36, height: 4, margin: const EdgeInsets.only(bottom: 16),
            decoration: BoxDecoration(color: AppTheme.slate200, borderRadius: BorderRadius.circular(2))),
          const Text('UPI Payment', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
          const SizedBox(height: 6),
          Text(formatINR((_invoice ?? widget.invoice)['total'] ?? 0),
            style: const TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: AppTheme.primary)),
          const SizedBox(height: 16),
          if (_upiQR == null)
            const CircularProgressIndicator(color: AppTheme.primary)
          else
            Image.network(_upiQR!, width: 180, height: 180),
          const SizedBox(height: 12),
          const Text('Scan with PhonePe, GPay, Paytm, BHIM',
            style: TextStyle(fontSize: 12, color: AppTheme.slate400)),
          const SizedBox(height: 20),
          SizedBox(width: double.infinity, child: ElevatedButton(
            onPressed: () { _updateStatus('PAID'); Navigator.pop(ctx); },
            child: const Text('Mark as Paid'))),
        ]))));
  }
}

// ── Create Invoice ─────────────────────────────────────────────────
class CreateInvoiceScreen extends ConsumerStatefulWidget {
  const CreateInvoiceScreen({super.key});
  @override
  ConsumerState<CreateInvoiceScreen> createState() => _CreateState();
}

class _CreateState extends ConsumerState<CreateInvoiceScreen> {
  final _form = GlobalKey<FormState>();
  bool _saving = false;
  String? _err, _customerId;
  final _supply = TextEditingController(text: 'Gujarat');
  final _bizState = TextEditingController(text: 'Gujarat');
  final _discount = TextEditingController(text: '0');
  final _notes = TextEditingController();
  DateTime? _dueDate;
  List<Map<String, dynamic>> _items = [
    {'name': '', 'hsn_code': '', 'qty': '1', 'price': '', 'discount': '0', 'gst_rate': '18'}
  ];

  @override
  void dispose() { [_supply, _bizState, _discount, _notes].forEach((c) => c.dispose()); super.dispose(); }

  double get _preview => _items.fold(0.0, (s, it) {
    final base = (double.tryParse(it['price'] ?? '') ?? 0) * (int.tryParse(it['qty'] ?? '1') ?? 1);
    final disc = base * (double.tryParse(it['discount'] ?? '0') ?? 0) / 100;
    final tax  = (base - disc) * (double.tryParse(it['gst_rate'] ?? '18') ?? 18) / 100;
    return s + base - disc + tax;
  });

  Future<void> _save() async {
    if (!_form.currentState!.validate()) return;
    if (_customerId == null) { setState(() => _err = 'Please select a customer'); return; }
    FocusScope.of(context).unfocus();
    setState(() { _saving = true; _err = null; });
    try {
      await api.createInvoice({
        'customerId': _customerId, 'placeOfSupply': _supply.text, 'businessState': _bizState.text,
        'discount': double.tryParse(_discount.text) ?? 0, 'notes': _notes.text.trim().isEmpty ? null : _notes.text.trim(),
        'dueDate': _dueDate?.toIso8601String(),
        'items': _items.map((it) => {
          ...it, 'qty': int.tryParse(it['qty'] ?? '1') ?? 1,
          'price': double.tryParse(it['price'] ?? '0') ?? 0,
          'discount': double.tryParse(it['discount'] ?? '0') ?? 0,
          'gst_rate': double.tryParse(it['gst_rate'] ?? '18') ?? 18,
        }).toList(),
      });
      if (mounted) Navigator.pop(context, true);
    } catch (e) { setState(() { _err = errorMessage(e); _saving = false; }); }
  }

  void _addItem() => setState(() => _items.add({'name':'','hsn_code':'','qty':'1','price':'','discount':'0','gst_rate':'18'}));
  void _removeItem(int i) { if (_items.length > 1) setState(() => _items.removeAt(i)); }
  void _setItem(int i, String k, String v) {
  setState(() {
    _items[i] = {
      ..._items[i],
      k: v,
    };
  });
}

  @override
  Widget build(BuildContext context) {
    final customers = ref.watch(customersProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('New Invoice'),
        actions: [TextButton(onPressed: _saving ? null : _save,
          child: _saving ? const SizedBox(width:18,height:18,child:CircularProgressIndicator(strokeWidth:2))
              : const Text('Create', style: TextStyle(color: AppTheme.primary, fontWeight: FontWeight.w700)))]),
      body: Form(key: _form, child: ListView(padding: const EdgeInsets.all(16), children: [
        if (_err != null) ...[
          Container(padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(color: const Color(0xFFFEF2F2), borderRadius: BorderRadius.circular(12), border: Border.all(color: const Color(0xFFFECACA))),
            child: Text(_err!, style: const TextStyle(color: Color(0xFFB91C1C), fontSize: 13))),
          const SizedBox(height: 12),
        ],

        // Customer picker
        InputDecorator(
          decoration: const InputDecoration(labelText: 'Customer *', prefixIcon: Icon(Icons.person_outline, size: 18)),
          child: DropdownButtonHideUnderline(child: customers.isLoading
              ? const SizedBox(height: 20, child: Center(child: LinearProgressIndicator()))
              : DropdownButton<String?>(
                  value: _customerId, isDense: true, isExpanded: true,
                  icon: const Icon(Icons.keyboard_arrow_down_rounded, size: 20, color: AppTheme.slate400),
                  hint: const Text('Select customer', style: TextStyle(fontSize: 14, color: AppTheme.slate400)),
                  items: [const DropdownMenuItem(value: null, child: Text('— Select —', style: TextStyle(fontSize: 14, color: AppTheme.slate400))),
                    ...customers.items.map((c) => DropdownMenuItem(value: c['id'] as String, child: Text(c['name'] as String, style: const TextStyle(fontSize: 14))))],
                  onChanged: (v) => setState(() => _customerId = v)))),
        const SizedBox(height: 14),

        Row(children: [
          Expanded(child: AppTextField(controller: _supply, label: 'Place of Supply', hint: 'Gujarat', prefixIcon: Icons.location_on_outlined)),
          const SizedBox(width: 12),
          Expanded(child: AppTextField(controller: _discount, label: 'Invoice Discount %', hint: '0', prefixIcon: Icons.discount_outlined,
            keyboardType: const TextInputType.numberWithOptions(decimal: true))),
        ]),
        const SizedBox(height: 14),

        // Due date
        InkWell(onTap: () async {
          final d = await showDatePicker(context: context, initialDate: DateTime.now().add(const Duration(days: 7)),
            firstDate: DateTime.now(), lastDate: DateTime.now().add(const Duration(days: 365)));
          if (d != null) setState(() => _dueDate = d);
        }, child: InputDecorator(
          decoration: const InputDecoration(labelText: 'Due Date (optional)', prefixIcon: Icon(Icons.calendar_today_outlined, size: 18)),
          child: Text(_dueDate == null ? 'Tap to select' : formatDate(_dueDate!.toIso8601String()),
            style: TextStyle(fontSize: 14, color: _dueDate == null ? AppTheme.slate400 : AppTheme.slate800)))),
        const SizedBox(height: 20),

        // Items
        Row(children: [
          const Text('Line Items', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
          const Spacer(),
          TextButton.icon(onPressed: _addItem, icon: const Icon(Icons.add, size: 16), label: const Text('Add Item')),
        ]),
        ..._items.asMap().entries.map((e) => _ItemRow(index: e.key, item: e.value, onChanged: _setItem, onRemove: () => _removeItem(e.key), canRemove: _items.length > 1)),

        const SizedBox(height: 14),
        AppTextField(controller: _notes, label: 'Notes (optional)', hint: 'Thank you for your business!', maxLines: 2),
        const SizedBox(height: 16),

        // Preview
        AppCard(child: Row(children: [
          const Text('Estimated Total', style: TextStyle(color: AppTheme.slate400, fontSize: 13)),
          const Spacer(),
          Text(formatINR(_preview), style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: AppTheme.primary)),
        ])),
        const SizedBox(height: 80),
      ])),
      bottomNavigationBar: SafeArea(child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
        child: SizedBox(height: 52, child: ElevatedButton(
          onPressed: _saving ? null : _save,
          child: _saving ? const SizedBox(width:22,height:22,child:CircularProgressIndicator(strokeWidth:2.5,color:Colors.white))
              : const Text('Create Invoice'))))),
    );
  }
}

class _ItemRow extends StatelessWidget {
  final int index; final Map<String,dynamic> item;
  final void Function(int, String, String) onChanged;
  final VoidCallback onRemove; final bool canRemove;
  const _ItemRow({required this.index, required this.item, required this.onChanged, required this.onRemove, required this.canRemove});

  @override
  Widget build(BuildContext context) => Container(
    margin: const EdgeInsets.only(bottom: 10),
    padding: const EdgeInsets.all(12),
    decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppTheme.slate200)),
    child: Column(children: [
      Row(children: [
        Expanded(child: TextFormField(initialValue: item['name'], decoration: const InputDecoration(labelText: 'Item Name *', contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 10)),
          onChanged: (v) => onChanged(index, 'name', v),
          validator: (v) => v == null || v.trim().isEmpty ? 'Required' : null)),
        if (canRemove) ...[const SizedBox(width: 8), IconButton(icon: const Icon(Icons.close, size: 18, color: AppTheme.red), onPressed: onRemove, constraints: const BoxConstraints())],
      ]),
      const SizedBox(height: 8),
      Row(children: [
        Expanded(child: TextFormField(initialValue: item['qty'], decoration: const InputDecoration(labelText: 'Qty', contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 10)),
          keyboardType: TextInputType.number, onChanged: (v) => onChanged(index, 'qty', v))),
        const SizedBox(width: 8),
        Expanded(child: TextFormField(initialValue: item['price'], decoration: const InputDecoration(labelText: 'Price (₹) *', contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 10)),
          keyboardType: const TextInputType.numberWithOptions(decimal: true), onChanged: (v) => onChanged(index, 'price', v),
          validator: (v) => v == null || v.isEmpty ? 'Required' : null)),
        const SizedBox(width: 8),
        Expanded(child: DropdownButtonFormField<String>(
          value: item['gst_rate'] ?? '18',
          decoration: const InputDecoration(labelText: 'GST%', contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 10)),
          items: ['0','5','12','18','28'].map((r) => DropdownMenuItem(value: r, child: Text('$r%'))).toList(),
          onChanged: (v) => onChanged(index, 'gst_rate', v ?? '18'))),
      ]),
    ]),
  );
}