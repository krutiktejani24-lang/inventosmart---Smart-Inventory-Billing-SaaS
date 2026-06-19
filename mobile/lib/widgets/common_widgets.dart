import 'package:flutter/material.dart';
import '../utils/app_theme.dart';

// ── Stat Card (Dashboard) ──────────────────────────────────────────
class StatCard extends StatelessWidget {
  final IconData icon;
  final String   label, value;
  final Color    color, bg;
  final String?  sub;

  const StatCard({super.key,
    required this.icon, required this.label,
    required this.value, required this.color, required this.bg,
    this.sub,
  });

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(14),
    decoration: BoxDecoration(
      color:        AppTheme.white,
      borderRadius: BorderRadius.circular(16),
      border:       Border.all(color: AppTheme.slate200),
    ),
    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Container(width:36, height:36,
        decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(10)),
        child: Icon(icon, color: color, size: 20)),
      const Spacer(),
      Text(value, style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: color),
        maxLines: 1, overflow: TextOverflow.ellipsis),
      const SizedBox(height: 2),
      Text(label, style: const TextStyle(fontSize: 11, color: AppTheme.slate400)),
      if (sub != null) Text(sub!, style: const TextStyle(fontSize: 10, color: AppTheme.slate400)),
    ]),
  );
}

// ── Status Badge ───────────────────────────────────────────────────
class StatusBadge extends StatelessWidget {
  final String status;
  const StatusBadge(this.status, {super.key});

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
    decoration: BoxDecoration(
      color:        status.statusBg,
      borderRadius: BorderRadius.circular(20),
    ),
    child: Text(status,
      style: TextStyle(fontSize: 10, color: status.statusColor, fontWeight: FontWeight.w700)),
  );
}

// ── Section Header ─────────────────────────────────────────────────
class SectionHeader extends StatelessWidget {
  final String   title;
  final IconData icon;
  final Widget?  trailing;
  const SectionHeader({super.key, required this.title, required this.icon, this.trailing});

  @override
  Widget build(BuildContext context) => Row(children: [
    Icon(icon, size: 18, color: AppTheme.primary),
    const SizedBox(width: 8),
    Text(title, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: AppTheme.slate800)),
    const Spacer(),
    if (trailing != null) trailing!,
  ]);
}

// ── Loading skeleton ───────────────────────────────────────────────
class Skeleton extends StatelessWidget {
  final double height, width, radius;
  const Skeleton({super.key, this.height = 16, this.width = double.infinity, this.radius = 8});

  @override
  Widget build(BuildContext context) => Container(
    height: height, width: width,
    decoration: BoxDecoration(color: AppTheme.slate200, borderRadius: BorderRadius.circular(radius)),
  );
}

// ── Empty state ────────────────────────────────────────────────────
class EmptyState extends StatelessWidget {
  final IconData icon;
  final String   title, subtitle;
  final Widget?  action;
  const EmptyState({super.key, required this.icon, required this.title, required this.subtitle, this.action});

  @override
  Widget build(BuildContext context) => Center(child: Padding(
    padding: const EdgeInsets.all(32),
    child: Column(mainAxisSize: MainAxisSize.min, children: [
      Icon(icon, size: 64, color: AppTheme.slate200),
      const SizedBox(height: 16),
      Text(title, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: AppTheme.slate600)),
      const SizedBox(height: 8),
      Text(subtitle, style: const TextStyle(fontSize: 13, color: AppTheme.slate400), textAlign: TextAlign.center),
      if (action != null) ...[const SizedBox(height: 20), action!],
    ]),
  ));
}

// ── Error state ────────────────────────────────────────────────────
class ErrorState extends StatelessWidget {
  final String msg;
  final VoidCallback onRetry;
  const ErrorState({super.key, required this.msg, required this.onRetry});

  @override
  Widget build(BuildContext context) => Center(child: Padding(
    padding: const EdgeInsets.all(32),
    child: Column(mainAxisSize: MainAxisSize.min, children: [
      const Icon(Icons.wifi_off_rounded, size: 48, color: AppTheme.slate200),
      const SizedBox(height: 16),
      const Text('Connection failed', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: AppTheme.slate600)),
      const SizedBox(height: 8),
      Text(msg, style: const TextStyle(fontSize: 12, color: AppTheme.slate400), textAlign: TextAlign.center),
      const SizedBox(height: 20),
      ElevatedButton.icon(onPressed: onRetry, icon: const Icon(Icons.refresh_rounded, size: 18), label: const Text('Retry')),
    ]),
  ));
}

// ── Info row ───────────────────────────────────────────────────────
class InfoRow extends StatelessWidget {
  final String label, value;
  final Color? valueColor;
  const InfoRow({super.key, required this.label, required this.value, this.valueColor});

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 6),
    child: Row(children: [
      Text(label, style: const TextStyle(fontSize: 13, color: AppTheme.slate400)),
      const Spacer(),
      Text(value, style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600,
        color: valueColor ?? AppTheme.slate800)),
    ]),
  );
}

// ── Divider ────────────────────────────────────────────────────────
class AppDivider extends StatelessWidget {
  const AppDivider({super.key});
  @override
  Widget build(BuildContext context) => const Divider(color: AppTheme.slate100, height: 1, thickness: 1);
}

// ── Card container ─────────────────────────────────────────────────
class AppCard extends StatelessWidget {
  final Widget  child;
  final EdgeInsetsGeometry? padding;
  const AppCard({super.key, required this.child, this.padding});

  @override
  Widget build(BuildContext context) => Container(
    decoration: BoxDecoration(
      color:        AppTheme.white,
      borderRadius: BorderRadius.circular(16),
      border:       Border.all(color: AppTheme.slate200),
    ),
    padding: padding ?? const EdgeInsets.all(16),
    child:   child,
  );
}

// ── Form field helper ──────────────────────────────────────────────
class AppTextField extends StatelessWidget {
  final TextEditingController controller;
  final String label, hint;
  final IconData? prefixIcon;
  final TextInputType? keyboardType;
  final bool obscureText, enabled;
  final int maxLines;
  final String? Function(String?)? validator;
  final Widget? suffixIcon;
  final void Function(String)? onChanged;

  const AppTextField({super.key,
    required this.controller, required this.label, required this.hint,
    this.prefixIcon, this.keyboardType, this.obscureText = false,
    this.enabled = true, this.maxLines = 1, this.validator,
    this.suffixIcon, this.onChanged,
  });

  @override
  Widget build(BuildContext context) => TextFormField(
    controller:   controller,
    keyboardType: keyboardType,
    obscureText:  obscureText,
    enabled:      enabled,
    maxLines:     maxLines,
    onChanged:    onChanged,
    validator:    validator,
    style: const TextStyle(fontSize: 14, color: AppTheme.slate800),
    decoration: InputDecoration(
      labelText:  label,
      hintText:   hint,
      hintStyle:  const TextStyle(fontSize: 13, color: AppTheme.slate200),
      prefixIcon: prefixIcon != null ? Icon(prefixIcon, size: 18, color: AppTheme.slate400) : null,
      suffixIcon: suffixIcon,
    ),
  );
}