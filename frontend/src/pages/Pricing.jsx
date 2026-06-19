import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Zap, Star, Crown, ArrowRight, X } from 'lucide-react';

import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';

import api from '../api/axiosConfig';
import useAuthStore from '../store/authStore';

const fmtINR = (n) => new Intl.NumberFormat('en-IN').format(n);

/* ─── Plan config (matches backend PLANS array) ──────────────────── */
const PLAN_ICONS  = { free: Zap, pro: Star, enterprise: Crown };
const PLAN_COLORS = {
  free:       { bg: '#EEF2FF', text: '#6366F1', border: '#C7D2FE', btn: '#6366F1' },
  pro:        { bg: '#ECFDF5', text: '#10B981', border: '#A7F3D0', btn: '#10B981' },
  enterprise: { bg: '#FEF3C7', text: '#F59E0B', border: '#FDE68A', btn: '#F59E0B' },
};

/* ─── Single Plan Card ───────────────────────────────────────────── */
function PlanCard({ plan, current, onSelect, loading }) {
  const Icon   = PLAN_ICONS[plan.name]  || Zap;
  const colors = PLAN_COLORS[plan.name] || PLAN_COLORS.free;
  const isCurrent = current === plan.id;
  const isFree    = plan.price === 0;

  return (
    <div className={`relative bg-white rounded-2xl border-2 p-6 flex flex-col transition-all duration-200 ${
      plan.popular
        ? 'border-emerald-400 shadow-xl shadow-emerald-100 scale-[1.02]'
        : 'border-slate-100 hover:border-slate-200 hover:shadow-md'
    } ${isCurrent ? 'ring-2 ring-indigo-500 ring-offset-2' : ''}`}>

      {/* Popular badge */}
      {plan.popular && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
          <span className="bg-emerald-500 text-white text-xs font-bold px-4 py-1 rounded-full shadow-sm">
            Most Popular
          </span>
        </div>
      )}

      {/* Current badge */}
      {isCurrent && (
        <div className="absolute -top-3.5 right-4">
          <span className="bg-indigo-500 text-white text-xs font-bold px-3 py-1 rounded-full">
            Current Plan
          </span>
        </div>
      )}

      {/* Icon + Name */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: colors.bg }}>
          <Icon size={20} style={{ color: colors.text }} />
        </div>
        <div>
          <p className="text-lg font-bold text-slate-800">{plan.name}</p>
          <p className="text-xs text-slate-400">{plan.billing_cycle === 'monthly' ? 'per month' : 'per year'}</p>
        </div>
      </div>

      {/* Price */}
      <div className="mb-5">
        {isFree ? (
          <p className="text-4xl font-bold text-slate-800">Free</p>
        ) : (
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-semibold text-slate-500">₹</span>
            <span className="text-4xl font-bold text-slate-800">{fmtINR(plan.price)}</span>
            <span className="text-slate-400 text-sm">/mo</span>
          </div>
        )}
      </div>

      {/* Limits */}
      <div className="flex gap-3 mb-5 flex-wrap">
        {[
          { label: 'Invoices', val: plan.max_invoices === -1 ? '∞' : plan.max_invoices },
          { label: 'Products', val: plan.max_products === -1 ? '∞' : plan.max_products },
          { label: 'Users',    val: plan.max_users    === -1 ? '∞' : plan.max_users    },
        ].map(({ label, val }) => (
          <div key={label} className="flex-1 min-w-[60px] text-center rounded-lg py-2 px-1"
            style={{ background: colors.bg }}>
            <p className="text-base font-bold" style={{ color: colors.text }}>{val}</p>
            <p className="text-[10px] text-slate-400">{label}</p>
          </div>
        ))}
      </div>

      {/* Features */}
      <ul className="space-y-2.5 mb-6 flex-1">
        {plan.features.map((f, i) => (
          <li key={i} className="flex items-center gap-2.5 text-sm text-slate-600">
            <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0"
              style={{ background: colors.bg }}>
              <Check size={10} style={{ color: colors.text }} strokeWidth={3} />
            </div>
            {f}
          </li>
        ))}
      </ul>

      {/* CTA Button */}
      <button
        onClick={() => !isCurrent && !isFree && onSelect(plan)}
        disabled={isCurrent || loading}
        className={`w-full py-3 rounded-xl text-sm font-semibold transition-all ${
          isCurrent
            ? 'bg-slate-100 text-slate-400 cursor-default'
            : isFree
                ? 'bg-slate-100 text-slate-500 cursor-default'
                : 'text-white hover:opacity-90 active:scale-[0.98] disabled:opacity-50'
        }`}
        style={!isCurrent && !isFree ? { background: colors.btn } : {}}
      >
        {isCurrent
          ? 'Current Plan'
          : isFree
              ? 'Always Free'
              : loading
                  ? 'Processing...'
                  : `Upgrade to ${plan.name} →`}
      </button>
    </div>
  );
}

/* ─── Razorpay Checkout ──────────────────────────────────────────── */
function loadRazorpay() {
  return new Promise((resolve) => {
    if (window.Razorpay) { resolve(true); return; }
    const script  = document.createElement('script');
    script.src    = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

/* ─── Main Pricing Page ──────────────────────────────────────────── */
export default function Pricing() {
  const [plans,    setPlans]    = useState([]);
  const [current,  setCurrent]  = useState('free');
  const [loading,  setLoading]  = useState(true);
  const [paying,   setPaying]   = useState(false);
  const [success,  setSuccess]  = useState(null);
  const [error,    setError]    = useState('');
  const { business, user }      = useAuthStore();
  const navigate                = useNavigate();

useEffect(() => {
  const fetchPlans = async () => {
    try {
      const res = await api.get('/subscriptions/plans');

      console.log(res.data);

      setPlans(res.data.data || []);
    } catch (err) {
      console.error(err);
      setPlans([]);
    } finally {
      setLoading(false);
    }
  };

  fetchPlans();
}, []);

  const handleSelect = async (plan) => {
    setPaying(true); setError('');
    try {
      const loaded = await loadRazorpay();
      if (!loaded) throw new Error('Razorpay failed to load. Check your connection.');

      // Create order
      const orderRes = await api.post('/subscriptions/create-order', { planId: plan.id });
      const order    = orderRes.data;

      // Open Razorpay checkout
      const options = {
        key:         order.keyId,
        amount:      order.amount,
        currency:    order.currency,
        name:        'InventoSmart',
        description: `${plan.name} Plan — Monthly`,
        order_id:    order.orderId,
        prefill: {
          name:    user?.name   || '',
          email:   order.email  || '',
          contact: order.phone  || '',
        },
        notes: { planId: plan.id },
        theme: { color: '#6366F1' },

        handler: async (response) => {
          try {
            const verifyRes = await api.post('/subscriptions/verify-payment', {
              razorpay_order_id:   response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature:  response.razorpay_signature,
              planId:              plan.id,
            });
            setSuccess(verifyRes.data);
            setCurrent(plan.id);
            setPaying(false);
          } catch {
            setError('Payment verification failed. Contact support.');
            setPaying(false);
          }
        },

        modal: {
          ondismiss: () => setPaying(false),
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Payment failed');
      setPaying(false);
    }
  }; 


  return (
         <div className="flex h-screen bg-slate-50 overflow-hidden">

    <div className="hidden lg:flex">
      <Sidebar />
    </div>

    <div className="flex-1 flex flex-col overflow-hidden min-w-0">

      <Navbar title="Pricing Plans" />

      <main className="flex-1 overflow-y-auto bg-gradient-to-br from-indigo-50 via-white to-slate-50">

        <div className="max-w-7xl mx-auto px-6 py-8">


        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-indigo-50 border border-indigo-100 rounded-full px-4 py-1.5 text-indigo-600 text-sm font-medium mb-4">
            <Zap size={14} /> InventoSmart Plans
          </div>
          <h1 className="text-4xl font-bold text-slate-800 mb-3">
            Simple, Transparent Pricing
          </h1>
          <p className="text-slate-400 text-lg max-w-xl mx-auto">
            Start free. Upgrade when your business grows. Cancel anytime.
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="max-w-lg mx-auto mb-6 bg-red-50 border border-red-100 rounded-xl px-4 py-3 flex items-center gap-3">
            <X size={16} className="text-red-500 shrink-0" />
            <p className="text-sm text-red-600">{error}</p>
            <button onClick={() => setError('')} className="ml-auto text-red-400 hover:text-red-600">
              <X size={14} />
            </button>
          </div>
        )}

        {/* Success */}
        {success && (
          <div className="max-w-lg mx-auto mb-6 bg-emerald-50 border border-emerald-200 rounded-xl px-5 py-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center">
                <Check size={16} className="text-white" strokeWidth={3} />
              </div>
              <p className="font-semibold text-emerald-800">{success.message}</p>
            </div>
            <p className="text-sm text-emerald-600 ml-11">
              Valid until {new Date(success.expiresAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
            </p>
            <button onClick={() => navigate('/settings')}
              className="mt-3 ml-11 text-sm text-emerald-600 hover:text-emerald-800 font-medium flex items-center gap-1">
              Go to Settings <ArrowRight size={14} />
            </button>
          </div>
        )}

        {/* Plans Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1,2,3].map(i => (
              <div key={i} className="h-[480px] bg-slate-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            {plans.map(plan => (
              <PlanCard
                key={plan.id}
                plan={plan}
                current={current}
                onSelect={handleSelect}
                loading={paying}
              />
            ))}
          </div>
        )}

        {/* FAQs */}
        <div className="mt-16 max-w-2xl mx-auto">
          <h2 className="text-xl font-bold text-slate-800 text-center mb-8">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {[
              { q: 'Can I upgrade or downgrade anytime?', a: 'Yes! You can upgrade at any time. Downgrade takes effect at the end of your current billing period.' },
              { q: 'What payment methods are accepted?', a: 'We accept UPI, credit/debit cards, net banking, and wallets via Razorpay.' },
              { q: 'Is my data safe if I downgrade?', a: 'Yes, your data is always safe. You just lose access to premium features, not your existing data.' },
              { q: 'Do you offer yearly billing?', a: 'Yearly billing with 2 months free is coming soon! Contact us for an early access discount.' },
              { q: 'Is GST invoice available for payment?', a: 'Yes, we provide GST invoice for all paid subscriptions.' },
            ].map(({ q, a }) => (
              <details key={q} className="bg-white rounded-xl border border-slate-100 group">
                <summary className="flex items-center justify-between px-5 py-4 cursor-pointer list-none">
                  <span className="text-sm font-semibold text-slate-700">{q}</span>
                  <span className="text-slate-400 group-open:rotate-180 transition-transform">▾</span>
                </summary>
                <p className="px-5 pb-4 text-sm text-slate-500 leading-relaxed">{a}</p>
              </details>
            ))}
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="mt-12 text-center">
          <p className="text-slate-400 text-sm">
            Questions? Contact us at{' '}
              <a href="mailto:support@inventosmart.in" className="text-indigo-500 hover:text-indigo-700">
                support@inventosmart.in
              </a>

              </p>

             </div>

           </div>

         </main>

       </div>

     </div>
  );
}