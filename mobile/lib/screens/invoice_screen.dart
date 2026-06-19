import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../providers/inventory_provider.dart';
import '../services/api_service.dart';
class InvoiceScreen extends ConsumerStatefulWidget {
  const InvoiceScreen({super.key});

  @override
  ConsumerState<InvoiceScreen> createState() => _InvoiceScreenState();
}

class _InvoiceScreenState extends ConsumerState<InvoiceScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabCtrl;

  final _tabs = const [
    ('All',       ''),
    ('Draft',     'DRAFT'),
    ('Sent',      'SENT'),
    ('Paid',      'PAID'),
    ('Cancelled', 'CANCELLED'),
  ];

  @override
  void initState() {
    super.initState();
    _tabCtrl = TabController(length: _tabs.length, vsync: this);
  }

  @override
  void dispose() {
    _tabCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text('Invoices'),
        bottom: TabBar(
          controller:        _tabCtrl,
          isScrollable:      true,
          tabAlignment:      TabAlignment.start,
          indicatorColor:    const Color(0xFF6366F1),
          labelColor:        const Color(0xFF6366F1),
          unselectedLabelColor: const Color(0xFF94A3B8),
          labelStyle:        const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
          tabs: _tabs.map((t) => Tab(text: t.$1)).toList(),
        ),
      ),
      body: TabBarView(
        controller: _tabCtrl,
        children: _tabs.map((t) => _InvoiceList(status: t.$2)).toList(),
      ),
    );
  }
}

// ── Invoice List per tab ───────────────────────────────────────────
class _InvoiceList extends ConsumerWidget {
  final String status;
  const _InvoiceList({required this.status});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final invoices = ref.watch(invoicesProvider(status));
    final fmtINR   = NumberFormat.currency(locale: 'en_IN', symbol: '₹', decimalDigits: 0);
    final fmtDate  = DateFormat('dd MMM yyyy');

    return invoices.when(
      loading: () => const Center(child: CircularProgressIndicator(color: Color(0xFF6366F1))),
      error:   (e, _) => Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.wifi_off_rounded, size: 48, color: Color(0xFFCBD5E1)),
            const SizedBox(height: 12),
            const Text('Failed to load invoices', style: TextStyle(color: Color(0xFF475569))),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: () => ref.refresh(invoicesProvider(status)),
              child: const Text('Retry'),
            ),
          ],
        ),
      ),
      data: (list) {
        if (list.isEmpty) {
          return Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.receipt_long_outlined, size: 64, color: Colors.grey.shade300),
                const SizedBox(height: 16),
                Text(
                  status.isEmpty ? 'No invoices yet' : 'No ${status.toLowerCase()} invoices',
                  style: const TextStyle(fontSize: 15, color: Color(0xFF475569), fontWeight: FontWeight.w600),
                ),
              ],
            ),
          );
        }

        return RefreshIndicator(
          color: const Color(0xFF6366F1),
          onRefresh: () => ref.refresh(invoicesProvider(status).future),
          child: ListView.builder(
            padding:     const EdgeInsets.all(12),
            itemCount:   list.length,
            itemBuilder: (_, i) {
              final inv      = list[i] as Map;
              final customer = inv['customer'] as Map?;
              final status   = inv['status'] as String? ?? 'DRAFT';
              final total    = (inv['total'] as num? ?? 0).toDouble();
              final date     = inv['created_at'] != null
                  ? fmtDate.format(DateTime.parse(inv['created_at'] as String))
                  : '—';

              return _InvoiceCard(
                invoiceNo: inv['invoice_no'] as String? ?? '—',
                customer:  customer?['name'] as String? ?? 'Customer',
                total:     fmtINR.format(total),
                status:    status,
                date:      date,
                dueDate:   inv['due_date'] != null
                    ? fmtDate.format(DateTime.parse(inv['due_date'] as String))
                    : null,
              );
            },
          ),
        );
      },
    );
  }
}

// ── Invoice Card ───────────────────────────────────────────────────
class _InvoiceCard extends StatelessWidget {
  final String  invoiceNo, customer, total, status, date;
  final String? dueDate;

  const _InvoiceCard({
    required this.invoiceNo,
    required this.customer,
    required this.total,
    required this.status,
    required this.date,
    this.dueDate,
  });

  Color get _statusColor {
    switch (status) {
      case 'PAID':      return const Color(0xFF10B981);
      case 'SENT':      return const Color(0xFF3B82F6);
      case 'CANCELLED': return const Color(0xFFEF4444);
      default:          return const Color(0xFF94A3B8);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration: BoxDecoration(
        color:        Colors.white,
        borderRadius: BorderRadius.circular(14),
        border:       Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Material(
        color:        Colors.transparent,
        borderRadius: BorderRadius.circular(14),
        child: InkWell(
          borderRadius: BorderRadius.circular(14),
          onTap: () {},
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Row(
              children: [
                // Left icon
                Container(
                  width: 44, height: 44,
                  decoration: BoxDecoration(
                    color:        const Color(0xFFEEF2FF),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(Icons.receipt_long_rounded, color: Color(0xFF6366F1), size: 22),
                ),
                const SizedBox(width: 12),

                // Middle info
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        invoiceNo,
                        style: const TextStyle(
                          fontSize: 13, fontWeight: FontWeight.w700,
                          color: Color(0xFF0F172A), fontFamily: 'monospace',
                        ),
                      ),
                      const SizedBox(height: 3),
                      Text(
                        customer,
                        style: const TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                        maxLines: 1, overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 2),
                      Text(
                        date + (dueDate != null ? ' • Due $dueDate' : ''),
                        style: const TextStyle(fontSize: 10, color: Color(0xFFCBD5E1)),
                      ),
                    ],
                  ),
                ),

                // Right — amount + status
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(
                      total,
                      style: const TextStyle(
                        fontSize: 15, fontWeight: FontWeight.bold, color: Color(0xFF0F172A),
                      ),
                    ),
                    const SizedBox(height: 5),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color:        _statusColor.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Text(
                        status,
                        style: TextStyle(
                          fontSize: 10, color: _statusColor, fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}