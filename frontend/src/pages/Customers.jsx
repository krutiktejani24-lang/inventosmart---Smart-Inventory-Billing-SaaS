import { useEffect, useState, useCallback } from 'react';
import { Plus, Search, X, Users, Edit2, Trash2, Eye, RefreshCw, ChevronLeft, ChevronRight, Phone, Mail } from 'lucide-react';
import Navbar  from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import api     from '../api/axiosConfig';

const fmtINR = (n) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(n || 0);

const EMPTY = { name:'', phone:'', email:'', gstin:'', address:'', city:'', state:'' };

const STATUS_STYLE = {
  PAID:'bg-emerald-50 text-emerald-700', SENT:'bg-blue-50 text-blue-700',
  DRAFT:'bg-slate-100 text-slate-600',   CANCELLED:'bg-red-50 text-red-600',
};

/* ─── Customer Modal ────────────────────────────────────────────── */
function CustomerModal({ open, onClose, onSave, editing }) {
  const [form, setForm]   = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError]  = useState('');
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    setForm(editing ? { name:editing.name||'', phone:editing.phone||'', email:editing.email||'',
      gstin:editing.gstin||'', address:editing.address||'', city:editing.city||'', state:editing.state||'' } : EMPTY);
    setError('');
  }, [editing, open]);

  const handleSave = async () => {
    if (!form.name.trim()) { setError('Name is required'); return; }
    setSaving(true); setError('');
    try { await onSave(form); onClose(); }
    catch (e) { setError(e.response?.data?.message || 'Save failed'); }
    finally { setSaving(false); }
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose}/>
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-800">{editing ? 'Edit Customer' : 'Add Customer'}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><X size={18}/></button>
        </div>
        <div className="p-6 grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="lbl">Name *</label>
            <input className="inp" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Customer / Business name" />
          </div>
          <div><label className="lbl">Phone</label><input className="inp" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="9876543210"/></div>
          <div><label className="lbl">Email</label><input className="inp" type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="customer@email.com"/></div>
          <div className="col-span-2"><label className="lbl">GSTIN</label><input className="inp" value={form.gstin} onChange={e => set('gstin', e.target.value)} placeholder="22AAAAA0000A1Z5"/></div>
          <div className="col-span-2"><label className="lbl">Address</label><input className="inp" value={form.address} onChange={e => set('address', e.target.value)} placeholder="Street address"/></div>
          <div><label className="lbl">City</label><input className="inp" value={form.city} onChange={e => set('city', e.target.value)} placeholder="Surat"/></div>
          <div><label className="lbl">State</label><input className="inp" value={form.state} onChange={e => set('state', e.target.value)} placeholder="Gujarat"/></div>
        </div>
        {error && <p className="mx-6 mb-2 text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
        <div className="flex gap-3 px-6 pb-6 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="px-5 py-2 text-sm bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg font-medium disabled:opacity-50">
            {saving ? 'Saving...' : (editing ? 'Update' : 'Add Customer')}
          </button>
        </div>
        <style>{`.lbl{display:block;font-size:12px;font-weight:500;color:#475569;margin-bottom:4px}.inp{width:100%;border:1px solid #e2e8f0;border-radius:8px;padding:8px 12px;font-size:13px;color:#0f172a;outline:none}.inp:focus{border-color:#818cf8}`}</style>
      </div>
    </div>
  );
}

/* ─── Customer Detail Modal ─────────────────────────────────────── */
function CustomerDetailModal({ customer, onClose }) {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    if (!customer) return;
    setLoading(true);
    api.get(`/customers/${customer.id}/invoices`)
      .then(r => setInvoices(r.data.invoices || []))
      .catch(() => setInvoices([]))
      .finally(() => setLoading(false));
  }, [customer]);

  if (!customer) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose}/>
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white">
          <h2 className="text-base font-semibold text-slate-800">{customer.name}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><X size={18}/></button>
        </div>
        <div className="p-6 space-y-4">
          {/* Info */}
          <div className="bg-slate-50 rounded-xl p-4 grid grid-cols-2 gap-3 text-sm">
            {customer.phone && <div><p className="text-xs text-slate-400">Phone</p><p className="font-medium text-slate-700">{customer.phone}</p></div>}
            {customer.email && <div><p className="text-xs text-slate-400">Email</p><p className="font-medium text-slate-700">{customer.email}</p></div>}
            {customer.gstin && <div><p className="text-xs text-slate-400">GSTIN</p><p className="font-medium text-indigo-600">{customer.gstin}</p></div>}
            {customer.city  && <div><p className="text-xs text-slate-400">Location</p><p className="font-medium text-slate-700">{customer.city}, {customer.state}</p></div>}
            <div><p className="text-xs text-slate-400">Outstanding</p>
              <p className={`font-bold ${customer.balance > 0 ? 'text-red-500' : 'text-emerald-600'}`}>₹{fmtINR(Math.abs(customer.balance))}</p>
            </div>
          </div>
          {/* Invoices */}
          <div>
            <p className="text-sm font-semibold text-slate-700 mb-2">Invoice History</p>
            {loading ? <div className="h-20 bg-slate-100 rounded-xl animate-pulse"/> :
              invoices.length === 0 ? <p className="text-sm text-slate-400 text-center py-6">No invoices yet</p> :
              <div className="space-y-2">
                {invoices.map(inv => (
                  <div key={inv.id} className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-lg">
                    <div>
                      <p className="text-xs font-mono font-semibold text-indigo-600">{inv.invoice_no}</p>
                      <p className="text-xs text-slate-400">{new Date(inv.created_at).toLocaleDateString('en-IN')}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-slate-800">₹{fmtINR(inv.total)}</p>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${STATUS_STYLE[inv.status]}`}>{inv.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            }
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Customers Page ───────────────────────────────────────── */
export default function Customers() {
  const [customers,  setCustomers]  = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState('');
  const [page,       setPage]       = useState(1);
  const [pagination, setPagination] = useState({});
  const [modalOpen,  setModalOpen]  = useState(false);
  const [editing,    setEditing]    = useState(null);
  const [viewing,    setViewing]    = useState(null);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 15 });
      if (search) params.set('search', search);
      const res = await api.get(`/customers?${params}`);
      setCustomers(res.data.customers   || []);
      setPagination(res.data.pagination || {});
    } catch { setCustomers([]); }
    finally { setLoading(false); }
  }, [page, search]);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);
  useEffect(() => { setPage(1); }, [search]);

  const handleSave = async (form) => {
    if (editing) await api.put(`/customers/${editing.id}`, form);
    else         await api.post('/customers', form);
    fetchCustomers();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this customer?')) return;
    try { await api.delete(`/customers/${id}`); fetchCustomers(); }
    catch { alert('Delete failed'); }
  };

  const totalBalance = customers.reduce((s, c) => s + (c.balance || 0), 0);

  return (
    <>
      <div className="flex h-screen bg-slate-50 overflow-hidden">
        <div className="hidden lg:flex"><Sidebar /></div>
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <Navbar title="Customers" />
          <main className="flex-1 overflow-y-auto px-4 lg:px-6 py-5 space-y-4">

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label:'Total Customers',  value: pagination.total ?? customers.length, color:'text-indigo-600'  },
                { label:'Total Outstanding',value: `₹${fmtINR(totalBalance)}`,          color:'text-red-500'     },
                { label:'With GSTIN',       value: customers.filter(c=>c.gstin).length, color:'text-emerald-600' },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-white rounded-xl border border-slate-100 px-4 py-3">
                  <p className={`text-xl font-semibold ${color}`}>{value}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{label}</p>
                </div>
              ))}
            </div>

            {/* Toolbar */}
            <div className="flex gap-3 items-center justify-between">
              <div className="flex gap-2 flex-1">
                <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2 flex-1 max-w-xs">
                  <Search size={14} className="text-slate-400 shrink-0"/>
                  <input type="text" placeholder="Search customers..." value={search} onChange={e => setSearch(e.target.value)}
                    className="bg-transparent text-sm outline-none w-full text-slate-700 placeholder-slate-400"/>
                  {search && <button onClick={() => setSearch('')}><X size={13} className="text-slate-400"/></button>}
                </div>
                <button onClick={fetchCustomers} className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-500">
                  <RefreshCw size={15} className={loading ? 'animate-spin' : ''}/>
                </button>
              </div>
              <button onClick={() => { setEditing(null); setModalOpen(true); }}
                className="flex items-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium shrink-0">
                <Plus size={16}/> Add Customer
              </button>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-100 text-xs text-slate-400 uppercase">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium">Customer</th>
                      <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Contact</th>
                      <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">GSTIN</th>
                      <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Location</th>
                      <th className="text-right px-4 py-3 font-medium">Outstanding</th>
                      <th className="text-right px-4 py-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? Array(8).fill(0).map((_, i) => (
                      <tr key={i} className="border-b border-slate-50">
                        {Array(6).fill(0).map((_, j) => <td key={j} className="px-4 py-3"><div className="h-4 bg-slate-100 rounded animate-pulse"/></td>)}
                      </tr>
                    )) : customers.length === 0 ? (
                      <tr><td colSpan={6} className="px-4 py-16 text-center">
                        <Users size={36} className="mx-auto text-slate-200 mb-3"/>
                        <p className="text-slate-400 font-medium">No customers found</p>
                      </td></tr>
                    ) : customers.map(c => (
                      <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-semibold text-sm shrink-0">
                              {c.name.charAt(0).toUpperCase()}
                            </div>
                            <p className="font-medium text-slate-800">{c.name}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          {c.phone && <p className="text-xs text-slate-500 flex items-center gap-1"><Phone size={11}/>{c.phone}</p>}
                          {c.email && <p className="text-xs text-slate-400 flex items-center gap-1"><Mail size={11}/>{c.email}</p>}
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell text-xs font-mono text-slate-500">
                          {c.gstin || <span className="text-slate-300">—</span>}
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell text-xs text-slate-500">
                          {c.city ? `${c.city}, ${c.state}` : <span className="text-slate-300">—</span>}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className={`text-sm font-semibold ${c.balance > 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                            ₹{fmtINR(Math.abs(c.balance || 0))}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => setViewing(c)} className="p-1.5 rounded-lg hover:bg-indigo-50 text-indigo-400 hover:text-indigo-600"><Eye size={15}/></button>
                            <button onClick={() => { setEditing(c); setModalOpen(true); }} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"><Edit2 size={15}/></button>
                            <button onClick={() => handleDelete(c.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-500"><Trash2 size={15}/></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
                  <p className="text-xs text-slate-400">Page {page} of {pagination.totalPages}</p>
                  <div className="flex gap-2">
                    <button onClick={() => setPage(p => Math.max(1,p-1))} disabled={page===1} className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40"><ChevronLeft size={15}/></button>
                    <button onClick={() => setPage(p => Math.min(pagination.totalPages,p+1))} disabled={page===pagination.totalPages} className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40"><ChevronRight size={15}/></button>
                  </div>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
      <CustomerModal open={modalOpen} onClose={() => { setModalOpen(false); setEditing(null); }} onSave={handleSave} editing={editing}/>
      <CustomerDetailModal customer={viewing} onClose={() => setViewing(null)}/>
    </>
  );
}