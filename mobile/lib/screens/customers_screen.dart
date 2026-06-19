import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/app_providers.dart';
import '../services/api_service.dart';
import '../utils/app_theme.dart';
import '../utils/helpers.dart';
import '../widgets/common_widgets.dart';

class CustomersScreen extends ConsumerStatefulWidget {
  const CustomersScreen({super.key});
  @override
  ConsumerState<CustomersScreen> createState() => _State();
}

class _State extends ConsumerState<CustomersScreen> {
  final _search = TextEditingController();
  bool _showSearch = false;

  @override
  void dispose() { _search.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(customersProvider);
    return Scaffold(
      appBar: AppBar(
        title: _showSearch
            ? TextField(controller: _search, autofocus: true,
                onChanged: (v) => ref.read(customersProvider.notifier).load(search: v),
                decoration: const InputDecoration(hintText: 'Search customers...', border: InputBorder.none,
                  enabledBorder: InputBorder.none, focusedBorder: InputBorder.none, filled: false, contentPadding: EdgeInsets.zero))
            : const Text('Customers'),
        actions: [
          IconButton(icon: Icon(_showSearch ? Icons.close : Icons.search_rounded), onPressed: () {
            setState(() => _showSearch = !_showSearch);
            if (!_showSearch) { _search.clear(); ref.read(customersProvider.notifier).load(); }
          }),
          IconButton(icon: const Icon(Icons.add_rounded), onPressed: () => _openForm(context)),
        ],
      ),
      body: Column(children: [
        // Summary bar
        if (!state.isLoading && state.items.isNotEmpty)
          Container(color: Colors.white, padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            child: Row(children: [
              _chip('Total: ${state.items.length}', AppTheme.primary),
              const SizedBox(width: 8),
              _chip('Outstanding: ${state.items.where((c) => (c['balance'] as num? ?? 0) > 0).length}', AppTheme.red),
            ])),
        Expanded(child: state.isLoading
            ? _skeleton()
            : state.items.isEmpty
                ? EmptyState(icon: Icons.people_outline, title: 'No customers', subtitle: 'Tap + to add your first customer',
                    action: ElevatedButton.icon(onPressed: () => _openForm(context),
                      icon: const Icon(Icons.add, size: 18), label: const Text('Add Customer')))
                : RefreshIndicator(color: AppTheme.primary,
                    onRefresh: () => ref.read(customersProvider.notifier).load(),
                    child: ListView.builder(
                      padding: const EdgeInsets.all(12),
                      itemCount: state.items.length,
                      itemBuilder: (_, i) => _CustomerCard(
                        customer: state.items[i],
                        onTap: () => _openDetail(context, state.items[i]),
                        onEdit: () => _openForm(context, customer: state.items[i]))))),
      ]),
    );
  }

  Widget _skeleton() => ListView.builder(padding: const EdgeInsets.all(12), itemCount: 8,
    itemBuilder: (_, __) => Container(margin: const EdgeInsets.only(bottom: 10), height: 72,
      decoration: BoxDecoration(color: AppTheme.slate200, borderRadius: BorderRadius.circular(14))));

  Widget _chip(String text, Color color) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
    decoration: BoxDecoration(color: color.withOpacity(0.1), borderRadius: BorderRadius.circular(20)),
    child: Text(text, style: TextStyle(fontSize: 11, color: color, fontWeight: FontWeight.w600)));

  void _openForm(BuildContext ctx, {Map<String, dynamic>? customer}) {
    Navigator.push(ctx, MaterialPageRoute(builder: (_) => CustomerFormScreen(customer: customer)))
        .then((ok) { if (ok == true) ref.read(customersProvider.notifier).load(); });
  }

  void _openDetail(BuildContext ctx, Map<String, dynamic> customer) {
    Navigator.push(ctx, MaterialPageRoute(builder: (_) => CustomerDetailScreen(customer: customer)));
  }
}

// ── Customer Card ──────────────────────────────────────────────────
class _CustomerCard extends StatelessWidget {
  final Map<String, dynamic> customer;
  final VoidCallback onTap, onEdit;
  const _CustomerCard({required this.customer, required this.onTap, required this.onEdit});

  @override
  Widget build(BuildContext context) {
    final balance = (customer['balance'] as num? ?? 0).toDouble();
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: AppTheme.slate200)),
      child: InkWell(borderRadius: BorderRadius.circular(14), onTap: onTap,
        child: Padding(padding: const EdgeInsets.all(14), child: Row(children: [
          Container(width: 44, height: 44,
            decoration: BoxDecoration(color: AppTheme.indigo50, borderRadius: BorderRadius.circular(22)),
            child: Center(child: Text((customer['name'] as String? ?? 'C')[0].toUpperCase(),
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppTheme.primary)))),
          const SizedBox(width: 12),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(customer['name'] ?? '', style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600), maxLines: 1, overflow: TextOverflow.ellipsis),
            const SizedBox(height: 3),
            if (customer['phone'] != null)
              Text(customer['phone'], style: const TextStyle(fontSize: 12, color: AppTheme.slate400)),
            if (customer['gstin'] != null)
              Text('GSTIN: ${customer['gstin']}', style: const TextStyle(fontSize: 11, color: AppTheme.primary)),
          ])),
          Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
            if (balance > 0) ...[
              Text(formatINR(balance), style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppTheme.red)),
              const Text('outstanding', style: TextStyle(fontSize: 10, color: AppTheme.slate400)),
            ] else
              const Text('No balance', style: TextStyle(fontSize: 12, color: AppTheme.slate400)),
          ]),
          const SizedBox(width: 8),
          IconButton(icon: const Icon(Icons.edit_outlined, size: 18, color: AppTheme.slate400), onPressed: onEdit, constraints: const BoxConstraints()),
        ]))),
    );
  }
}

// ── Customer Detail ────────────────────────────────────────────────
class CustomerDetailScreen extends ConsumerStatefulWidget {
  final Map<String, dynamic> customer;
  const CustomerDetailScreen({super.key, required this.customer});
  @override
  ConsumerState<CustomerDetailScreen> createState() => _DetailState();
}

class _DetailState extends ConsumerState<CustomerDetailScreen> {
  List<Map>? _invoices;
  bool _loading = true;

  @override
  void initState() { super.initState(); _loadInvoices(); }

  Future<void> _loadInvoices() async {
    setState(() => _loading = true);
    try {
      final res = await api.getCustomerInvoices(widget.customer['id']);
      setState(() { _invoices = ((res.data['invoices']) as List).cast<Map>(); _loading = false; });
    } catch (_) { setState(() { _invoices = []; _loading = false; }); }
  }

  @override
  Widget build(BuildContext context) {
    final c = widget.customer;
    final balance = (c['balance'] as num? ?? 0).toDouble();

    return Scaffold(
      appBar: AppBar(title: Text(c['name'] ?? 'Customer'),
        actions: [IconButton(icon: const Icon(Icons.edit_outlined),
          onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => CustomerFormScreen(customer: c)))
              .then((ok) { if (ok == true) Navigator.pop(context); }))]),
      body: RefreshIndicator(color: AppTheme.primary, onRefresh: _loadInvoices,
        child: ListView(padding: const EdgeInsets.all(16), children: [
          // Profile card
          AppCard(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [
              Container(width: 56, height: 56,
                decoration: BoxDecoration(color: AppTheme.indigo50, borderRadius: BorderRadius.circular(28)),
                child: Center(child: Text((c['name'] as String? ?? 'C')[0].toUpperCase(),
                  style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: AppTheme.primary)))),
              const SizedBox(width: 14),
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(c['name'] ?? '', style: const TextStyle(fontSize: 17, fontWeight: FontWeight.bold)),
                if (c['city'] != null) Text('${c['city']}, ${c['state'] ?? ''}', style: const TextStyle(fontSize: 12, color: AppTheme.slate400)),
              ])),
            ]),
            if (c['phone'] != null || c['email'] != null || c['gstin'] != null) ...[
              const SizedBox(height: 12), const AppDivider(), const SizedBox(height: 12),
              if (c['phone'] != null) InfoRow(label: 'Phone', value: c['phone']),
              if (c['email'] != null) InfoRow(label: 'Email', value: c['email']),
              if (c['gstin'] != null) InfoRow(label: 'GSTIN', value: c['gstin'], valueColor: AppTheme.primary),
              if (c['address'] != null) InfoRow(label: 'Address', value: c['address']),
            ],
          ])),
          const SizedBox(height: 12),

          // Balance card
          Container(padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: balance > 0 ? const Color(0xFFFEF2F2) : const Color(0xFFECFDF5),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: balance > 0 ? AppTheme.red.withOpacity(0.3) : AppTheme.emerald.withOpacity(0.3))),
            child: Row(children: [
              Icon(balance > 0 ? Icons.account_balance_wallet_rounded : Icons.check_circle_rounded,
                color: balance > 0 ? AppTheme.red : AppTheme.emerald, size: 24),
              const SizedBox(width: 12),
              Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(balance > 0 ? 'Outstanding Balance' : 'No Outstanding',
                  style: TextStyle(fontSize: 12, color: balance > 0 ? AppTheme.red : AppTheme.emerald)),
                Text(formatINR(balance.abs()),
                  style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: balance > 0 ? AppTheme.red : AppTheme.emerald)),
              ]),
            ])),
          const SizedBox(height: 20),

          // Invoice history
          SectionHeader(title: 'Invoice History', icon: Icons.receipt_long_outlined),
          const SizedBox(height: 12),
          if (_loading)
            const Center(child: CircularProgressIndicator(color: AppTheme.primary))
          else if (_invoices == null || _invoices!.isEmpty)
            const EmptyState(icon: Icons.receipt_outlined, title: 'No invoices', subtitle: 'No invoices for this customer yet')
          else
            ...(_invoices!.map((inv) => Container(
              margin: const EdgeInsets.only(bottom: 8),
              decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppTheme.slate200)),
              child: ListTile(
                leading: const Icon(Icons.receipt_long_rounded, color: AppTheme.primary, size: 20),
                title: Text(inv['invoice_no'] ?? '', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, fontFamily: 'monospace')),
                subtitle: Text(formatDate(inv['created_at']), style: const TextStyle(fontSize: 11)),
                trailing: Column(mainAxisAlignment: MainAxisAlignment.center, crossAxisAlignment: CrossAxisAlignment.end, children: [
                  Text(formatINR(inv['total'] ?? 0), style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
                  StatusBadge(inv['status'] as String? ?? 'DRAFT'),
                ]))))),
        ])),
    );
  }
}

// ── Customer Form ──────────────────────────────────────────────────
class CustomerFormScreen extends StatefulWidget {
  final Map<String, dynamic>? customer;
  const CustomerFormScreen({super.key, this.customer});
  @override
  State<CustomerFormScreen> createState() => _FormState();
}

class _FormState extends State<CustomerFormScreen> {
  final _form = GlobalKey<FormState>();
  bool _saving = false; String? _err;
  late final _name  = TextEditingController(text: widget.customer?['name']    ?? '');
  late final _phone = TextEditingController(text: widget.customer?['phone']   ?? '');
  late final _email = TextEditingController(text: widget.customer?['email']   ?? '');
  late final _gstin = TextEditingController(text: widget.customer?['gstin']   ?? '');
  late final _addr  = TextEditingController(text: widget.customer?['address'] ?? '');
  late final _city  = TextEditingController(text: widget.customer?['city']    ?? '');
  late final _state = TextEditingController(text: widget.customer?['state']   ?? '');

  @override
  void dispose() { [_name,_phone,_email,_gstin,_addr,_city,_state].forEach((c)=>c.dispose()); super.dispose(); }

  Future<void> _save() async {
    if (!_form.currentState!.validate()) return;
    FocusScope.of(context).unfocus();
    setState(() { _saving = true; _err = null; });
    try {
      final data = { 'name':_name.text.trim(), 'phone':_phone.text.trim().isEmpty?null:_phone.text.trim(),
        'email':_email.text.trim().isEmpty?null:_email.text.trim(), 'gstin':_gstin.text.trim().isEmpty?null:_gstin.text.trim().toUpperCase(),
        'address':_addr.text.trim().isEmpty?null:_addr.text.trim(), 'city':_city.text.trim().isEmpty?null:_city.text.trim(),
        'state':_state.text.trim().isEmpty?null:_state.text.trim() };
      if (widget.customer != null) await api.updateCustomer(widget.customer!['id'], data);
      else await api.createCustomer(data);
      if (mounted) Navigator.pop(context, true);
    } catch (e) { setState(() { _err = errorMessage(e); _saving = false; }); }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: Text(widget.customer != null ? 'Edit Customer' : 'Add Customer'),
      actions: [TextButton(onPressed: _saving ? null : _save,
        child: _saving ? const SizedBox(width:18,height:18,child:CircularProgressIndicator(strokeWidth:2))
            : Text(widget.customer != null ? 'Update' : 'Save',
                style: const TextStyle(color: AppTheme.primary, fontWeight: FontWeight.w700)))]),
    body: Form(key: _form, child: ListView(padding: const EdgeInsets.all(16), children: [
      if (_err != null) ...[
        Container(padding: const EdgeInsets.all(12), decoration: BoxDecoration(color: const Color(0xFFFEF2F2), borderRadius: BorderRadius.circular(12), border: Border.all(color: const Color(0xFFFECACA))),
          child: Text(_err!, style: const TextStyle(color: Color(0xFFB91C1C), fontSize: 13))),
        const SizedBox(height: 12),
      ],
      AppTextField(controller: _name, label: 'Name *', hint: 'Customer / Business name', prefixIcon: Icons.person_outline,
        validator: (v) => v==null||v.trim().isEmpty ? 'Required' : null),
      const SizedBox(height: 12),
      Row(children: [
        Expanded(child: AppTextField(controller: _phone, label: 'Phone', hint: '9876543210', prefixIcon: Icons.phone_outlined, keyboardType: TextInputType.phone)),
        const SizedBox(width: 12),
        Expanded(child: AppTextField(controller: _email, label: 'Email', hint: 'email@example.com', prefixIcon: Icons.email_outlined, keyboardType: TextInputType.emailAddress)),
      ]),
      const SizedBox(height: 12),
      AppTextField(controller: _gstin, label: 'GSTIN', hint: '22AAAAA0000A1Z5', prefixIcon: Icons.badge_outlined),
      const SizedBox(height: 12),
      AppTextField(controller: _addr, label: 'Address', hint: 'Street address', prefixIcon: Icons.home_outlined),
      const SizedBox(height: 12),
      Row(children: [
        Expanded(child: AppTextField(controller: _city, label: 'City', hint: 'Surat', prefixIcon: Icons.location_city_outlined)),
        const SizedBox(width: 12),
        Expanded(child: AppTextField(controller: _state, label: 'State', hint: 'Gujarat', prefixIcon: Icons.map_outlined)),
      ]),
      const SizedBox(height: 80),
    ])),
    bottomNavigationBar: SafeArea(child: Padding(padding: const EdgeInsets.fromLTRB(16,8,16,8),
      child: SizedBox(height: 52, child: ElevatedButton(onPressed: _saving ? null : _save,
        child: _saving ? const SizedBox(width:22,height:22,child:CircularProgressIndicator(strokeWidth:2.5,color:Colors.white))
            : Text(widget.customer != null ? 'Update Customer' : 'Add Customer'))))),
  );
}