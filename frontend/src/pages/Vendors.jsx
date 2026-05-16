import { useEffect, useState, useCallback } from 'react';
import { Plus, Search, X, Truck, Edit2, Trash2, RefreshCw, ChevronLeft, ChevronRight, Phone, Mail, ShoppingCart } from 'lucide-react';
import Navbar  from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import api     from '../api/axiosConfig';

const fmtINR = (n) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(n || 0);
const EMPTY  = { name:'', phone:'', email:'', gstin:'', address:'', balance:'' };

const PO_STYLE = {
  PENDING:'bg-amber-50 text-amber-700', RECEIVED:'bg-emerald-50 text-emerald-700', CANCELLED:'bg-red-50 text-red-600'
};

/* ─── Vendor Modal ──────────────────────────────────────────────── */
function VendorModal({ open, onClose, onSave, editing }) {
  const [form, setForm]   = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError]  = useState('');
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    setForm(editing ? { name:editing.name||'', phone:editing.phone||'', email:editing.email||'',
      gstin:editing.gstin||'', address:editing.address||'', balance:editing.balance||'' } : EMPTY);
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
          <h2 className="text-base font-semibold text-slate-800">{editing ? 'Edit Vendor' : 'Add Vendor'}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><X size={18}/></button>
        </div>
        <div className="p-6 grid grid-cols-2 gap-4">
          <div className="col-span-2"><label className="lbl">Name *</label><input className="inp" value={form.name} onChange={e => set('name',e.target.value)} placeholder="Vendor / Supplier name"/></div>
          <div><label className="lbl">Phone</label><input className="inp" value={form.phone} onChange={e => set('phone',e.target.value)} placeholder="9876543210"/></div>
          <div><label className="lbl">Email</label><input className="inp" type="email" value={form.email} onChange={e => set('email',e.target.value)} placeholder="vendor@email.com"/></div>
          <div className="col-span-2"><label className="lbl">GSTIN</label><input className="inp" value={form.gstin} onChange={e => set('gstin',e.target.value)} placeholder="22AAAAA0000A1Z5"/></div>
          <div className="col-span-2"><label className="lbl">Address</label><input className="inp" value={form.address} onChange={e => set('address',e.target.value)} placeholder="Street, City, State"/></div>
        </div>
        {error && <p className="mx-6 mb-2 text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
        <div className="flex gap-3 px-6 pb-6 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="px-5 py-2 text-sm bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg font-medium disabled:opacity-50">
            {saving ? 'Saving...' : (editing ? 'Update' : 'Add Vendor')}
          </button>
        </div>
        <style>{`.lbl{display:block;font-size:12px;font-weight:500;color:#475569;margin-bottom:4px}.inp{width:100%;border:1px solid #e2e8f0;border-radius:8px;padding:8px 12px;font-size:13px;color:#0f172a;outline:none}.inp:focus{border-color:#818cf8}`}</style>
      </div>
    </div>
  );
}

/* ─── Purchase Order Modal ──────────────────────────────────────── */
function POModal({ open, onClose, vendor, onDone }) {
  const [products, setProducts] = useState([]);
  const [items, setItems]       = useState([{ productId:'', qty:'1', price:'' }]);
  const [notes, setNotes]       = useState('');
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');

  useEffect(() => {
    if (!open) return;
    setItems([{ productId:'', qty:'1', price:'' }]); setNotes(''); setError('');
    api.get('/products?limit=100').then(r => setProducts(r.data.products || [])).catch(() => {});
  }, [open]);

  const setItem = (i, k, v) => setItems(items.map((it, idx) => idx === i ? { ...it, [k]: v } : it));
  const addItem = () => setItems([...items, { productId:'', qty:'1', price:'' }]);

  const handleSave = async () => {
    if (!items[0]?.productId) { setError('Select at least one product'); return; }
    setSaving(true); setError('');
    try {
      await api.post('/purchase-orders', {
        vendorId: vendor.id, notes,
        items: items.map(it => ({ productId: it.productId, qty: parseInt(it.qty)||1, price: parseFloat(it.price)||0 })),
      });
      onDone(); onClose();
    } catch (e) { setError(e.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const total = items.reduce((s, it) => s + (parseFloat(it.price)||0) * (parseInt(it.qty)||0), 0);

  if (!open || !vendor) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose}/>
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[88vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white">
          <div>
            <h2 className="text-base font-semibold text-slate-800">New Purchase Order</h2>
            <p className="text-xs text-slate-400">Vendor: {vendor.name}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><X size={18}/></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-slate-700">Items</p>
              <button onClick={addItem} className="text-xs text-indigo-500 flex items-center gap-1"><Plus size={12}/>Add</button>
            </div>
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-3 py-2">Product</th>
                    <th className="text-left px-3 py-2 w-20">Qty</th>
                    <th className="text-left px-3 py-2 w-28">Unit Price</th>
                    <th className="w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, i) => (
                    <tr key={i} className="border-b border-slate-100 last:border-0">
                      <td className="px-2 py-1.5">
                        <select className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs outline-none"
                          value={item.productId} onChange={e => {
                            const p = products.find(pr => pr.id === e.target.value);
                            setItem(i, 'productId', e.target.value);
                            if (p) setItem(i, 'price', p.cost_price || '');
                          }}>
                          <option value="">— Select Product —</option>
                          {products.map(p => <option key={p.id} value={p.id}>{p.name} (Stock: {p.stock_qty})</option>)}
                        </select>
                      </td>
                      <td className="px-2 py-1.5"><input type="number" min="1" value={item.qty} onChange={e => setItem(i,'qty',e.target.value)} className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs outline-none"/></td>
                      <td className="px-2 py-1.5"><input type="number" min="0" value={item.price} onChange={e => setItem(i,'price',e.target.value)} placeholder="0.00" className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs outline-none"/></td>
                      <td className="px-2 py-1.5">
                        {items.length > 1 && <button onClick={() => setItems(items.filter((_,idx) => idx!==i))} className="text-slate-300 hover:text-red-400"><X size={13}/></button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="flex gap-4 items-end">
            <div className="flex-1"><label className="lbl">Notes</label><input className="inp" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional"/></div>
            <div className="bg-indigo-50 rounded-xl px-4 py-2 text-right shrink-0">
              <p className="text-xs text-indigo-400">Total</p>
              <p className="text-lg font-bold text-indigo-700">₹{fmtINR(total)}</p>
            </div>
          </div>
        </div>
        {error && <p className="mx-6 mb-2 text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
        <div className="flex gap-3 px-6 pb-6 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="px-5 py-2 text-sm bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg font-medium disabled:opacity-50">
            {saving ? 'Creating...' : 'Create PO'}
          </button>
        </div>
        <style>{`.lbl{display:block;font-size:12px;font-weight:500;color:#475569;margin-bottom:4px}.inp{width:100%;border:1px solid #e2e8f0;border-radius:8px;padding:8px 12px;font-size:13px;color:#0f172a;outline:none}.inp:focus{border-color:#818cf8}`}</style>
      </div>
    </div>
  );
}

/* ─── Main Vendors Page ─────────────────────────────────────────── */
export default function Vendors() {
  const [vendors,    setVendors]    = useState([]);
  const [pos,        setPOs]        = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState('');
  const [page,       setPage]       = useState(1);
  const [pagination, setPagination] = useState({});
  const [modalOpen,  setModalOpen]  = useState(false);
  const [editing,    setEditing]    = useState(null);
  const [poVendor,   setPOVendor]   = useState(null);
  const [tab,        setTab]        = useState('vendors');

  const fetchVendors = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 15 });
      if (search) params.set('search', search);
      const res = await api.get(`/vendors?${params}`);
      setVendors(res.data.vendors    || []);
      setPagination(res.data.pagination || {});
    } catch { setVendors([]); }
    finally { setLoading(false); }
  }, [page, search]);

  const fetchPOs = useCallback(async () => {
    try { const res = await api.get('/purchase-orders'); setPOs(res.data.purchase_orders || []); }
    catch { setPOs([]); }
  }, []);

  useEffect(() => { fetchVendors(); fetchPOs(); }, [fetchVendors, fetchPOs]);
  useEffect(() => { setPage(1); }, [search]);

  const handleSave = async (form) => {
    if (editing) await api.put(`/vendors/${editing.id}`, form);
    else         await api.post('/vendors', form);
    fetchVendors();
  };

  return (
    <>
      <div className="flex h-screen bg-slate-50 overflow-hidden">
        <div className="hidden lg:flex"><Sidebar /></div>
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <Navbar title="Vendors" />
          <main className="flex-1 overflow-y-auto px-4 lg:px-6 py-5 space-y-4">

            {/* Tabs */}
            <div className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1 w-fit">
              {['vendors','purchase-orders'].map(t => (
                <button key={t} onClick={() => setTab(t)}
                  className={`px-4 py-1.5 text-sm rounded-lg font-medium transition-colors ${tab===t ? 'bg-indigo-500 text-white' : 'text-slate-500 hover:text-slate-700'}`}>
                  {t === 'vendors' ? 'Vendors' : 'Purchase Orders'}
                </button>
              ))}
            </div>

            {tab === 'vendors' ? (
              <>
                <div className="flex gap-3 items-center justify-between">
                  <div className="flex gap-2 flex-1">
                    <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2 flex-1 max-w-xs">
                      <Search size={14} className="text-slate-400 shrink-0"/>
                      <input type="text" placeholder="Search vendors..." value={search} onChange={e => setSearch(e.target.value)}
                        className="bg-transparent text-sm outline-none w-full text-slate-700 placeholder-slate-400"/>
                      {search && <button onClick={() => setSearch('')}><X size={13} className="text-slate-400"/></button>}
                    </div>
                    <button onClick={fetchVendors} className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-500">
                      <RefreshCw size={15} className={loading ? 'animate-spin' : ''}/>
                    </button>
                  </div>
                  <button onClick={() => { setEditing(null); setModalOpen(true); }}
                    className="flex items-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium shrink-0">
                    <Plus size={16}/> Add Vendor
                  </button>
                </div>

                <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-100 text-xs text-slate-400 uppercase">
                      <tr>
                        <th className="text-left px-4 py-3 font-medium">Vendor</th>
                        <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Contact</th>
                        <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">GSTIN</th>
                        <th className="text-right px-4 py-3 font-medium">Balance</th>
                        <th className="text-right px-4 py-3 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? Array(6).fill(0).map((_, i) => (
                        <tr key={i} className="border-b border-slate-50">{Array(5).fill(0).map((_,j) => <td key={j} className="px-4 py-3"><div className="h-4 bg-slate-100 rounded animate-pulse"/></td>)}</tr>
                      )) : vendors.length === 0 ? (
                        <tr><td colSpan={5} className="px-4 py-16 text-center">
                          <Truck size={36} className="mx-auto text-slate-200 mb-3"/>
                          <p className="text-slate-400">No vendors found</p>
                        </td></tr>
                      ) : vendors.map(v => (
                        <tr key={v.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 font-semibold text-sm shrink-0">
                                {v.name.charAt(0).toUpperCase()}
                              </div>
                              <p className="font-medium text-slate-800">{v.name}</p>
                            </div>
                          </td>
                          <td className="px-4 py-3 hidden md:table-cell">
                            {v.phone && <p className="text-xs text-slate-500 flex items-center gap-1"><Phone size={11}/>{v.phone}</p>}
                            {v.email && <p className="text-xs text-slate-400 flex items-center gap-1"><Mail size={11}/>{v.email}</p>}
                          </td>
                          <td className="px-4 py-3 hidden lg:table-cell text-xs font-mono text-slate-500">
                            {v.gstin || <span className="text-slate-300">—</span>}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className={`text-sm font-semibold ${v.balance > 0 ? 'text-red-500' : 'text-emerald-600'}`}>₹{fmtINR(Math.abs(v.balance||0))}</span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-1">
                              <button onClick={() => setPOVendor(v)} title="Create PO"
                                className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-400 hover:text-amber-600"><ShoppingCart size={15}/></button>
                              <button onClick={() => { setEditing(v); setModalOpen(true); }} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"><Edit2 size={15}/></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              /* Purchase Orders tab */
              <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-100 text-xs text-slate-400 uppercase">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium">PO Number</th>
                      <th className="text-left px-4 py-3 font-medium">Vendor</th>
                      <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Date</th>
                      <th className="text-right px-4 py-3 font-medium">Total</th>
                      <th className="text-center px-4 py-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pos.length === 0 ? (
                      <tr><td colSpan={5} className="px-4 py-16 text-center">
                        <ShoppingCart size={36} className="mx-auto text-slate-200 mb-3"/>
                        <p className="text-slate-400">No purchase orders yet</p>
                        <p className="text-slate-300 text-xs mt-1">Go to Vendors tab → click PO icon</p>
                      </td></tr>
                    ) : pos.map(po => (
                      <tr key={po.id} className="border-b border-slate-50 hover:bg-slate-50">
                        <td className="px-4 py-3 font-mono text-xs text-indigo-600 font-semibold">{po.po_number}</td>
                        <td className="px-4 py-3 font-medium text-slate-800">{po.vendor?.name}</td>
                        <td className="px-4 py-3 text-xs text-slate-400 hidden md:table-cell">
                          {new Date(po.created_at).toLocaleDateString('en-IN')}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-800">₹{fmtINR(po.total)}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${PO_STYLE[po.status]}`}>{po.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </main>
        </div>
      </div>
      <VendorModal open={modalOpen} onClose={() => { setModalOpen(false); setEditing(null); }} onSave={handleSave} editing={editing}/>
      <POModal open={!!poVendor} onClose={() => setPOVendor(null)} vendor={poVendor} onDone={() => { fetchVendors(); fetchPOs(); }}/>
    </>
  );
}