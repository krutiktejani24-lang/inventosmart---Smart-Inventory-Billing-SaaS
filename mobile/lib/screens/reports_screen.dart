import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:fl_chart/fl_chart.dart';
import '../providers/app_providers.dart';
import '../services/api_service.dart';
import '../utils/app_theme.dart';
import '../utils/helpers.dart';
import '../widgets/common_widgets.dart';

class ReportsScreen extends ConsumerStatefulWidget {
  const ReportsScreen({super.key});
  @override
  ConsumerState<ReportsScreen> createState() => _State();
}

class _State extends ConsumerState<ReportsScreen> with SingleTickerProviderStateMixin {
  late TabController _tabs;
  final _tabs_labels = ['Dashboard', 'Sales', 'P&L', 'GSTR-1', 'Top Products', 'Low Stock'];

  @override
  void initState() { super.initState(); _tabs = TabController(length: _tabs_labels.length, vsync: this); }
  @override
  void dispose() { _tabs.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      title: const Text('Reports'),
      bottom: TabBar(
        controller: _tabs, isScrollable: true, tabAlignment: TabAlignment.start,
        indicatorColor: AppTheme.primary, labelColor: AppTheme.primary,
        unselectedLabelColor: AppTheme.slate400,
        labelStyle: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
        tabs: _tabs_labels.map((t) => Tab(text: t)).toList()),
    ),
    body: TabBarView(controller: _tabs, children: const [
      _DashboardTab(),
      _SalesTab(),
      _PLTab(),
      _GSTR1Tab(),
      _TopProductsTab(),
      _LowStockTab(),
    ]),
  );
}

// ── Dashboard Report Tab ───────────────────────────────────────────
class _DashboardTab extends ConsumerWidget {
  const _DashboardTab();
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final dash = ref.watch(dashboardProvider);
    return dash.when(
      loading: () => const Center(child: CircularProgressIndicator(color: AppTheme.primary)),
      error: (e, _) => ErrorState(msg: errorMessage(e), onRetry: () => ref.refresh(dashboardProvider.future)),
      data: (data) {
        final stats  = (data['stats']  as Map?)  ?? {};
        final weekly = (data['weeklyData'] as List?) ?? [];
        final maxVal = weekly.isEmpty ? 1.0 :
            weekly.map((e) => (e['sales'] as num? ?? 0).toDouble()).fold(0.0, (a, b) => a > b ? a : b);

        return RefreshIndicator(color: AppTheme.primary,
          onRefresh: () => ref.refresh(dashboardProvider.future),
          child: ListView(padding: const EdgeInsets.all(16), children: [
            // Stats
            GridView.count(
              crossAxisCount: 2, shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              crossAxisSpacing: 12, mainAxisSpacing: 12, childAspectRatio: 1.2,
              children: [
                StatCard(icon: Icons.currency_rupee_rounded, label: "Today's Sales",
                  value: formatINR(stats['todaySales'] ?? 0), color: AppTheme.primary, bg: AppTheme.indigo50),
                StatCard(icon: Icons.receipt_long_rounded, label: 'Pending Invoices',
                  value: '${stats['pendingInvoices'] ?? 0}', color: AppTheme.amber, bg: const Color(0xFFFEF3C7)),
                StatCard(icon: Icons.inventory_2_rounded, label: 'Total Products',
                  value: '${stats['totalProducts'] ?? 0}', color: AppTheme.emerald, bg: const Color(0xFFECFDF5)),
                StatCard(icon: Icons.warning_amber_rounded, label: 'Low Stock',
                  value: '${stats['lowStockCount'] ?? 0}', color: AppTheme.red, bg: const Color(0xFFFEF2F2)),
              ]),
            const SizedBox(height: 20),

            // Weekly chart
            if (weekly.isNotEmpty) ...[
              SectionHeader(title: 'Weekly Sales', icon: Icons.bar_chart_rounded),
              const SizedBox(height: 12),
              AppCard(padding: const EdgeInsets.fromLTRB(12, 16, 16, 8),
                child: SizedBox(height: 200,
                  child: BarChart(BarChartData(
                    maxY: maxVal * 1.2,
                    gridData: FlGridData(show: true, drawVerticalLine: false,
                      getDrawingHorizontalLine: (_) => const FlLine(color: AppTheme.slate100, strokeWidth: 1)),
                    borderData: FlBorderData(show: false),
                    titlesData: FlTitlesData(
                      leftTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                      rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                      topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                      bottomTitles: AxisTitles(sideTitles: SideTitles(showTitles: true, reservedSize: 28,
                        getTitlesWidget: (val, _) {
                          final i = val.toInt();
                          if (i < 0 || i >= weekly.length) return const SizedBox.shrink();
                          return Padding(padding: const EdgeInsets.only(top: 6),
                            child: Text(weekly[i]['day'] ?? '', style: const TextStyle(fontSize: 10, color: AppTheme.slate400)));
                        }))),
                    barGroups: weekly.asMap().entries.map((e) {
                      final sales = (e.value['sales'] as num? ?? 0).toDouble();
                      return BarChartGroupData(x: e.key, barRods: [BarChartRodData(
                        toY: sales, width: 20, color: AppTheme.primary,
                        borderRadius: const BorderRadius.vertical(top: Radius.circular(6)),
                        gradient: const LinearGradient(colors: [Color(0xFF818CF8), AppTheme.primary],
                          begin: Alignment.topCenter, end: Alignment.bottomCenter))]);
                    }).toList(),
                    barTouchData: BarTouchData(touchTooltipData: BarTouchTooltipData(
                      getTooltipItem: (_, __, rod, ___) => BarTooltipItem(formatINR(rod.toY),
                        const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold)))))))),
            ],
          ]));
      });
  }
}

// ── Sales Report Tab ───────────────────────────────────────────────
class _SalesTab extends StatefulWidget {
  const _SalesTab();
  @override
  State<_SalesTab> createState() => _SalesState();
}

class _SalesState extends State<_SalesTab> {
  Map? _data;
  bool _loading = false;
  DateTime _from = DateTime.now().subtract(const Duration(days: 30));
  DateTime _to   = DateTime.now();

  @override
  void initState() { super.initState(); _load(); }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final res = await api.getSalesReport(
        _from.toIso8601String().substring(0, 10),
        _to.toIso8601String().substring(0, 10));
      setState(() { _data = res.data as Map?; _loading = false; });
    } catch (_) { setState(() => _loading = false); }
  }

  @override
  Widget build(BuildContext context) {
    final summary = _data?['summary'] as Map?;
    final invoices = (_data?['invoices'] as List?)?.cast<Map>() ?? [];
    return RefreshIndicator(color: AppTheme.primary, onRefresh: _load,
      child: ListView(padding: const EdgeInsets.all(16), children: [
        // Date range picker
        Row(children: [
          Expanded(child: _datePicker('From', _from, (d) { setState(() => _from = d); _load(); })),
          const SizedBox(width: 12),
          Expanded(child: _datePicker('To', _to, (d) { setState(() => _to = d); _load(); })),
        ]),
        const SizedBox(height: 16),

        // Quick range chips
        Wrap(spacing: 8, children: [
          _rangeChip('This Month', () { setState(() { _from = DateTime(DateTime.now().year, DateTime.now().month, 1); _to = DateTime.now(); }); _load(); }),
          _rangeChip('Last 7 Days', () { setState(() { _from = DateTime.now().subtract(const Duration(days: 7)); _to = DateTime.now(); }); _load(); }),
          _rangeChip('Last 30 Days', () { setState(() { _from = DateTime.now().subtract(const Duration(days: 30)); _to = DateTime.now(); }); _load(); }),
        ]),
        const SizedBox(height: 16),

        if (_loading) const Center(child: CircularProgressIndicator(color: AppTheme.primary))
        else if (summary != null) ...[
          // Summary cards
          GridView.count(
            crossAxisCount: 2, shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            crossAxisSpacing: 12, mainAxisSpacing: 12, childAspectRatio: 1.3,
            children: [
              StatCard(icon: Icons.currency_rupee_rounded, label: 'Total Revenue',
                value: formatINR(summary['totalRevenue'] ?? 0), color: AppTheme.primary, bg: AppTheme.indigo50),
              StatCard(icon: Icons.receipt_long_rounded, label: 'Invoices',
                value: '${summary['invoiceCount'] ?? 0}', color: AppTheme.emerald, bg: const Color(0xFFECFDF5)),
              StatCard(icon: Icons.local_offer_rounded, label: 'Discounts',
                value: formatINR(summary['totalDiscount'] ?? 0), color: AppTheme.amber, bg: const Color(0xFFFEF3C7)),
              StatCard(icon: Icons.account_balance_rounded, label: 'Total Tax',
                value: formatINR(summary['totalTax'] ?? 0), color: AppTheme.red, bg: const Color(0xFFFEF2F2)),
            ]),
          const SizedBox(height: 16),
          SectionHeader(title: 'Invoices', icon: Icons.receipt_outlined),
          const SizedBox(height: 8),
          ...invoices.map((inv) => _invoiceRow(inv)),
        ],
      ]));
  }

  Widget _datePicker(String label, DateTime value, void Function(DateTime) onPick) =>
    InkWell(
      onTap: () async {
        final d = await showDatePicker(context: context, initialDate: value,
          firstDate: DateTime(2020), lastDate: DateTime.now().add(const Duration(days: 365)));
        if (d != null) onPick(d);
      },
      child: Container(padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppTheme.slate200)),
        child: Row(children: [
          const Icon(Icons.calendar_today_outlined, size: 16, color: AppTheme.slate400),
          const SizedBox(width: 8),
          Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(label, style: const TextStyle(fontSize: 10, color: AppTheme.slate400)),
            Text(formatDate(value.toIso8601String()), style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
          ]),
        ])));

  Widget _rangeChip(String label, VoidCallback onTap) =>
    ActionChip(label: Text(label), onPressed: onTap,
      backgroundColor: AppTheme.indigo50,
      labelStyle: const TextStyle(fontSize: 12, color: AppTheme.primary, fontWeight: FontWeight.w500));

  Widget _invoiceRow(Map inv) => Container(
    margin: const EdgeInsets.only(bottom: 8),
    padding: const EdgeInsets.all(12),
    decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppTheme.slate200)),
    child: Row(children: [
      Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(inv['invoice_no'] ?? '', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, fontFamily: 'monospace')),
        Text(inv['customer'] ?? '', style: const TextStyle(fontSize: 11, color: AppTheme.slate400)),
        Text(formatDate(inv['date']), style: const TextStyle(fontSize: 10, color: AppTheme.slate200)),
      ])),
      Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
        Text(formatINR(inv['total'] ?? 0), style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
        if ((inv['cgst'] as num? ?? 0) > 0) Text('GST: ${formatINR((inv['cgst'] as num? ?? 0) + (inv['sgst'] as num? ?? 0))}',
          style: const TextStyle(fontSize: 10, color: AppTheme.slate400)),
      ]),
    ]));
}

// ── P&L Tab ────────────────────────────────────────────────────────
class _PLTab extends StatefulWidget {
  const _PLTab();
  @override
  State<_PLTab> createState() => _PLState();
}

class _PLState extends State<_PLTab> {
  Map? _data; bool _loading = false;
  DateTime _from = DateTime.now().subtract(const Duration(days: 30));
  DateTime _to   = DateTime.now();

  @override
  void initState() { super.initState(); _load(); }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final res = await api.getPLReport(_from.toIso8601String().substring(0, 10), _to.toIso8601String().substring(0, 10));
      setState(() { _data = res.data as Map?; _loading = false; });
    } catch (_) { setState(() => _loading = false); }
  }

  @override
  Widget build(BuildContext context) {
    final summary = _data?['summary'] as Map?;
    return RefreshIndicator(color: AppTheme.primary, onRefresh: _load,
      child: ListView(padding: const EdgeInsets.all(16), children: [
        Row(children: [
          Expanded(child: _datePicker('From', _from, (d) { setState(() => _from = d); _load(); })),
          const SizedBox(width: 12),
          Expanded(child: _datePicker('To', _to, (d) { setState(() => _to = d); _load(); })),
        ]),
        const SizedBox(height: 16),
        if (_loading) const Center(child: CircularProgressIndicator(color: AppTheme.primary))
        else if (summary != null) ...[
          GridView.count(
            crossAxisCount: 2, shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            crossAxisSpacing: 12, mainAxisSpacing: 12, childAspectRatio: 1.6,
            children: [
              StatCard(icon: Icons.trending_up_rounded, label: 'Total Revenue',
                value: formatINR(summary['totalRevenue'] ?? 0), color: AppTheme.primary, bg: AppTheme.indigo50),
              StatCard(icon: Icons.shopping_bag_outlined, label: 'Total COGS',
                value: formatINR(summary['totalCOGS'] ?? 0), color: AppTheme.red, bg: const Color(0xFFFEF2F2)),
              StatCard(icon: Icons.savings_rounded, label: 'Gross Profit',
                value: formatINR(summary['grossProfit'] ?? 0), color: AppTheme.emerald, bg: const Color(0xFFECFDF5)),
              StatCard(icon: Icons.percent, label: 'Gross Margin',
                value: '${summary['grossMarginPct'] ?? 0}%', color: AppTheme.amber, bg: const Color(0xFFFEF3C7)),
            ]),
          const SizedBox(height: 20),
          // Pie chart
          AppCard(padding: const EdgeInsets.all(16), child: Column(children: [
            const Text('Revenue vs COGS', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700)),
            const SizedBox(height: 16),
            SizedBox(height: 160, child: PieChart(PieChartData(
              sections: [
                PieChartSectionData(value: (summary['totalRevenue'] as num? ?? 0).toDouble(),
                  color: AppTheme.primary, title: 'Revenue', radius: 60, titleStyle: const TextStyle(fontSize: 11, color: Colors.white, fontWeight: FontWeight.bold)),
                PieChartSectionData(value: (summary['totalCOGS'] as num? ?? 0).toDouble(),
                  color: AppTheme.red, title: 'COGS', radius: 60, titleStyle: const TextStyle(fontSize: 11, color: Colors.white, fontWeight: FontWeight.bold)),
              ],
              sectionsSpace: 3, centerSpaceRadius: 40,
            ))),
          ])),
        ],
      ]));
  }

  Widget _datePicker(String label, DateTime value, void Function(DateTime) onPick) =>
    InkWell(
      onTap: () async {
        final d = await showDatePicker(context: context, initialDate: value,
          firstDate: DateTime(2020), lastDate: DateTime.now().add(const Duration(days: 365)));
        if (d != null) onPick(d);
      },
      child: Container(padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppTheme.slate200)),
        child: Row(children: [
          const Icon(Icons.calendar_today_outlined, size: 16, color: AppTheme.slate400),
          const SizedBox(width: 8),
          Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(label, style: const TextStyle(fontSize: 10, color: AppTheme.slate400)),
            Text(formatDate(value.toIso8601String()), style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
          ]),
        ])));
}

// ── GSTR-1 Tab ─────────────────────────────────────────────────────
class _GSTR1Tab extends StatefulWidget {
  const _GSTR1Tab();
  @override
  State<_GSTR1Tab> createState() => _GSTState();
}

class _GSTState extends State<_GSTR1Tab> {
  Map? _data; bool _loading = false;
  int _month = DateTime.now().month;
  int _year  = DateTime.now().year;
  final _months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  @override
  void initState() { super.initState(); _load(); }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final res = await api.getGSTR1(_month, _year);
      setState(() { _data = res.data as Map?; _loading = false; });
    } catch (_) { setState(() => _loading = false); }
  }

  @override
  Widget build(BuildContext context) {
    final totals = _data?['totals'] as Map?;
    final b2b    = (_data?['b2b']  as List?)?.cast<Map>() ?? [];
    final b2c    = _data?['b2c_summary'] as Map?;
    return RefreshIndicator(color: AppTheme.primary, onRefresh: _load,
      child: ListView(padding: const EdgeInsets.all(16), children: [
        // Month + year picker
        Row(children: [
          Expanded(child: InputDecorator(decoration: const InputDecoration(labelText: 'Month'),
            child: DropdownButtonHideUnderline(child: DropdownButton<int>(
              value: _month, isDense: true, isExpanded: true,
              items: List.generate(12, (i) => DropdownMenuItem(value: i+1, child: Text(_months[i]))),
              onChanged: (v) { setState(() => _month = v!); _load(); })))),
          const SizedBox(width: 12),
          Expanded(child: InputDecorator(decoration: const InputDecoration(labelText: 'Year'),
            child: DropdownButtonHideUnderline(child: DropdownButton<int>(
              value: _year, isDense: true, isExpanded: true,
              items: [2024,2025,2026].map((y) => DropdownMenuItem(value: y, child: Text('$y'))).toList(),
              onChanged: (v) { setState(() => _year = v!); _load(); })))),
        ]),
        const SizedBox(height: 16),
        if (_loading) const Center(child: CircularProgressIndicator(color: AppTheme.primary))
        else if (totals != null) ...[
          GridView.count(
            crossAxisCount: 2, shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            crossAxisSpacing: 12, mainAxisSpacing: 12, childAspectRatio: 1.3,
            children: [
              StatCard(icon: Icons.receipt_long_rounded, label: 'Total Invoices', value: '${totals['totalInvoices'] ?? 0}', color: AppTheme.primary, bg: AppTheme.indigo50),
              StatCard(icon: Icons.currency_rupee_rounded, label: 'Total Tax', value: formatINR(totals['totalTax'] ?? 0), color: AppTheme.red, bg: const Color(0xFFFEF2F2)),
              StatCard(icon: Icons.storefront_rounded, label: 'CGST', value: formatINR(totals['totalCGST'] ?? 0), color: AppTheme.amber, bg: const Color(0xFFFEF3C7)),
              StatCard(icon: Icons.storefront_rounded, label: 'SGST', value: formatINR(totals['totalSGST'] ?? 0), color: AppTheme.emerald, bg: const Color(0xFFECFDF5)),
            ]),
          const SizedBox(height: 16),
          if (b2c != null) ...[
            SectionHeader(title: 'B2C Summary', icon: Icons.people_outline),
            const SizedBox(height: 8),
            AppCard(child: Column(children: [
              InfoRow(label: 'Invoices', value: '${b2c['total_invoices'] ?? 0}'),
              const AppDivider(),
              InfoRow(label: 'Taxable Value', value: formatINR(b2c['taxable_value'] ?? 0)),
              const AppDivider(),
              InfoRow(label: 'Total Tax', value: formatINR((b2c['cgst'] as num? ?? 0) + (b2c['sgst'] as num? ?? 0))),
            ])),
            const SizedBox(height: 16),
          ],
          if (b2b.isNotEmpty) ...[
            SectionHeader(title: 'B2B Invoices (${b2b.length})', icon: Icons.business_outlined),
            const SizedBox(height: 8),
            ...b2b.map((row) => Container(
              margin: const EdgeInsets.only(bottom: 8),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppTheme.slate200)),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Row(children: [
                  Expanded(child: Text(row['invoice_no'] ?? '', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, fontFamily: 'monospace'))),
                  Text(formatINR(row['invoice_value'] ?? 0), style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
                ]),
                const SizedBox(height: 4),
                Text(row['customer'] ?? '', style: const TextStyle(fontSize: 11, color: AppTheme.slate400)),
                Text('GSTIN: ${row['gstin'] ?? ''}', style: const TextStyle(fontSize: 11, color: AppTheme.primary)),
                const SizedBox(height: 4),
                Row(children: [
                  _taxChip('CGST: ${formatINR(row['cgst'] ?? 0)}', AppTheme.amber),
                  const SizedBox(width: 6),
                  _taxChip('SGST: ${formatINR(row['sgst'] ?? 0)}', AppTheme.emerald),
                  if ((row['igst'] as num? ?? 0) > 0) ...[const SizedBox(width: 6), _taxChip('IGST: ${formatINR(row['igst'] ?? 0)}', AppTheme.red)],
                ]),
              ]))),
          ],
        ],
      ]));
  }

  Widget _taxChip(String text, Color color) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
    decoration: BoxDecoration(color: color.withOpacity(0.1), borderRadius: BorderRadius.circular(20)),
    child: Text(text, style: TextStyle(fontSize: 10, color: color, fontWeight: FontWeight.w600)));
}

// ── Top Products Tab ───────────────────────────────────────────────
class _TopProductsTab extends ConsumerWidget {
  const _TopProductsTab();
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final products = ref.watch(topProductsProvider);
    return products.when(
      loading: () => const Center(child: CircularProgressIndicator(color: AppTheme.primary)),
      error: (e, _) => ErrorState(msg: errorMessage(e), onRetry: () => ref.invalidate(topProductsProvider)),
      data: (list) => RefreshIndicator(color: AppTheme.primary,
        onRefresh: () => ref.refresh(topProductsProvider.future),
        child: list.isEmpty
            ? const EmptyState(icon: Icons.bar_chart_outlined, title: 'No sales data', subtitle: 'Create some invoices to see top products')
            : ListView(padding: const EdgeInsets.all(16), children: [
                SectionHeader(title: 'Best Sellers', icon: Icons.emoji_events_rounded),
                const SizedBox(height: 12),
                ...list.asMap().entries.map((e) {
                  final item  = e.value;
                  final rank  = e.key + 1;
                  final maxRev = (list.first['revenue'] as num? ?? 1).toDouble();
                  final rev   = (item['revenue'] as num? ?? 0).toDouble();
                  final ratio = maxRev > 0 ? rev / maxRev : 0.0;
                  return Container(
                    margin: const EdgeInsets.only(bottom: 10),
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: AppTheme.slate200)),
                    child: Row(children: [
                      Container(width: 32, height: 32,
                        decoration: BoxDecoration(
                          color: rank <= 3 ? [const Color(0xFFFFD700), const Color(0xFFC0C0C0), const Color(0xFFCD7F32)][rank-1].withOpacity(0.2) : AppTheme.slate100,
                          borderRadius: BorderRadius.circular(8)),
                        child: Center(child: Text('#$rank', style: TextStyle(
                          fontSize: 12, fontWeight: FontWeight.bold,
                          color: rank <= 3 ? [const Color(0xFFB8860B), const Color(0xFF808080), const Color(0xFF8B4513)][rank-1] : AppTheme.slate400)))),
                      const SizedBox(width: 12),
                      Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Text(item['name'] ?? '', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600), maxLines: 1, overflow: TextOverflow.ellipsis),
                        const SizedBox(height: 6),
                        ClipRRect(borderRadius: BorderRadius.circular(4),
                          child: LinearProgressIndicator(value: ratio, minHeight: 4, backgroundColor: AppTheme.slate100, color: AppTheme.primary)),
                        const SizedBox(height: 4),
                        Text('${item['qty']} ${item['unit'] ?? 'Pcs'} sold', style: const TextStyle(fontSize: 11, color: AppTheme.slate400)),
                      ])),
                      const SizedBox(width: 12),
                      Text(formatINR(item['revenue'] ?? 0), style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppTheme.primary)),
                    ]));
                }),
              ])),
    );
  }
}

// ── Low Stock Tab ──────────────────────────────────────────────────
class _LowStockTab extends ConsumerWidget {
  const _LowStockTab();
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final items = ref.watch(lowStockReportProvider);
    return items.when(
      loading: () => const Center(child: CircularProgressIndicator(color: AppTheme.primary)),
      error: (e, _) => ErrorState(msg: errorMessage(e), onRetry: () => ref.invalidate(lowStockReportProvider)),
      data: (list) => RefreshIndicator(color: AppTheme.primary,
        onRefresh: () => ref.refresh(lowStockReportProvider.future),
        child: list.isEmpty
            ? const EmptyState(icon: Icons.check_circle_outline, title: 'All stock levels healthy!', subtitle: 'No products below minimum threshold')
            : ListView(padding: const EdgeInsets.all(16), children: [
                SectionHeader(title: 'Reorder List (${list.length})', icon: Icons.warning_amber_rounded),
                const SizedBox(height: 12),
                ...list.map((item) => Container(
                  margin: const EdgeInsets.only(bottom: 10),
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: AppTheme.slate200)),
                  child: Row(children: [
                    Container(width: 44, height: 44,
                      decoration: BoxDecoration(color: const Color(0xFFFEF3C7), borderRadius: BorderRadius.circular(12)),
                      child: const Icon(Icons.warning_amber_rounded, color: AppTheme.amber, size: 22)),
                    const SizedBox(width: 12),
                    Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Text(item['name'] ?? '', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600), maxLines: 1, overflow: TextOverflow.ellipsis),
                      Text('${item['category'] ?? 'Uncategorized'} • ${item['sku'] ?? '—'}', style: const TextStyle(fontSize: 11, color: AppTheme.slate400)),
                      const SizedBox(height: 6),
                      Row(children: [
                        _stockChip('Current: ${item['stock_qty']} ${item['unit']}', AppTheme.red),
                        const SizedBox(width: 6),
                        _stockChip('Min: ${item['min_threshold']} ${item['unit']}', AppTheme.slate400),
                      ]),
                    ])),
                    const SizedBox(width: 12),
                    Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
                      Text('Order', style: const TextStyle(fontSize: 10, color: AppTheme.slate400)),
                      Text('${item['to_order']} ${item['unit']}', style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppTheme.amber)),
                      Text(formatINR(item['reorder_value'] ?? 0), style: const TextStyle(fontSize: 11, color: AppTheme.slate400)),
                    ]),
                  ]))),
              ])),
    );
  }

  Widget _stockChip(String text, Color color) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
    decoration: BoxDecoration(color: color.withOpacity(0.1), borderRadius: BorderRadius.circular(20)),
    child: Text(text, style: TextStyle(fontSize: 10, color: color, fontWeight: FontWeight.w600)));
}
