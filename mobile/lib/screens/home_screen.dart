import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:fl_chart/fl_chart.dart';
import '../providers/app_providers.dart';
import '../utils/app_theme.dart';
import '../utils/helpers.dart';
import '../widgets/common_widgets.dart';

class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth      = ref.watch(authProvider);
    final dashboard = ref.watch(dashboardProvider);

    return Scaffold(
      appBar: AppBar(
        title: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(auth.business?['name'] ?? 'InventoSmart',
            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
          Text('Good ${greeting()}, ${(auth.user?['name'] ?? 'Admin').split(' ').first}',
            style: const TextStyle(fontSize: 12, color: AppTheme.slate400, fontWeight: FontWeight.normal)),
        ]),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout_rounded),
            onPressed: () => ref.read(authProvider.notifier).logout(),
          ),
        ],
      ),
      body: RefreshIndicator(
        color: AppTheme.primary,
        onRefresh: () => ref.refresh(dashboardProvider.future),
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(16),
          child: dashboard.when(
            loading: () => const _Skeleton(),
            error: (e, _) => ErrorState(msg: errorMessage(e), onRetry: () => ref.refresh(dashboardProvider.future)),
            data: (data) {
              final stats  = (data['stats']  as Map?) ?? {};
              final weekly = (data['weeklyData'] as List?) ?? [];
              final recent = (data['recentInvoices'] as List?) ?? [];

              return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                // Stats grid
                GridView.count(
                  crossAxisCount: 2, shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  crossAxisSpacing: 12, mainAxisSpacing: 12,
                  childAspectRatio: 1.2,
                  children: [
                    StatCard(icon: Icons.currency_rupee_rounded, label: "Today's Sales",
                      value: formatINR(stats['todaySales'] ?? 0), color: AppTheme.primary, bg: AppTheme.indigo50,
                      sub: 'vs yesterday'),
                    StatCard(icon: Icons.inventory_2_rounded, label: 'Total Products',
                      value: '${stats['totalProducts'] ?? 0}', color: AppTheme.emerald, bg: const Color(0xFFECFDF5)),
                    StatCard(icon: Icons.receipt_long_rounded, label: 'Pending Invoices',
                      value: '${stats['pendingInvoices'] ?? 0}', color: AppTheme.amber, bg: const Color(0xFFFEF3C7)),
                    StatCard(icon: Icons.warning_amber_rounded, label: 'Low Stock',
                      value: '${stats['lowStockCount'] ?? 0}', color: AppTheme.red, bg: const Color(0xFFFEF2F2)),
                  ],
                ),
                const SizedBox(height: 24),

                // Weekly Sales Chart
                if (weekly.isNotEmpty) ...[
                  SectionHeader(title: 'Weekly Sales', icon: Icons.bar_chart_rounded),
                  const SizedBox(height: 12),
                  AppCard(
                    padding: const EdgeInsets.fromLTRB(12, 16, 16, 8),
                    child: SizedBox(
                      height: 160,
                      child: _WeeklyChart(weekly: weekly.cast<Map>()),
                    ),
                  ),
                  const SizedBox(height: 24),
                ],

                // Low Stock alerts
                if ((stats['lowStockCount'] ?? 0) > 0) ...[
                  SectionHeader(title: 'Low Stock Alerts', icon: Icons.warning_amber_rounded),
                  const SizedBox(height: 12),
                  _LowStockWidget(ref: ref),
                  const SizedBox(height: 24),
                ],

                // Recent Invoices
                if (recent.isNotEmpty) ...[
                  SectionHeader(title: 'Recent Invoices', icon: Icons.receipt_outlined),
                  const SizedBox(height: 12),
                  ...recent.take(5).map((inv) => _InvoiceRow(inv: inv as Map)),
                ],
              ]);
            },
          ),
        ),
      ),
    );
  }
}

// ── Weekly Chart ───────────────────────────────────────────────────
class _WeeklyChart extends StatelessWidget {
  final List<Map> weekly;
  const _WeeklyChart({required this.weekly});

  @override
  Widget build(BuildContext context) {
    final maxVal = weekly.map((e) => (e['sales'] as num? ?? 0).toDouble()).fold(0.0, (a, b) => a > b ? a : b);

    return BarChart(BarChartData(
      maxY:          maxVal * 1.2,
      gridData:      FlGridData(show: true, drawVerticalLine: false,
        getDrawingHorizontalLine: (_) => const FlLine(color: AppTheme.slate100, strokeWidth: 1)),
      borderData:    FlBorderData(show: false),
      titlesData: FlTitlesData(
        leftTitles:   const AxisTitles(sideTitles: SideTitles(showTitles: false)),
        rightTitles:  const AxisTitles(sideTitles: SideTitles(showTitles: false)),
        topTitles:    const AxisTitles(sideTitles: SideTitles(showTitles: false)),
        bottomTitles: AxisTitles(sideTitles: SideTitles(
          showTitles: true, reservedSize: 28,
          getTitlesWidget: (val, meta) {
            final i = val.toInt();
            if (i < 0 || i >= weekly.length) return const SizedBox.shrink();
            return Padding(padding: const EdgeInsets.only(top: 6),
              child: Text(weekly[i]['day'] ?? '', style: const TextStyle(fontSize: 10, color: AppTheme.slate400)));
          },
        )),
      ),
      barGroups: weekly.asMap().entries.map((e) {
        final sales = (e.value['sales'] as num? ?? 0).toDouble();
        return BarChartGroupData(x: e.key, barRods: [
          BarChartRodData(
            toY:         sales,
            color:       AppTheme.primary,
            width:       20,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(6)),
            gradient: const LinearGradient(colors: [Color(0xFF818CF8), AppTheme.primary],
              begin: Alignment.topCenter, end: Alignment.bottomCenter),
          ),
        ]);
      }).toList(),
      barTouchData: BarTouchData(
        touchTooltipData: BarTouchTooltipData(
          getTooltipItem: (group, _, rod, __) => BarTooltipItem(
            formatINR(rod.toY),
            const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold),
          ),
        ),
      ),
    ));
  }
}

// ── Low Stock Widget ───────────────────────────────────────────────
class _LowStockWidget extends StatelessWidget {
  final WidgetRef ref;
  const _LowStockWidget({required this.ref});

  @override
  Widget build(BuildContext context) {
    final low = ref.watch(lowStockReportProvider);
    return low.when(
      loading: () => const Skeleton(height: 80),
      error:   (_, __) => const SizedBox.shrink(),
      data: (items) => AppCard(
        padding: EdgeInsets.zero,
        child: Column(
          children: items.take(4).map((item) => ListTile(
            dense: true,
            leading: Container(width:36, height:36,
              decoration: BoxDecoration(color: const Color(0xFFFEF3C7), borderRadius: BorderRadius.circular(10)),
              child: const Icon(Icons.warning_amber_rounded, color: AppTheme.amber, size: 18)),
            title: Text(item['name'] ?? '', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
            subtitle: Text('Min: ${item['min_threshold']} ${item['unit']}',
              style: const TextStyle(fontSize: 11, color: AppTheme.slate400)),
            trailing: Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(color: const Color(0xFFFEF2F2), borderRadius: BorderRadius.circular(8)),
              child: Text('${item['stock_qty']} left',
                style: const TextStyle(fontSize: 11, color: AppTheme.red, fontWeight: FontWeight.w700)),
            ),
          )).toList(),
        ),
      ),
    );
  }
}

// ── Invoice Row ────────────────────────────────────────────────────
class _InvoiceRow extends StatelessWidget {
  final Map inv;
  const _InvoiceRow({required this.inv});

  @override
  Widget build(BuildContext context) {
    final status   = inv['status'] as String? ?? 'DRAFT';
    final customer = inv['customer'] as Map?;
    return AppCard(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      child: Row(children: [
        Container(width:40, height:40,
          decoration: BoxDecoration(color: AppTheme.indigo50, borderRadius: BorderRadius.circular(12)),
          child: const Icon(Icons.receipt_long_rounded, color: AppTheme.primary, size: 20)),
        const SizedBox(width: 12),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(inv['invoice_no'] ?? '', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, fontFamily: 'monospace')),
          Text(customer?['name'] ?? '', style: const TextStyle(fontSize: 12, color: AppTheme.slate400)),
        ])),
        Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
          Text(formatINR(inv['total'] ?? 0), style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold)),
          const SizedBox(height: 4),
          StatusBadge(status),
        ]),
      ]),
    );
  }
}

// ── Skeleton ───────────────────────────────────────────────────────
class _Skeleton extends StatelessWidget {
  const _Skeleton();
  @override
  Widget build(BuildContext context) => Column(children: [
    GridView.count(crossAxisCount: 2, shrinkWrap: true, physics: const NeverScrollableScrollPhysics(),
      crossAxisSpacing: 12, mainAxisSpacing: 12,mainAxisExtent: 110,
      children: List.generate(4, (_) => const Skeleton(height: 80, radius: 16))),
    const SizedBox(height: 16),
    const Skeleton(height: 180, radius: 16),
  ]);
}