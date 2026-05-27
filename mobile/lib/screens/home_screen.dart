import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../providers/auth_provider.dart';
import '../providers/inventory_provider.dart';
import 'inventory_screen.dart';
import 'invoice_screen.dart';
import 'scanner_screen.dart';
import 'login_screen.dart';

class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  int _currentIndex = 0;

  final List<Widget> _screens = const [
    _DashboardTab(),
    InventoryScreen(),
    InvoiceScreen(),
    ScannerScreen(),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(index: _currentIndex, children: _screens),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _currentIndex,
        onTap: (i) => setState(() => _currentIndex = i),
        items: const [
          BottomNavigationBarItem(
            icon: Icon(Icons.dashboard_outlined),
            activeIcon: Icon(Icons.dashboard_rounded),
            label: 'Home',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.inventory_2_outlined),
            activeIcon: Icon(Icons.inventory_2_rounded),
            label: 'Inventory',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.receipt_long_outlined),
            activeIcon: Icon(Icons.receipt_long_rounded),
            label: 'Invoices',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.qr_code_scanner_outlined),
            activeIcon: Icon(Icons.qr_code_scanner),
            label: 'Scanner',
          ),
        ],
      ),
    );
  }
}

// ── Dashboard Tab ─────────────────────────────────────────────────
class _DashboardTab extends ConsumerWidget {
  const _DashboardTab();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth      = ref.watch(authProvider);
    final dashboard = ref.watch(dashboardProvider);
    final fmtINR    = NumberFormat.currency(locale: 'en_IN', symbol: '₹', decimalDigits: 0);

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              auth.business?['name'] ?? 'InventoSmart',
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
            ),
            Text(
              'Good ${_greeting()}, ${(auth.user?['name'] ?? 'Admin').split(' ').first}',
              style: const TextStyle(fontSize: 12, color: Color(0xFF64748B), fontWeight: FontWeight.normal),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout_rounded),
            onPressed: () async {
              await ref.read(authProvider.notifier).logout();
              if (context.mounted) {
                Navigator.of(context).pushReplacement(
                  MaterialPageRoute(builder: (_) => const LoginScreen()),
                );
              }
            },
          ),
        ],
      ),
      body: RefreshIndicator(
        color: const Color(0xFF6366F1),
        onRefresh: () => ref.refresh(dashboardProvider.future),
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(16),
          child: dashboard.when(
            loading: () => const _DashboardSkeleton(),
            error:   (e, _) => _ErrorWidget(message: e.toString(), onRetry: () => ref.refresh(dashboardProvider.future)),
            data: (data) {
              final stats   = (data['stats'] as Map?)   ?? {};
              final weekly  = (data['weeklyData'] as List?) ?? [];
              final recent  = (data['recentInvoices'] as List?) ?? [];

              return Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // ── Stat Cards ──
                  GridView.count(
                    crossAxisCount:   2,
                    shrinkWrap:       true,
                    physics:          const NeverScrollableScrollPhysics(),
                    crossAxisSpacing: 12,
                    mainAxisSpacing:  12,
                    childAspectRatio: 1.6,
                    children: [
                      _StatCard(
                        icon:  Icons.currency_rupee_rounded,
                        label: "Today's Sales",
                        value: fmtINR.format(stats['todaySales'] ?? 0),
                        color: const Color(0xFF6366F1),
                        bg:    const Color(0xFFEEF2FF),
                      ),
                      _StatCard(
                        icon:  Icons.inventory_2_rounded,
                        label: 'Products',
                        value: '${stats['totalProducts'] ?? 0}',
                        color: const Color(0xFF10B981),
                        bg:    const Color(0xFFECFDF5),
                      ),
                      _StatCard(
                        icon:  Icons.receipt_long_rounded,
                        label: 'Pending',
                        value: '${stats['pendingInvoices'] ?? 0}',
                        color: const Color(0xFFF59E0B),
                        bg:    const Color(0xFFFEF3C7),
                      ),
                      _StatCard(
                        icon:  Icons.warning_amber_rounded,
                        label: 'Low Stock',
                        value: '${stats['lowStockCount'] ?? 0}',
                        color: const Color(0xFFEF4444),
                        bg:    const Color(0xFFFEF2F2),
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),

                  // ── Weekly Sales Chart ──
                  if (weekly.isNotEmpty) ...[
                    _SectionHeader(title: 'Weekly Sales', icon: Icons.bar_chart_rounded),
                    const SizedBox(height: 12),
                    _WeeklyChart(weekly: weekly.cast<Map>()),
                    const SizedBox(height: 24),
                  ],

                  // ── Recent Invoices ──
                  if (recent.isNotEmpty) ...[
                    _SectionHeader(title: 'Recent Invoices', icon: Icons.receipt_outlined),
                    const SizedBox(height: 12),
                    ...recent.take(5).map(
                      (inv) => _InvoiceTile(invoice: inv as Map, fmtINR: fmtINR),
                    ),
                  ],
                ],
              );
            },
          ),
        ),
      ),
    );
  }

  String _greeting() {
    final h = DateTime.now().hour;
    if (h < 12) return 'morning';
    if (h < 17) return 'afternoon';
    return 'evening';
  }
}

// ── Stat Card ──────────────────────────────────────────────────────
class _StatCard extends StatelessWidget {
  final IconData icon;
  final String   label, value;
  final Color    color, bg;

  const _StatCard({
    required this.icon, required this.label,
    required this.value, required this.color, required this.bg,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color:        Colors.white,
        borderRadius: BorderRadius.circular(16),
        border:       Border.all(color: const Color(0xFFE2E8F0)),
      ),
      padding: const EdgeInsets.all(14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 36, height: 36,
            decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(10)),
            child: Icon(icon, color: color, size: 20),
          ),
          const Spacer(),
          Text(value,
            style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: color),
            maxLines: 1, overflow: TextOverflow.ellipsis,
          ),
          const SizedBox(height: 2),
          Text(label, style: const TextStyle(fontSize: 11, color: Color(0xFF94A3B8))),
        ],
      ),
    );
  }
}

// ── Weekly Chart (simple bar) ──────────────────────────────────────
class _WeeklyChart extends StatelessWidget {
  final List<Map> weekly;
  const _WeeklyChart({required this.weekly});

  @override
  Widget build(BuildContext context) {
    final maxVal = weekly.map((e) => (e['sales'] as num? ?? 0).toDouble()).fold(0.0, (a, b) => a > b ? a : b);
    if (maxVal == 0) return const SizedBox.shrink();

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      padding: const EdgeInsets.all(16),
      child: SizedBox(
        height: 120,
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: weekly.map((e) {
            final sales = (e['sales'] as num? ?? 0).toDouble();
            final ratio = maxVal > 0 ? sales / maxVal : 0.0;
            return Expanded(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 3),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    AnimatedContainer(
                      duration: const Duration(milliseconds: 600),
                      curve:    Curves.easeOut,
                      height:   80 * ratio,
                      decoration: BoxDecoration(
                        color:        ratio > 0.7
                            ? const Color(0xFF6366F1)
                            : const Color(0xFF6366F1).withOpacity(0.4),
                        borderRadius: BorderRadius.circular(6),
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(e['day'] ?? '',
                      style: const TextStyle(fontSize: 10, color: Color(0xFF94A3B8))),
                  ],
                ),
              ),
            );
          }).toList(),
        ),
      ),
    );
  }
}

// ── Invoice Tile ───────────────────────────────────────────────────
class _InvoiceTile extends StatelessWidget {
  final Map        invoice;
  final NumberFormat fmtINR;
  const _InvoiceTile({required this.invoice, required this.fmtINR});

  Color _statusColor(String? s) {
    switch (s) {
      case 'PAID':      return const Color(0xFF10B981);
      case 'SENT':      return const Color(0xFF3B82F6);
      case 'CANCELLED': return const Color(0xFFEF4444);
      default:          return const Color(0xFF94A3B8);
    }
  }

  @override
  Widget build(BuildContext context) {
    final status   = invoice['status'] as String? ?? 'DRAFT';
    final customer = invoice['customer'] as Map?;

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      decoration: BoxDecoration(
        color:        Colors.white,
        borderRadius: BorderRadius.circular(12),
        border:       Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
        leading: Container(
          width: 40, height: 40,
          decoration: BoxDecoration(
            color:        const Color(0xFFEEF2FF),
            borderRadius: BorderRadius.circular(10),
          ),
          child: const Icon(Icons.receipt_long_rounded, color: Color(0xFF6366F1), size: 20),
        ),
        title: Text(
          invoice['invoice_no'] ?? '',
          style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, fontFamily: 'monospace'),
        ),
        subtitle: Text(
          customer?['name'] ?? 'Customer',
          style: const TextStyle(fontSize: 12, color: Color(0xFF64748B)),
        ),
        trailing: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Text(
              fmtINR.format(invoice['total'] ?? 0),
              style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
            ),
            const SizedBox(height: 4),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
              decoration: BoxDecoration(
                color:        _statusColor(status).withOpacity(0.12),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Text(
                status,
                style: TextStyle(fontSize: 10, color: _statusColor(status), fontWeight: FontWeight.w600),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Section Header ─────────────────────────────────────────────────
class _SectionHeader extends StatelessWidget {
  final String title;
  final IconData icon;
  const _SectionHeader({required this.title, required this.icon});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, size: 18, color: const Color(0xFF6366F1)),
        const SizedBox(width: 8),
        Text(title, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: Color(0xFF0F172A))),
      ],
    );
  }
}

// ── Dashboard Skeleton ─────────────────────────────────────────────
class _DashboardSkeleton extends StatelessWidget {
  const _DashboardSkeleton();

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        GridView.count(
          crossAxisCount: 2, shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          crossAxisSpacing: 12, mainAxisSpacing: 12,
          childAspectRatio: 1.6,
          children: List.generate(4, (_) => _shimmer(height: 80)),
        ),
        const SizedBox(height: 16),
        _shimmer(height: 160),
      ],
    );
  }

  Widget _shimmer({required double height}) => Container(
    height: height,
    decoration: BoxDecoration(
      color:        const Color(0xFFE2E8F0),
      borderRadius: BorderRadius.circular(16),
    ),
  );
}

// ── Error Widget ───────────────────────────────────────────────────
class _ErrorWidget extends StatelessWidget {
  final String message;
  final VoidCallback onRetry;
  const _ErrorWidget({required this.message, required this.onRetry});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.wifi_off_rounded, size: 48, color: Color(0xFFCBD5E1)),
            const SizedBox(height: 16),
            const Text('Failed to load data', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: Color(0xFF475569))),
            const SizedBox(height: 8),
            Text('Check if backend is running', style: const TextStyle(fontSize: 13, color: Color(0xFF94A3B8))),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: onRetry,
              icon: const Icon(Icons.refresh_rounded, size: 18),
              label: const Text('Retry'),
            ),
          ],
        ),
      ),
    );
  }
}