import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FileText, IndianRupee, Clock, CheckCircle, LogOut, ChevronRight, Download, Building2 } from 'lucide-react';
import usePortalStore from '../../store/portalStore';
import portalApi from '../../api/portalApi';

const fmt = (n) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(n || 0);

const STATUS_STYLE = {
  PAID:      'bg-emerald-50 text-emerald-700',
  SENT:      'bg-blue-50 text-blue-700',
  DRAFT:     'bg-slate-100 text-slate-600',
  CANCELLED: 'bg-red-50 text-red-600',
};

export default function PortalDashboard() {
  const [summary,  setSummary]  = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const { customer, business, logout } = usePortalStore();
  const navigate = useNavigate();

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const [s, i] = await Promise.all([
          portalApi.get('/summary'),
          portalApi.get('/invoices?limit=5'),
        ]);
        setSummary(s.data);
        setInvoices(i.data.invoices || []);
      } catch (e) {
        if (e.response?.status === 401) { logout(); navigate('/portal/login'); }
      } finally { setLoading(false); }
    };
    fetch();
  }, []);

  const Skeleton = ({ className }) => <div className={`animate-pulse bg-slate-100 rounded-xl ${className}`}/>;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center text-white text-xs font-bold">
              {business?.name?.charAt(0) || 'I'}
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800 leading-tight">{business?.name || 'InventoSmart'}</p>
              <p className="text-[11px] text-slate-400">Customer Portal</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-medium text-slate-700">{customer?.name}</p>
              <p className="text-[11px] text-slate-400">{customer?.email || customer?.phone}</p>
            </div>
            <button onClick={() => { logout(); navigate('/portal/login'); }}
              className="p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors">
              <LogOut size={16}/>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        {/* Welcome */}
        <div className="bg-gradient-to-r from-indigo-500 to-indigo-700 rounded-2xl p-5 text-white">
          <p className="text-sm text-indigo-200 mb-1">Welcome back,</p>
          <p className="text-xl font-bold">{customer?.name || 'Customer'}</p>
          {customer?.gstin && <p className="text-indigo-200 text-xs mt-1">GSTIN: {customer.gstin}</p>}
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-3">
          {loading ? Array(3).fill(0).map((_,i) => <Skeleton key={i} className="h-20"/>) : [
            { icon: IndianRupee, label: 'Total Billed',  value: `₹${fmt(summary?.totalBilled)}`,  color: 'text-indigo-600',  bg: 'bg-indigo-50'  },
            { icon: CheckCircle, label: 'Paid',           value: `₹${fmt(summary?.totalPaid)}`,    color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { icon: Clock,       label: 'Outstanding',    value: `₹${fmt(summary?.outstanding)}`,  color: 'text-amber-600',   bg: 'bg-amber-50'   },
          ].map(({ icon: Icon, label, value, color, bg }) => (
            <div key={label} className="bg-white rounded-xl border border-slate-100 p-3 text-center">
              <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center mx-auto mb-2`}>
                <Icon size={15} className={color}/>
              </div>
              <p className={`text-base font-bold ${color} leading-tight`}>{value}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Recent Invoices */}
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-50">
            <p className="text-sm font-semibold text-slate-800">Recent Invoices</p>
            <Link to="/portal/invoices" className="text-xs text-indigo-500 hover:text-indigo-700 flex items-center gap-1">
              View all <ChevronRight size={13}/>
            </Link>
          </div>

          {loading ? (
            <div className="p-4 space-y-3">{Array(4).fill(0).map((_,i) => <Skeleton key={i} className="h-14"/>)}</div>
          ) : invoices.length === 0 ? (
            <div className="py-12 text-center">
              <FileText size={32} className="mx-auto text-slate-200 mb-2"/>
              <p className="text-sm text-slate-400">No invoices yet</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {invoices.map(inv => (
                <Link key={inv.id} to={`/portal/invoices/${inv.id}`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors">
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
                    <FileText size={15} className="text-indigo-500"/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-mono font-semibold text-indigo-600">{inv.invoice_no}</p>
                    <p className="text-[11px] text-slate-400">
                      {new Date(inv.created_at).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-slate-800">₹{fmt(inv.total)}</p>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${STATUS_STYLE[inv.status]}`}>
                      {inv.status}
                    </span>
                  </div>
                  <ChevronRight size={14} className="text-slate-300 shrink-0"/>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Business contact */}
        {business && (
          <div className="bg-white rounded-2xl border border-slate-100 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Building2 size={15} className="text-slate-400"/>
              <p className="text-xs font-semibold text-slate-600">Business Contact</p>
            </div>
            <p className="text-sm font-semibold text-slate-800">{business.name}</p>
            {business.gstin  && <p className="text-xs text-slate-400 mt-1">GSTIN: {business.gstin}</p>}
            {business.phone  && <p className="text-xs text-slate-500 mt-0.5">📞 {business.phone}</p>}
            {business.email  && <p className="text-xs text-slate-500 mt-0.5">✉️ {business.email}</p>}
          </div>
        )}
      </main>
    </div>
  );
}