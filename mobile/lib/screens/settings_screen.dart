import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/app_providers.dart';
import '../services/api_service.dart';
import '../utils/app_theme.dart';
import '../utils/helpers.dart';
import '../widgets/common_widgets.dart';
import 'login_screen.dart';

class SettingsScreen extends ConsumerStatefulWidget {
  const SettingsScreen({super.key});
  @override
  ConsumerState<SettingsScreen> createState() => _State();
}

class _State extends ConsumerState<SettingsScreen> with SingleTickerProviderStateMixin {
  late TabController _tabs;
  @override
  void initState() { super.initState(); _tabs = TabController(length: 3, vsync: this); }
  @override
  void dispose() { _tabs.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) {
    final auth = ref.watch(authProvider);
    return Scaffold(
      appBar: AppBar(
        title: const Text('Settings'),
        bottom: TabBar(
          controller: _tabs,
          indicatorColor: AppTheme.primary,
          labelColor: AppTheme.primary,
          unselectedLabelColor: AppTheme.slate400,
          labelStyle: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
          tabs: const [Tab(text: 'Business'), Tab(text: 'Password'), Tab(text: 'Team')],
        ),
      ),
      body: TabBarView(controller: _tabs, children: const [
        _BusinessTab(),
        _PasswordTab(),
        _TeamTab(),
      ]),
    );
  }
}

// ── Business Profile Tab ───────────────────────────────────────────
class _BusinessTab extends ConsumerStatefulWidget {
  const _BusinessTab();
  @override
  ConsumerState<_BusinessTab> createState() => _BizState();
}

class _BizState extends ConsumerState<_BusinessTab> {
  final _form  = GlobalKey<FormState>();
  bool _saving = false, _saved = false;
  String? _err;
  late final _name  = TextEditingController();
  late final _gstin = TextEditingController();
  late final _phone = TextEditingController();
  late final _email = TextEditingController();
  late final _addr  = TextEditingController();
  late final _upi   = TextEditingController();

  @override
  void initState() {
    super.initState();
    final biz = ref.read(authProvider).business;
    if (biz != null) {
      _name.text  = biz['name']    ?? '';
      _gstin.text = biz['gstin']   ?? '';
      _phone.text = biz['phone']   ?? '';
      _email.text = biz['email']   ?? '';
      _addr.text  = biz['address'] ?? '';
      _upi.text   = biz['upi_id']  ?? '';
    }
  }

  @override
  void dispose() { [_name,_gstin,_phone,_email,_addr,_upi].forEach((c)=>c.dispose()); super.dispose(); }

  Future<void> _save() async {
    if (!_form.currentState!.validate()) return;
    FocusScope.of(context).unfocus();
    setState(() { _saving = true; _err = null; });
    try {
      await api.updateBusiness({
        'name':    _name.text.trim(),
        'gstin':   _gstin.text.trim().isEmpty ? null : _gstin.text.trim().toUpperCase(),
        'phone':   _phone.text.trim().isEmpty ? null : _phone.text.trim(),
        'email':   _email.text.trim().isEmpty ? null : _email.text.trim(),
        'address': _addr.text.trim().isEmpty  ? null : _addr.text.trim(),
        'upi_id':  _upi.text.trim().isEmpty   ? null : _upi.text.trim(),
      });
      setState(() { _saving = false; _saved = true; });
      await Future.delayed(const Duration(seconds: 2));
      if (mounted) setState(() => _saved = false);
    } catch (e) { setState(() { _err = errorMessage(e); _saving = false; }); }
  }

  @override
  Widget build(BuildContext context) {
    final auth = ref.watch(authProvider);
    return Form(key: _form, child: ListView(padding: const EdgeInsets.all(16), children: [
      // User card
      Container(
        decoration: BoxDecoration(
          gradient: const LinearGradient(colors: [Color(0xFF6366F1), Color(0xFF4F46E5)], begin: Alignment.topLeft, end: Alignment.bottomRight),
          borderRadius: BorderRadius.circular(16)),
        padding: const EdgeInsets.all(16),
        child: Row(children: [
          Container(width: 52, height: 52,
            decoration: BoxDecoration(color: Colors.white.withOpacity(0.2), borderRadius: BorderRadius.circular(26)),
            child: Center(child: Text((auth.user?['name'] as String? ?? 'U')[0].toUpperCase(),
              style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Colors.white)))),
          const SizedBox(width: 14),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(auth.user?['name'] ?? '', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white)),
            Text(auth.user?['email'] ?? '', style: const TextStyle(fontSize: 12, color: Colors.white70)),
            Container(margin: const EdgeInsets.only(top: 4), padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
              decoration: BoxDecoration(color: Colors.white.withOpacity(0.2), borderRadius: BorderRadius.circular(12)),
              child: Text(auth.user?['role'] ?? '', style: const TextStyle(fontSize: 11, color: Colors.white, fontWeight: FontWeight.w600))),
          ])),
        ])),
      const SizedBox(height: 20),

      if (_err != null) ...[
        Container(padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(color: const Color(0xFFFEF2F2), borderRadius: BorderRadius.circular(12), border: Border.all(color: const Color(0xFFFECACA))),
          child: Text(_err!, style: const TextStyle(color: Color(0xFFB91C1C), fontSize: 13))),
        const SizedBox(height: 12),
      ],

      _label('Business Information'),
      AppTextField(controller: _name, label: 'Business Name *', hint: 'Your business name', prefixIcon: Icons.business_outlined,
        validator: (v) => v==null||v.trim().isEmpty ? 'Required' : null),
      const SizedBox(height: 12),
      AppTextField(controller: _gstin, label: 'GSTIN', hint: '22AAAAA0000A1Z5', prefixIcon: Icons.badge_outlined),
      const SizedBox(height: 12),
      Row(children: [
        Expanded(child: AppTextField(controller: _phone, label: 'Phone', hint: '9876543210', prefixIcon: Icons.phone_outlined, keyboardType: TextInputType.phone)),
        const SizedBox(width: 12),
        Expanded(child: AppTextField(controller: _email, label: 'Email', hint: 'biz@email.com', prefixIcon: Icons.email_outlined, keyboardType: TextInputType.emailAddress)),
      ]),
      const SizedBox(height: 12),
      AppTextField(controller: _addr, label: 'Address', hint: 'Business address', prefixIcon: Icons.home_outlined, maxLines: 2),
      const SizedBox(height: 20),

      _label('Payment Settings'),
      AppTextField(controller: _upi, label: 'UPI ID', hint: 'yourname@upi or 9876543210@paytm', prefixIcon: Icons.qr_code_rounded),
      Container(margin: const EdgeInsets.only(top: 6), padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(color: AppTheme.indigo50, borderRadius: BorderRadius.circular(10)),
        child: Row(children: [
          const Icon(Icons.info_outline, size: 16, color: AppTheme.primary),
          const SizedBox(width: 8),
          const Expanded(child: Text('UPI QR will automatically appear on all invoices when set.',
            style: TextStyle(fontSize: 12, color: AppTheme.primary))),
        ])),
      const SizedBox(height: 24),

      SizedBox(height: 52, child: ElevatedButton(
        onPressed: _saving ? null : _save,
        style: ElevatedButton.styleFrom(backgroundColor: _saved ? AppTheme.emerald : AppTheme.primary),
        child: _saving
            ? const SizedBox(width:22,height:22,child:CircularProgressIndicator(strokeWidth:2.5,color:Colors.white))
            : Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                Icon(_saved ? Icons.check_rounded : Icons.save_rounded, size: 18),
                const SizedBox(width: 8),
                Text(_saved ? 'Saved!' : 'Save Changes'),
              ]))),
      const SizedBox(height: 20),

      // Logout button
      OutlinedButton.icon(
        onPressed: () async {
          final ok = await showDialog<bool>(context: context, builder: (_) => AlertDialog(
            title: const Text('Logout'), content: const Text('Are you sure you want to logout?'),
            actions: [TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
              TextButton(onPressed: () => Navigator.pop(context, true), child: const Text('Logout', style: TextStyle(color: AppTheme.red)))],
          ));
          if (ok == true && mounted) {
            await ref.read(authProvider.notifier).logout();
            Navigator.of(context).pushAndRemoveUntil(MaterialPageRoute(builder: (_) => const LoginScreen()), (_) => false);
          }
        },
        icon: const Icon(Icons.logout_rounded, color: AppTheme.red, size: 18),
        label: const Text('Logout', style: TextStyle(color: AppTheme.red)),
        style: OutlinedButton.styleFrom(side: const BorderSide(color: AppTheme.red), padding: const EdgeInsets.symmetric(vertical: 14), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)))),
    ]));
  }

  Widget _label(String t) => Padding(padding: const EdgeInsets.only(bottom: 10),
    child: Text(t, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppTheme.primary, letterSpacing: 0.5)));
}

// ── Password Tab ───────────────────────────────────────────────────
class _PasswordTab extends StatefulWidget {
  const _PasswordTab();
  @override
  State<_PasswordTab> createState() => _PassState();
}

class _PassState extends State<_PasswordTab> {
  final _form    = GlobalKey<FormState>();
  final _current = TextEditingController();
  final _new     = TextEditingController();
  final _confirm = TextEditingController();
  bool _saving = false, _showCurr = false, _showNew = false;
  String? _err, _msg;

  @override
  void dispose() { [_current,_new,_confirm].forEach((c)=>c.dispose()); super.dispose(); }

  Future<void> _save() async {
    if (!_form.currentState!.validate()) return;
    FocusScope.of(context).unfocus();
    setState(() { _saving = true; _err = null; _msg = null; });
    try {
      await api.changePassword(_current.text, _new.text);
      _current.clear(); _new.clear(); _confirm.clear();
      setState(() { _saving = false; _msg = 'Password changed successfully!'; });
    } catch (e) { setState(() { _err = errorMessage(e); _saving = false; }); }
  }

  @override
  Widget build(BuildContext context) => Form(key: _form, child: ListView(padding: const EdgeInsets.all(16), children: [
    const SizedBox(height: 8),
    Container(padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(color: AppTheme.indigo50, borderRadius: BorderRadius.circular(14)),
      child: Row(children: [
        const Icon(Icons.lock_outline, color: AppTheme.primary, size: 22),
        const SizedBox(width: 12),
        const Expanded(child: Text('Change your account password. Use at least 6 characters.',
          style: TextStyle(fontSize: 13, color: AppTheme.primary))),
      ])),
    const SizedBox(height: 20),

    if (_err != null) ...[
      Container(padding: const EdgeInsets.all(12), decoration: BoxDecoration(color: const Color(0xFFFEF2F2), borderRadius: BorderRadius.circular(12), border: Border.all(color: const Color(0xFFFECACA))),
        child: Text(_err!, style: const TextStyle(color: Color(0xFFB91C1C), fontSize: 13))),
      const SizedBox(height: 12),
    ],
    if (_msg != null) ...[
      Container(padding: const EdgeInsets.all(12), decoration: BoxDecoration(color: const Color(0xFFECFDF5), borderRadius: BorderRadius.circular(12), border: Border.all(color: AppTheme.emerald.withOpacity(0.3))),
        child: Row(children: [const Icon(Icons.check_circle_outline, color: AppTheme.emerald, size: 18), const SizedBox(width: 8), Text(_msg!, style: const TextStyle(color: AppTheme.emerald, fontSize: 13))])),
      const SizedBox(height: 12),
    ],

    AppTextField(controller: _current, label: 'Current Password', hint: '••••••••', prefixIcon: Icons.lock_outline,
      obscureText: !_showCurr,
      suffixIcon: IconButton(icon: Icon(_showCurr ? Icons.visibility_off : Icons.visibility, size: 20, color: AppTheme.slate400), onPressed: () => setState(() => _showCurr = !_showCurr)),
      validator: (v) => v==null||v.isEmpty ? 'Required' : null),
    const SizedBox(height: 14),
    AppTextField(controller: _new, label: 'New Password', hint: '••••••••', prefixIcon: Icons.lock_outline,
      obscureText: !_showNew,
      suffixIcon: IconButton(icon: Icon(_showNew ? Icons.visibility_off : Icons.visibility, size: 20, color: AppTheme.slate400), onPressed: () => setState(() => _showNew = !_showNew)),
      validator: (v) => v==null||v.length<6 ? 'Min 6 characters' : null),
    const SizedBox(height: 14),
    AppTextField(controller: _confirm, label: 'Confirm New Password', hint: '••••••••', prefixIcon: Icons.lock_outline,
      obscureText: true,
      validator: (v) => v != _new.text ? 'Passwords do not match' : null),
    const SizedBox(height: 24),
    SizedBox(height: 52, child: ElevatedButton(
      onPressed: _saving ? null : _save,
      child: _saving ? const SizedBox(width:22,height:22,child:CircularProgressIndicator(strokeWidth:2.5,color:Colors.white))
          : const Row(mainAxisAlignment: MainAxisAlignment.center, children: [
              Icon(Icons.key_rounded, size: 18), SizedBox(width: 8), Text('Change Password')]))),
  ]));
}

// ── Team Tab ───────────────────────────────────────────────────────
class _TeamTab extends ConsumerStatefulWidget {
  const _TeamTab();
  @override
  ConsumerState<_TeamTab> createState() => _TeamState();
}

class _TeamState extends ConsumerState<_TeamTab> {
  List<Map>? _members;
  bool _loading = true, _adding = false;
  String? _err;
  final _name  = TextEditingController();
  final _email = TextEditingController();
  final _pass  = TextEditingController();
  String _role = 'STAFF';
  final _roleColors = {'ADMIN': AppTheme.red, 'MANAGER': AppTheme.amber, 'STAFF': AppTheme.slate400};

  @override
  void initState() { super.initState(); _load(); }
  @override
  void dispose() { [_name,_email,_pass].forEach((c)=>c.dispose()); super.dispose(); }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final res = await api.getTeam();
      setState(() { _members = ((res.data['users']) as List).cast<Map>(); _loading = false; });
    } catch (_) { setState(() { _members = []; _loading = false; }); }
  }

  Future<void> _addMember() async {
    if (_name.text.trim().isEmpty || _email.text.trim().isEmpty || _pass.text.isEmpty) {
      setState(() => _err = 'All fields are required'); return;
    }
    setState(() { _adding = true; _err = null; });
    try {
      await api.addTeamMember({'name': _name.text.trim(), 'email': _email.text.trim(), 'password': _pass.text, 'role': _role});
      _name.clear(); _email.clear(); _pass.clear();
      setState(() { _adding = false; _role = 'STAFF'; });
      await _load();
    } catch (e) { setState(() { _err = errorMessage(e); _adding = false; }); }
  }

  @override
  Widget build(BuildContext context) => ListView(padding: const EdgeInsets.all(16), children: [
    // Add member form
    AppCard(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      const Text('Add Team Member', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700)),
      const SizedBox(height: 14),
      if (_err != null) ...[
        Container(padding: const EdgeInsets.all(10), decoration: BoxDecoration(color: const Color(0xFFFEF2F2), borderRadius: BorderRadius.circular(10), border: Border.all(color: const Color(0xFFFECACA))),
          child: Text(_err!, style: const TextStyle(color: Color(0xFFB91C1C), fontSize: 12))),
        const SizedBox(height: 10),
      ],
      AppTextField(controller: _name, label: 'Name', hint: 'Full name', prefixIcon: Icons.person_outline),
      const SizedBox(height: 10),
      AppTextField(controller: _email, label: 'Email', hint: 'member@email.com', prefixIcon: Icons.email_outlined, keyboardType: TextInputType.emailAddress),
      const SizedBox(height: 10),
      AppTextField(controller: _pass, label: 'Password', hint: 'Temporary password', prefixIcon: Icons.lock_outline, obscureText: true),
      const SizedBox(height: 10),
      InputDecorator(decoration: const InputDecoration(labelText: 'Role', prefixIcon: Icon(Icons.badge_outlined, size: 18)),
        child: DropdownButtonHideUnderline(child: DropdownButton<String>(
          value: _role, isDense: true, isExpanded: true,
          icon: const Icon(Icons.keyboard_arrow_down_rounded, size: 20, color: AppTheme.slate400),
          items: ['STAFF','MANAGER','ADMIN'].map((r) => DropdownMenuItem(value: r, child: Text(r, style: const TextStyle(fontSize: 14)))).toList(),
          onChanged: (v) => setState(() => _role = v!)))),
      const SizedBox(height: 14),
      SizedBox(width: double.infinity, height: 44, child: ElevatedButton.icon(
        onPressed: _adding ? null : _addMember,
        icon: _adding ? const SizedBox(width:16,height:16,child:CircularProgressIndicator(strokeWidth:2,color:Colors.white)) : const Icon(Icons.person_add_rounded, size: 18),
        label: Text(_adding ? 'Adding...' : 'Add Member'))),
    ])),
    const SizedBox(height: 20),

    // Team list
    SectionHeader(title: 'Current Team', icon: Icons.people_rounded),
    const SizedBox(height: 12),
    if (_loading)
      const Center(child: CircularProgressIndicator(color: AppTheme.primary))
    else if (_members == null || _members!.isEmpty)
      const EmptyState(icon: Icons.people_outline, title: 'No team members', subtitle: 'Add your first team member above')
    else
      ...(_members!.map((m) {
        final role   = m['role'] as String? ?? 'STAFF';
        final color  = _roleColors[role] ?? AppTheme.slate400;
        return Container(
          margin: const EdgeInsets.only(bottom: 8),
          decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppTheme.slate200)),
          child: ListTile(
            leading: Container(width: 40, height: 40,
              decoration: BoxDecoration(color: color.withOpacity(0.1), borderRadius: BorderRadius.circular(20)),
              child: Center(child: Text((m['name'] as String? ?? 'U')[0].toUpperCase(),
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: color)))),
            title: Text(m['name'] ?? '', style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
            subtitle: Text(m['email'] ?? '', style: const TextStyle(fontSize: 12, color: AppTheme.slate400)),
            trailing: Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(color: color.withOpacity(0.1), borderRadius: BorderRadius.circular(12)),
              child: Text(role, style: TextStyle(fontSize: 11, color: color, fontWeight: FontWeight.w700))),
          ));
      })),
  ]);
}