import { useEffect, useState, useCallback } from 'react';
import {
  Plus, Search, RefreshCw, Package,
  AlertTriangle, Edit2, Trash2, TrendingDown,
  TrendingUp, X, ChevronLeft, ChevronRight
} from 'lucide-react';
import Navbar   from '../components/Navbar';
import Sidebar  from '../components/Sidebar';
import api      from '../api/axiosConfig';

/* ─── helpers ──────────────────────────────────────────────────────── */
const fmtINR = (n) =>
  new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(n || 0);

const UNITS    = ['Pcs', 'Kg', 'Gm', 'L', 'Ml', 'Box', 'Pkt', 'Carton', 'Dozen', 'Mtr'];
const GST_RATES = [0, 5, 12, 18, 28];

const EMPTY_FORM = {
  name: '', sku: '', hsn_code: '', description: '',
  price: '', cost_price: '', stock_qty: '', min_threshold: '5',
  unit: 'Pcs', gst_rate: '18', category_id: '',
};

/* ─── Stock Badge ───────────────────────────────────────────────────── */
function StockBadge({ qty, min }) {
  if (qty === 0)       return <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-100 text-red-700">Out of Stock</span>;
  if (qty < min)       return <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-700">Low Stock</span>;
  return                      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700">In Stock</span>;
}

/* ─── Product Form Modal ────────────────────────────────────────────── */
function ProductModal({ open, onClose, onSave, categories, editing }) {
  const [form, setForm]   = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError]  = useState('');

  useEffect(() => {
    if (editing) {
      setForm({
        name:          editing.name          || '',
        sku:           editing.sku           || '',
        hsn_code:      editing.hsn_code      || '',
        description:   editing.description   || '',
        price:         editing.price         ?? '',
        cost_price:    editing.cost_price    ?? '',
        stock_qty:     editing.stock_qty     ?? '',
        min_threshold: editing.min_threshold ?? '5',
        unit:          editing.unit          || 'Pcs',
        gst_rate:      editing.gst_rate      ?? '18',
        category_id:   editing.category_id   || '',
      });
    } else {
      setForm(EMPTY_FORM);
    }
    setError('');
  }, [editing, open]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.name.trim()) { setError('Product name is required'); return; }
    if (!form.price)        { setError('Selling price is required'); return; }
    setSaving(true);
    setError('');
    try {
      await onSave(form);
      onClose();
    } catch (e) {
      setError(e.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
          <h2 className="text-base font-semibold text-slate-800">
            {editing ? 'Edit Product' : 'Add New Product'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Name */}
          <div className="md:col-span-2">
            <label className="label">Product Name *</label>
            <input className="input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Tata Salt 1kg" />
          </div>
          {/* SKU */}
          <div>
            <label className="label">SKU</label>
            <input className="input" value={form.sku} onChange={e => set('sku', e.target.value)} placeholder="Auto-generated if empty" />
          </div>
          {/* HSN */}
          <div>
            <label className="label">HSN Code</label>
            <input className="input" value={form.hsn_code} onChange={e => set('hsn_code', e.target.value)} placeholder="e.g. 2501" />
          </div>
          {/* Selling Price */}
          <div>
            <label className="label">Selling Price (₹) *</label>
            <input className="input" type="number" min="0" value={form.price} onChange={e => set('price', e.target.value)} placeholder="0.00" />
          </div>
          {/* Cost Price */}
          <div>
            <label className="label">Cost Price (₹)</label>
            <input className="input" type="number" min="0" value={form.cost_price} onChange={e => set('cost_price', e.target.value)} placeholder="0.00" />
          </div>
          {/* Stock Qty */}
          <div>
            <label className="label">Opening Stock</label>
            <input className="input" type="number" min="0" value={form.stock_qty} onChange={e => set('stock_qty', e.target.value)} placeholder="0" />
          </div>
          {/* Min Threshold */}
          <div>
            <label className="label">Min Threshold (Low Stock Alert)</label>
            <input className="input" type="number" min="0" value={form.min_threshold} onChange={e => set('min_threshold', e.target.value)} placeholder="5" />
          </div>
          {/* Unit */}
          <div>
            <label className="label">Unit</label>
            <select className="input" value={form.unit} onChange={e => set('unit', e.target.value)}>
              {UNITS.map(u => <option key={u}>{u}</option>)}
            </select>
          </div>
          {/* GST Rate */}
          <div>
            <label className="label">GST Rate (%)</label>
            <select className="input" value={form.gst_rate} onChange={e => set('gst_rate', e.target.value)}>
              {GST_RATES.map(r => <option key={r} value={r}>{r}%</option>)}
            </select>
          </div>
          {/* Category */}
          <div>
            <label className="label">Category</label>
            <select className="input" value={form.category_id} onChange={e => set('category_id', e.target.value)}>
              <option value="">— No Category —</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          {/* Description */}
          <div className="md:col-span-2">
            <label className="label">Description</label>
            <textarea className="input resize-none" rows={2} value={form.description} onChange={e => set('description', e.target.value)} placeholder="Optional product notes..." />
          </div>
        </div>

        {error && <p className="mx-6 mb-2 text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

        <div className="flex gap-3 px-6 pb-6 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="px-5 py-2 text-sm bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg font-medium disabled:opacity-50">
            {saving ? 'Saving...' : (editing ? 'Update Product' : 'Add Product')}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Stock Adjust Modal ────────────────────────────────────────────── */
function StockModal({ open, onClose, product, onDone }) {
  const [type,   setType]   = useState('IN');
  const [qty,    setQty]    = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  useEffect(() => { setQty(''); setReason(''); setError(''); }, [open]);

  const handleSubmit = async () => {
    if (!qty || Number(qty) < 1) { setError('Quantity must be at least 1'); return; }
    setSaving(true); setError('');
    try {
      const endpoint = type === 'IN' ? '/inventory/stock-in' : '/inventory/stock-out';
      await api.post(endpoint, { productId: product.id, qty: Number(qty), reason });
      onDone();
      onClose();
    } catch (e) {
      setError(e.response?.data?.message || 'Stock update failed');
    } finally {
      setSaving(false);
    }
  };

  if (!open || !product) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-slate-800">Adjust Stock</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><X size={18}/></button>
        </div>
        <p className="text-sm text-slate-500 mb-4">
          <span className="font-medium text-slate-700">{product.name}</span> — Current: <strong>{product.stock_qty} {product.unit}</strong>
        </p>

        {/* Type toggle */}
        <div className="flex gap-2 mb-4">
          {['IN','OUT'].map(t => (
            <button key={t} onClick={() => setType(t)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                type === t
                  ? t === 'IN' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}>
              {t === 'IN' ? <span className="flex items-center justify-center gap-1"><TrendingUp size={14}/>Stock In</span>
                           : <span className="flex items-center justify-center gap-1"><TrendingDown size={14}/>Stock Out</span>}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          <div>
            <label className="label">Quantity *</label>
            <input className="input" type="number" min="1" value={qty} onChange={e => setQty(e.target.value)} placeholder="Enter quantity" />
          </div>
          <div>
            <label className="label">Reason</label>
            <input className="input" value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. Purchase from vendor" />
          </div>
        </div>

        {error && <p className="mt-2 text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

        <div className="flex gap-3 mt-5 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600">Cancel</button>
          <button onClick={handleSubmit} disabled={saving}
            className={`px-5 py-2 text-sm text-white rounded-lg font-medium disabled:opacity-50 ${type==='IN'?'bg-emerald-500 hover:bg-emerald-600':'bg-red-500 hover:bg-red-600'}`}>
            {saving ? 'Saving...' : `Confirm ${type}`}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Inventory Page ───────────────────────────────────────────── */
export default function Inventory() {
  const [products,   setProducts]   = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState('');
  const [catFilter,  setCatFilter]  = useState('');
  const [page,       setPage]       = useState(1);
  const [pagination, setPagination] = useState({});
  const [modalOpen,  setModalOpen]  = useState(false);
  const [editing,    setEditing]    = useState(null);
  const [stockModal, setStockModal] = useState(null);
  const [deleting,   setDeleting]   = useState(null);

  /* fetch products */
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 15 });
      if (search)    params.set('search',     search);
      if (catFilter) params.set('categoryId', catFilter);
      const res = await api.get(`/products?${params}`);
      setProducts(res.data.products   || []);
      setPagination(res.data.pagination || {});
    } catch {
      // Show empty state — backend connect na hoy to
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, catFilter]);

  /* fetch categories */
  const fetchCategories = async () => {
    try {
      const res = await api.get('/products/categories');
      setCategories(res.data.categories || []);
    } catch { setCategories([]); }
  };

  useEffect(() => { fetchCategories(); }, []);
  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  /* search debounce */
  useEffect(() => { setPage(1); }, [search, catFilter]);

  /* save product */
  const handleSave = async (form) => {
    if (editing) {
      await api.put(`/products/${editing.id}`, form);
    } else {
      await api.post('/products', form);
    }
    fetchProducts();
  };

  /* delete */
  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    setDeleting(id);
    try { await api.delete(`/products/${id}`); fetchProducts(); }
    catch { alert('Delete failed'); }
    finally { setDeleting(null); }
  };

  /* stats */
  const totalValue  = products.reduce((s, p) => s + (p.cost_price * p.stock_qty), 0);
  const lowCount    = products.filter(p => p.stock_qty < p.min_threshold).length;
  const outCount    = products.filter(p => p.stock_qty === 0).length;

  return (
    <>
      {/* Reusable CSS classes */}
      <style>{`
        .label { display:block; font-size:12px; font-weight:500; color:#475569; margin-bottom:4px; }
        .input { width:100%; border:1px solid #e2e8f0; border-radius:8px; padding:8px 12px; font-size:13px;
                 color:#0f172a; outline:none; background:#fff; transition:border-color .15s; }
        .input:focus { border-color:#818cf8; box-shadow:0 0 0 3px rgba(99,102,241,.1); }
      `}</style>

      <div className="flex h-screen bg-slate-50 overflow-hidden">
        <div className="hidden lg:flex"><Sidebar /></div>
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <Navbar title="Inventory" />

          <main className="flex-1 overflow-y-auto px-4 lg:px-6 py-5 space-y-4">

            {/* ── Top stats ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { label: 'Total Products', value: pagination.total ?? products.length, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                { label: 'Stock Value',    value: `₹${fmtINR(totalValue)}`,            color: 'text-emerald-600', bg: 'bg-emerald-50' },
                { label: 'Low Stock',      value: lowCount,                            color: 'text-amber-600',  bg: 'bg-amber-50'  },
                { label: 'Out of Stock',   value: outCount,                            color: 'text-red-600',    bg: 'bg-red-50'    },
              ].map(({ label, value, color, bg }) => (
                <div key={label} className="bg-white rounded-xl border border-slate-100 px-4 py-3">
                  <p className={`text-xl font-semibold ${color}`}>{value}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{label}</p>
                </div>
              ))}
            </div>

            {/* ── Toolbar ── */}
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
              <div className="flex gap-2 flex-1 flex-wrap">
                {/* Search */}
                <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2 flex-1 min-w-48 max-w-xs">
                  <Search size={14} className="text-slate-400 shrink-0" />
                  <input type="text" placeholder="Search products, SKU..."
                    value={search} onChange={e => setSearch(e.target.value)}
                    className="bg-transparent text-sm text-slate-700 placeholder-slate-400 outline-none w-full" />
                  {search && <button onClick={() => setSearch('')}><X size={13} className="text-slate-400" /></button>}
                </div>
                {/* Category filter */}
                <select value={catFilter} onChange={e => setCatFilter(e.target.value)}
                  className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-600 outline-none">
                  <option value="">All Categories</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                {/* Refresh */}
                <button onClick={fetchProducts}
                  className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-500">
                  <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
                </button>
              </div>
              {/* Add product */}
              <button onClick={() => { setEditing(null); setModalOpen(true); }}
                className="flex items-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shrink-0">
                <Plus size={16} /> Add Product
              </button>
            </div>

            {/* ── Product Table ── */}
            <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-slate-400 uppercase tracking-wide border-b border-slate-100 bg-slate-50">
                      <th className="text-left px-4 py-3 font-medium">Product</th>
                      <th className="text-left px-4 py-3 font-medium hidden md:table-cell">SKU / HSN</th>
                      <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Category</th>
                      <th className="text-right px-4 py-3 font-medium">Price</th>
                      <th className="text-center px-4 py-3 font-medium">Stock</th>
                      <th className="text-center px-4 py-3 font-medium">Status</th>
                      <th className="text-right px-4 py-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      Array(8).fill(0).map((_, i) => (
                        <tr key={i} className="border-b border-slate-50">
                          {Array(7).fill(0).map((_, j) => (
                            <td key={j} className="px-4 py-3">
                              <div className="h-4 bg-slate-100 rounded animate-pulse" />
                            </td>
                          ))}
                        </tr>
                      ))
                    ) : products.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-16 text-center">
                          <Package size={36} className="mx-auto text-slate-200 mb-3" />
                          <p className="text-slate-400 font-medium">No products found</p>
                          <p className="text-slate-300 text-xs mt-1">
                            {search ? 'Try a different search term' : 'Click "Add Product" to get started'}
                          </p>
                        </td>
                      </tr>
                    ) : (
                      products.map((p) => (
                        <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                          {/* Name + desc */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                                <Package size={14} className="text-indigo-400" />
                              </div>
                              <div>
                                <p className="font-medium text-slate-800 leading-tight">{p.name}</p>
                                {p.description && <p className="text-xs text-slate-400 truncate max-w-[180px]">{p.description}</p>}
                              </div>
                            </div>
                          </td>
                          {/* SKU / HSN */}
                          <td className="px-4 py-3 hidden md:table-cell">
                            <p className="text-xs font-mono text-slate-500">{p.sku || '—'}</p>
                            {p.hsn_code && <p className="text-xs text-slate-300">HSN: {p.hsn_code}</p>}
                          </td>
                          {/* Category */}
                          <td className="px-4 py-3 hidden lg:table-cell text-xs text-slate-500">
                            {p.category?.name || <span className="text-slate-300">—</span>}
                          </td>
                          {/* Price */}
                          <td className="px-4 py-3 text-right">
                            <p className="font-semibold text-slate-800">₹{fmtINR(p.price)}</p>
                            {p.cost_price > 0 && <p className="text-xs text-slate-400">Cost: ₹{fmtINR(p.cost_price)}</p>}
                          </td>
                          {/* Stock qty */}
                          <td className="px-4 py-3 text-center">
                            <p className={`font-semibold ${p.stock_qty === 0 ? 'text-red-500' : p.stock_qty < p.min_threshold ? 'text-amber-600' : 'text-slate-800'}`}>
                              {p.stock_qty}
                            </p>
                            <p className="text-xs text-slate-300">{p.unit}</p>
                          </td>
                          {/* Status badge */}
                          <td className="px-4 py-3 text-center">
                            <StockBadge qty={p.stock_qty} min={p.min_threshold} />
                          </td>
                          {/* Actions */}
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-1">
                              {/* Stock adjust */}
                              <button onClick={() => setStockModal(p)} title="Adjust Stock"
                                className="p-1.5 rounded-lg hover:bg-indigo-50 text-indigo-400 hover:text-indigo-600 transition-colors">
                                <TrendingUp size={15} />
                              </button>
                              {/* Edit */}
                              <button onClick={() => { setEditing(p); setModalOpen(true); }} title="Edit"
                                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                                <Edit2 size={15} />
                              </button>
                              {/* Delete */}
                              <button onClick={() => handleDelete(p.id)} title="Delete"
                                disabled={deleting === p.id}
                                className="p-1.5 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-500 transition-colors">
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
                  <p className="text-xs text-slate-400">
                    Showing {(page - 1) * 15 + 1}–{Math.min(page * 15, pagination.total)} of {pagination.total}
                  </p>
                  <div className="flex gap-2">
                    <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                      className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40">
                      <ChevronLeft size={15} />
                    </button>
                    <button onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))} disabled={page === pagination.totalPages}
                      className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40">
                      <ChevronRight size={15} />
                    </button>
                  </div>
                </div>
              )}
            </div>

          </main>
        </div>
      </div>

      {/* Modals */}
      <ProductModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditing(null); }}
        onSave={handleSave}
        categories={categories}
        editing={editing}
      />
      <StockModal
        open={!!stockModal}
        onClose={() => setStockModal(null)}
        product={stockModal}
        onDone={fetchProducts}
      />
    </>
  );
}