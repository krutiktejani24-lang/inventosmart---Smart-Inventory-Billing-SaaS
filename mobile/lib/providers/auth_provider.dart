import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../services/api_service.dart';

// ── Auth State ─────────────────────────────────────────────────────
class AuthState {
  final String?              token;
  final Map<String, dynamic>? user;
  final Map<String, dynamic>? business;
  final bool                 isLoading;
  final String?              error;

  const AuthState({
    this.token,
    this.user,
    this.business,
    this.isLoading = false,
    this.error,
  });

  bool get isAuthenticated => token != null && token!.isNotEmpty;

  AuthState copyWith({
    String?              token,
    Map<String, dynamic>? user,
    Map<String, dynamic>? business,
    bool?                isLoading,
    String?              error,
    bool                 clearError = false,
  }) =>
      AuthState(
        token:     token     ?? this.token,
        user:      user      ?? this.user,
        business:  business  ?? this.business,
        isLoading: isLoading ?? this.isLoading,
        error:     clearError ? null : (error ?? this.error),
      );
}

// ── Auth Notifier ──────────────────────────────────────────────────
class AuthNotifier extends StateNotifier<AuthState> {
  AuthNotifier() : super(const AuthState()) {
    _loadFromPrefs();
  }

  /// App start thi saved token load karo
  Future<void> _loadFromPrefs() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('token');
    if (token != null && token.isNotEmpty) {
      state = state.copyWith(token: token, isLoading: true);
      try {
        final res  = await api.getMe();
        final data = res.data as Map<String, dynamic>;
        state = state.copyWith(
          token:     token,
          user:      data['user']     as Map<String, dynamic>?,
          business:  (data['user'] as Map?)? ['business'] as Map<String, dynamic>?,
          isLoading: false,
          clearError: true,
        );
      } catch (_) {
        // Token invalid — clear
        await _clearPrefs();
        state = const AuthState();
      }
    }
  }

  /// Login with email + password
  Future<bool> login(String email, String password) async {
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      final res  = await api.login(email.trim(), password);
      final data = res.data as Map<String, dynamic>;

      final token    = data['token']    as String;
      final user     = data['user']     as Map<String, dynamic>;
      final business = data['business'] as Map<String, dynamic>;

      // Save to SharedPreferences
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('token',        token);
      await prefs.setString('userName',     user['name']     ?? '');
      await prefs.setString('userRole',     user['role']     ?? '');
      await prefs.setString('businessName', business['name'] ?? '');

      state = state.copyWith(
        token:     token,
        user:      user,
        business:  business,
        isLoading: false,
        clearError: true,
      );
      return true;
    } catch (e) {
      String msg = 'Login failed';
      if (e is Exception) {
        final str = e.toString();
        if (str.contains('401'))       msg = 'Invalid email or password';
        else if (str.contains('404'))  msg = 'Account not found';
        else if (str.contains('connection')) msg = 'Cannot connect to server';
      }
      state = state.copyWith(isLoading: false, error: msg);
      return false;
    }
  }

  final api = ApiService();  

  /// Logout — clear everything
  Future<void> logout() async {
    await _clearPrefs();
    state = const AuthState();
  }

  Future<void> _clearPrefs() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.clear();
  }

  void clearError() => state = state.copyWith(clearError: true);
}

// ── Providers ─────────────────────────────────────────────────────
final authProvider = StateNotifierProvider<AuthNotifier, AuthState>(
  (ref) => AuthNotifier(),
);

/// Convenience: just the token
final tokenProvider = Provider<String?>(
  (ref) => ref.watch(authProvider).token,
);

/// Convenience: business name
final businessNameProvider = Provider<String>(
  (ref) => ref.watch(authProvider).business?['name'] as String? ?? 'InventoSmart',
);