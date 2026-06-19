import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../utils/app_theme.dart';
import 'home_screen.dart';
import 'inventory_screen.dart';
import 'billing_screen.dart';
import 'customers_screen.dart';
import 'vendors_screen.dart';
import 'reports_screen.dart';
import 'settings_screen.dart';

final _navIndexProvider = StateProvider<int>((ref) => 0);

class MainShell extends ConsumerWidget {
  const MainShell({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final idx = ref.watch(_navIndexProvider);

    final screens = [
      const HomeScreen(),
      const InventoryScreen(),
      const BillingScreen(),
      const CustomersScreen(),
      const VendorsScreen(),
      const ReportsScreen(),
      const SettingsScreen(),
    ];

    return Scaffold(
      body: IndexedStack(index: idx, children: screens),
      bottomNavigationBar: _AppBottomNav(
        currentIndex: idx,
        onTap: (i) => ref.read(_navIndexProvider.notifier).state = i,
      ),
    );
  }
}

class _AppBottomNav extends StatelessWidget {
  final int currentIndex;
  final void Function(int) onTap;
  const _AppBottomNav({required this.currentIndex, required this.onTap});

  @override
  Widget build(BuildContext context) {
    // Bottom nav has 5 primary items; Reports & Settings via more menu
    final items = [
      _NavItem(icon: Icons.dashboard_outlined,     active: Icons.dashboard_rounded,      label: 'Home'),
      _NavItem(icon: Icons.inventory_2_outlined,   active: Icons.inventory_2_rounded,    label: 'Inventory'),
      _NavItem(icon: Icons.receipt_long_outlined,  active: Icons.receipt_long_rounded,   label: 'Billing'),
      _NavItem(icon: Icons.people_outline,         active: Icons.people_rounded,         label: 'Customers'),
      _NavItem(icon: Icons.more_horiz,             active: Icons.more_horiz,             label: 'More'),
    ];

    // Map bottom nav idx to screen idx
    // 0=Home,1=Inventory,2=Billing,3=Customers,4=More(shows popup)
    final screenIdx = currentIndex < 4 ? currentIndex : currentIndex;

    return Container(
      decoration: const BoxDecoration(
        color: AppTheme.white,
        border: Border(top: BorderSide(color: AppTheme.slate100)),
        boxShadow: [BoxShadow(color: Color(0x0A000000), blurRadius: 16, offset: Offset(0, -4))],
      ),
      child: SafeArea(
        child: SizedBox(
          height: 60,
          child: Row(
            children: List.generate(items.length, (i) {
              final item       = items[i];
              final isActive   = i == 4
                  ? currentIndex >= 4
                  : currentIndex == i;
              final color      = isActive ? AppTheme.primary : AppTheme.slate400;

              return Expanded(
                child: InkWell(
                  onTap: () {
                    if (i == 4) {
                      _showMoreMenu(context, (idx) => onTap(idx));
                    } else {
                      onTap(i);
                    }
                  },
                  child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                    Icon(isActive ? item.active : item.icon, color: color, size: 22),
                    const SizedBox(height: 3),
                    Text(item.label, style: TextStyle(fontSize: 10, color: color,
                      fontWeight: isActive ? FontWeight.w600 : FontWeight.normal)),
                  ]),
                ),
              );
            }),
          ),
        ),
      ),
    );
  }

  void _showMoreMenu(BuildContext context, void Function(int) onSelect) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (_) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 8),
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          Container(width: 36, height: 4, margin: const EdgeInsets.only(bottom: 12),
            decoration: BoxDecoration(color: AppTheme.slate200, borderRadius: BorderRadius.circular(2))),
          const Padding(padding: EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Align(alignment: Alignment.centerLeft,
              child: Text('More', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppTheme.slate800)))),
          _MoreItem(icon: Icons.local_shipping_outlined, label: 'Vendors',  onTap: () { Navigator.pop(context); onSelect(4); }),
          _MoreItem(icon: Icons.bar_chart_rounded,       label: 'Reports',  onTap: () { Navigator.pop(context); onSelect(5); }),
          _MoreItem(icon: Icons.settings_outlined,       label: 'Settings', onTap: () { Navigator.pop(context); onSelect(6); }),
          const SizedBox(height: 8),
        ]),
      ),
    );
  }
}

class _NavItem { final IconData icon, active; final String label; const _NavItem({required this.icon, required this.active, required this.label}); }

class _MoreItem extends StatelessWidget {
  final IconData icon; final String label; final VoidCallback onTap;
  const _MoreItem({required this.icon, required this.label, required this.onTap});
  @override
  Widget build(BuildContext context) => ListTile(
    leading: Container(width:40, height:40,
      decoration: BoxDecoration(color: AppTheme.indigo50, borderRadius: BorderRadius.circular(12)),
      child: Icon(icon, color: AppTheme.primary, size: 20)),
    title: Text(label, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500)),
    trailing: const Icon(Icons.chevron_right_rounded, color: AppTheme.slate400),
    onTap: onTap,
  );
}