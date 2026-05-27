import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FileText, ChevronRight, ChevronLeft, Search, X, ArrowLeft } from 'lucide-react';
import usePortalStore from '../../store/portalStore';
import portalApi from '../../api/portalApi';

const fmt = (n) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(n || 0);
const STATUS_STYLE = {
  PAID:      'bg-emerald-50 text-emerald-700',
  SENT:      'bg-blue-50 text-blue-700',
  DRAFT:     'bg-slate-100 text-slate-600',
  CANCELLED: 'bg-red-50 text-red-600',
};

export default function PortalInvoices() {
  const [invoices,   setInvoices]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [pagination, setPagination] = useState({});
  const [page,       setPage]       = useState(1);
  const [status,     setStatus]     = useState('');
  const { logout }                  = usePortalStore();
  const navigate                    = useNavigate();

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 15 });
      if (status) params.set('status', status);
      const res = await portalApi.get(`/invoices?${params}`);
      setInvoices(res.data.invoices    || []);
      setPagination(res.data.pagination || {});
    } catch (e) {
      if (e.response?.status === 401) { logout(); navigate('/portal/login'); }
    } finally { setLoading(false); }
  }, [page, status]);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);
  useEffect(() => { setPage(1); }, [status]);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link to="/portal/dashboard" className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
            <ArrowLeft size={18}/>
          </Link>
          <p className="text-sm font-semibold text-slate-800 flex-1">My Invoices</p>
          <select value={status} onChange={e => setStatus(e.target.value)}
            className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-600 outline-none bg-white">
            <option value="">All Status</option>
            {['DRAFT','SENT','PAID','CANCELLED'].map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-5">
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          {loading ? (
            <div className="p-4 space-y-3">
              {Array(8).fill(0).map((_,i) => <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse"/>)}
            </div>
          ) : invoices.length === 0 ? (
            <div className="py-16 text-center">
              <FileText size={36} className="mx-auto text-slate-200 mb-3"/>
              <p className="text-slate-400 font-medium">No invoices found</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {invoices.map(inv => (
                <Link key={inv.id} to={`/portal/invoices/${inv.id}`}
                  className="flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50 transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
                    <FileText size={16} className="text-indigo-400"/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-mono font-bold text-indigo-600">{inv.invoice_no}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {new Date(inv.created_at).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}
                      {inv.due_date && ` • Due: ${new Date(inv.due_date).toLocaleDateString('en-IN', { day:'2-digit', month:'short' })}`}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-slate-800">₹{fmt(inv.total)}</p>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${STATUS_STYLE[inv.status]}`}>
                      {inv.status}
                    </span>
                  </div>
                  <ChevronRight size={14} className="text-slate-300 shrink-0"/>
                </Link>
              ))}
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
              <p className="text-xs text-slate-400">Page {page} of {pagination.totalPages}</p>
              <div className="flex gap-2">
                <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page===1}
                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40">
                  <ChevronLeft size={14}/>
                </button>
                <button onClick={() => setPage(p => Math.min(pagination.totalPages, p+1))} disabled={page===pagination.totalPages}
                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40">
                  <ChevronRight size={14}/>
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}