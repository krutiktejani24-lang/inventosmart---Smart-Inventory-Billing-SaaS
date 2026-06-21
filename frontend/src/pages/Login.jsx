import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { useNavigate } from 'react-router-dom';
import { Zap, Eye, EyeOff, Building2, User, Mail, Lock } from 'lucide-react';
import useAuthStore from '../store/authStore';
import api from '../api/axiosConfig';

export default function Login() {
  const [tab,      setTab]      = useState('login'); 
  const [showPass, setShowPass] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  // Login form
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });

  // Register form
  const [regForm, setRegForm] = useState({
    businessName: '', name: '', email: '', password: '',
  });

  const { t } = useTranslation();
  const { setAuth } = useAuthStore();
  const navigate    = useNavigate();

  /* ── Login ─────────────────────────────────────────────────────── */
  const handleLogin = async (e) => {
    e.preventDefault();
    if (!loginForm.email || !loginForm.password) {
      setError('Email and password required'); return;
    }
    setLoading(true); setError('');
    try {
      const res = await api.post('/auth/login', {
        email:    loginForm.email.trim(),
        password: loginForm.password,
      });
      const { token, user, business } = res.data;
      setAuth(token, user, business);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed — check credentials');
    } finally { setLoading(false); }
  };

  /* ── Register ──────────────────────────────────────────────────── */
  const handleRegister = async (e) => {
    e.preventDefault();
    if (!regForm.businessName || !regForm.name || !regForm.email || !regForm.password) {
      setError('All fields are required'); return;
    }
    if (regForm.password.length < 6) {
      setError('Password must be at least 6 characters'); return;
    }
    setLoading(true); setError('');
    try {
      const res = await api.post('/auth/register', {
        businessName: regForm.businessName.trim(),
        name:         regForm.name.trim(),
        email:        regForm.email.trim(),
        password:     regForm.password,
      });
      const { token, user, business } = res.data;
      setAuth(token, user, business);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="flex items-center gap-3 justify-center mb-8">
          <div className="w-11 h-11 bg-indigo-500 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
            <Zap size={22} className="text-white" />
          </div>
          <div>
            <p className="text-xl font-bold text-slate-800 leading-tight">InventoSmart</p>
            <p className="text-xs text-slate-400">GST Inventory & Billing</p>
          </div>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/60 border border-slate-100 overflow-hidden">

          {/* Tabs */}
          <div className="flex border-b border-slate-100">
            {['login', 'register'].map(tabItem => (
              <button key={tabItem} onClick={() => { setTab(tabItem); setError(''); }}
                className={`flex-1 py-3.5 text-sm font-medium transition-colors ${
                  tab === tabItem
                    ? 'text-indigo-600 border-b-2 border-indigo-500 bg-indigo-50/50'
                    : 'text-slate-400 hover:text-slate-600'
                }`}>
                {tabItem === 'login' ? t('auth.signIn') : t('auth.createAccount')}
              </button>
            ))}
          </div>

          <div className="p-7">

            {/* Error */}
            {error && (
              <div className="mb-4 bg-red-50 border border-red-100 rounded-xl px-4 py-2.5">
                <p className="text-xs text-red-600">{error}</p>
              </div>
            )}

            {/* ── LOGIN FORM ── */}
            {tab === 'login' && (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Email</label>
                  <div className="relative">
                    <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      value={loginForm.email}
                      onChange={e => setLoginForm(f => ({ ...f, email: e.target.value }))}
                      placeholder="you@business.com"
                      className="w-full border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-sm text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Password</label>
                  <div className="relative">
                    <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type={showPass ? 'text' : 'password'}
                      value={loginForm.password}
                      onChange={e => setLoginForm(f => ({ ...f, password: e.target.value }))}
                      placeholder="••••••••"
                      className="w-full border border-slate-200 rounded-xl pl-9 pr-10 py-2.5 text-sm text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10 transition-all"
                    />
                    <button type="button" onClick={() => setShowPass(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      {showPass ? <EyeOff size={15}/> : <Eye size={15}/>}
                    </button>
                  </div>
                </div>

                <button type="submit" disabled={loading}
                  className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-medium text-sm py-2.5 rounded-xl transition-colors disabled:opacity-60 mt-2 shadow-sm shadow-indigo-200">
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                      Signing in...
                    </span>
                  ) : t('auth.signIn')}
                </button>
              </form>
            )}

            {/* ── REGISTER FORM ── */}
            {tab === 'register' && (
              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Business Name</label>
                  <div className="relative">
                    <Building2 size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={regForm.businessName}
                      onChange={e => setRegForm(f => ({ ...f, businessName: e.target.value }))}
                      placeholder="Krutik Traders"
                      className="w-full border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-sm text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Your Name</label>
                  <div className="relative">
                    <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={regForm.name}
                      onChange={e => setRegForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="Krutik Tejani"
                      className="w-full border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-sm text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Email</label>
                  <div className="relative">
                    <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      value={regForm.email}
                      onChange={e => setRegForm(f => ({ ...f, email: e.target.value }))}
                      placeholder="krutik@gmail.com"
                      className="w-full border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-sm text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Password</label>
                  <div className="relative">
                    <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type={showPass ? 'text' : 'password'}
                      value={regForm.password}
                      onChange={e => setRegForm(f => ({ ...f, password: e.target.value }))}
                      placeholder="Min 6 characters"
                      className="w-full border border-slate-200 rounded-xl pl-9 pr-10 py-2.5 text-sm text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10 transition-all"
                    />
                    <button type="button" onClick={() => setShowPass(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      {showPass ? <EyeOff size={15}/> : <Eye size={15}/>}
                    </button>
                  </div>
                </div>

                <button type="submit" disabled={loading}
                  className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-medium text-sm py-2.5 rounded-xl transition-colors disabled:opacity-60 mt-2 shadow-sm shadow-indigo-200">
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                      Creating account...
                    </span>
                  ) : t('auth.createAndSignIn')}
                </button>
              </form>
            )}
          </div>
        </div>

        <div className="flex justify-center mt-4">
          <LanguageSwitcher />
        </div>
        <p className="text-center text-xs text-slate-400 mt-3">
          InventoSmart — GST Inventory & Billing for Indian MSMEs
        </p>
      </div>
    </div>
  );
}