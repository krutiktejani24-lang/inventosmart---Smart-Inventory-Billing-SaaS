import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../services/api_service.dart';

/// Auth state
class AuthState {
  final String? token;
  final Map<String, dynamic>? user;
  final Map<String, dynamic>? business;
  final bool isLoading;
  final String? error;

  const AuthState({
    this.token,
    this.user,
    this.business,
    this.isLoading = false,
    this.error,
  });

  bool get isAuthenticated => token != null;

  AuthState copyWith({
    String? token,
    Map<String, dynamic>? user,
    Map<String, dynamic>? business,
    bool? isLoading,
    String? error,
  }) =>
      AuthState(
        token: token ?? this.token,
        user: user ?? this.user,
        business: business ?? this.business,
        isLoading: isLoading ?? this.isLoading,
        error: error,
      );
}

/// Auth Notifier
class AuthNotifier extends StateNotifier<AuthState> {
  AuthNotifier() : super(const AuthState()) {
    _loadFromPrefs();
  }

  Future<void> _loadFromPrefs() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('token');
    if (token != null) {
      state = state.copyWith(token: token);
    }
  }

  Future<bool> login(String email, String password) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final res = await apiService.post('/auth/login', {
        'email': email,
        'password': password,
      });
      final data = res.data;
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('token', data['token']);
      state = state.copyWith(
        token: data['token'],
        user: data['user'],
        business: data['business'],
        isLoading: false,
      );
      return true;
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: 'Login failed. Check credentials.',
      );
      return false;
    }
  }

  Future<void> logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.clear();
    state = const AuthState();
  }
}

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>(
  (ref) => AuthNotifier(),
);
