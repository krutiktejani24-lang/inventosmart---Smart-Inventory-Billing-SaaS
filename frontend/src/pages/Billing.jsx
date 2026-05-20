import { useEffect, useState, useCallback } from 'react';
import {
  Plus, Search, X, FileText, Download,
  Mail, ChevronLeft, ChevronRight, Eye,
  CheckCircle, Send, XCircle, RefreshCw,
  MessageCircle
} from 'lucide-react';
import UPIQRModal from '../components/UPIQRModal';
import Navbar  from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import api     from '../api/axiosConfig';

const fmtINR = (n) =>
  new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(n || 0);

const STATUS_STYLE = {
  PAID:      'bg-emerald-50 text-emerald-700 border-emerald-200',
  SENT:      'bg-blue-50 text-blue-700 border-blue-200',
  DRAFT:     'bg-slate-100 text-slate-600 border-slate-200',
  PENDING:   'bg-amber-50 text-amber-700 border-amber-200',
  CANCELLED: 'bg-red-50 text-red-600 border-red-200',
};

const EMPTY_INVOICE = {
  customerId: '', placeOfSupply: '', businessState: 'Gujarat',
  discount: '0', notes: '', dueDate: '',
  items: [{ name:'', hsn_code:'', qty:'1', price:'', discount:'0', gst_rate:'18' }],
};

/* ─── WhatsApp Share Modal ──────────────────────────────────────── */
function WhatsAppModal({ invoice, onClose }) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied,  setCopied]  = useState(false);

  useEffect(() => {
    if (!invoice) return;
    setLoading(true);
    api.get(`/invoices/${invoice.id}/whatsapp`)
      .then(r => setData(r.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [invoice]);

  const handleOpen = () => {
    if (data?.whatsappURL) window.open(data.whatsappURL, '_blank');
  };

  const handleCopy = () => {
    if (data?.message) {
      navigator.clipboard.writeText(data.message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!invoice) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose}/>
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100">
          <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center">
            <MessageCircle size={18} className="text-emerald-600"/>
          </div>
          <div className="flex-1">
            <h2 className="text-sm font-semibold text-slate-800">Share on WhatsApp</h2>
            <p className="text-xs text-slate-400">{invoice.invoice_no}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
            <X size={18}/>
          </button>
        </div>

        <div className="p-6 space-y-4">
          {loading ? (
            <div className="space-y-3">
              {[80,60,90,50].map((w,i) => (
                <div key={i} className="h-3 bg-slate-100 rounded-full animate-pulse" style={{width:`${w}%`}}/>
              ))}
            </div>
          ) : data ? (
            <>
              {/* Customer info */}
              <div className="bg-emerald-50 rounded-xl px-4 py-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-200 flex items-center justify-center text-emerald-700 font-semibold text-sm">
                  {data.customerName?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-800">{data.customerName}</p>
                  <p className="text-xs text-slate-500">
                    {data.customerPhone ? `📱 ${data.customerPhone}` : 'No phone number saved'}
                  </p>
                </div>
              </div>

              {/* Message preview */}
              <div>
                <p className="text-xs font-medium text-slate-500 mb-2">Message Preview</p>
                <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 max-h-48 overflow-y-auto">
                  <pre className="text-xs text-slate-600 whitespace-pre-wrap font-sans leading-relaxed">
                    {data.message}
                  </pre>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-1">
                {/* Open WhatsApp */}
                <button onClick={handleOpen}
                  className="flex-1 flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white py-2.5 rounded-xl text-sm font-medium transition-colors">
                  <MessageCircle size={16}/>
                  {data.customerPhone ? 'Open WhatsApp' : 'Share via WhatsApp'}
                </button>
                {/* Copy message */}
                <button onClick={handleCopy}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-medium transition-colors">
                  {copied ? '✓ Copied!' : 'Copy'}
                </button>
              </div>

              {!data.customerPhone && (
                <p className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
                  ⚠️ Customer na phone number nathi — WhatsApp share dialog khulashe
                </p>
              )}
            </>
          ) : (
            <p className="text-sm text-red-500 text-center py-4">Failed to load — try again</p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Create Invoice Modal ──────────────────────────────────────── */
function CreateInvoiceModal({ open, onClose, onDone }) {
  const [form, setForm]           = useState(EMPTY_INVOICE);
  const [customers, setCustomers] = useState([]);
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState('');

  useEffect(() => {
    if (!open) return;
    setForm(EMPTY_INVOICE); setError('');
    api.get('/customers?limit=100').then(r => setCustomers(r.data.customers || [])).catch(() => {});
  }, [open]);

  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setItem  = (i, k, v) =>
    setForm(f => ({ ...f, items: f.items.map((it, idx) => idx===i ? { ...it, [k]:v } : it) }));

  const addItem    = () => setForm(f => ({ ...f, items: [...f.items, { name:'', hsn_code:'', qty:'1', price:'', discount:'0', gst_rate:'18' }] }));
  const removeItem = (i) => setForm(f => ({ ...f, items: f.items.filter((_,idx) => idx!==i) }));

  const preview = form.items.reduce((s, it) => {
    const base = (parseFloat(it.price)||0) * (parseInt(it.qty)||0);
    const disc = base * (parseFloat(it.discount)||0) / 100;
    const tax  = (base - disc) * (parseFloat(it.gst_rate)||0) / 100;
    return s + base - disc + tax;
  }, 0);

  const handleSave = async () => {
    if (!form.customerId) { setError('Please select a customer'); return; }
    if (!form.items[0]?.name)  { setError('Add at least one item'); return; }
    if (!form.items[0]?.price) { setError('Item price is required'); return; }
    setSaving(true); setError('');
    try {
      await api.post('/invoices', {
        ...form,
        items: form.items.map(it => ({
          ...it,
          qty:      parseInt(it.qty)        || 1,
          price:    parseFloat(it.price)    || 0,
          discount: parseFloat(it.discount) || 0,
          gst_rate: parseFloat(it.gst_rate) || 18,
        })),
        discount: parseFloat(form.discount) || 0,
      });
      onDone(); onClose();
    } catch (e) { setError(e.response?.data?.message || 'Failed to create invoice'); }
    finally { setSaving(false); }
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose}/>
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
          <h2 className="text-base font-semibold text-slate-800">Create New Invoice</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><X size={18}/></button>
        </div>
        <div className="p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="lbl">Customer *</label>
              <select className="inp" value={form.customerId} onChange={e => setField('customerId', e.target.value)}>
                <option value="">— Select Customer —</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}{c.phone ? ` (${c.phone})` : ''}</option>)}
              </select>
            </div>
            <div>
              <label className="lbl">Due Date</label>
              <input className="inp" type="date" value={form.dueDate} onChange={e => setField('dueDate', e.target.value)}/>
            </div>
            <div>
              <label className="lbl">Place of Supply</label>
              <input className="inp" value={form.placeOfSupply} onChange={e => setField('placeOfSupply', e.target.value)} placeholder="e.g. Gujarat"/>
            </div>
            <div>
              <label className="lbl">Business State</label>
              <input className="inp" value={form.businessState} onChange={e => setField('businessState', e.target.value)} placeholder="e.g. Gujarat"/>
            </div>
            <div>
              <label className="lbl">Invoice Discount (%)</label>
              <input className="inp" type="number" min="0" max="100" value={form.discount} onChange={e => setField('discount', e.target.value)}/>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-slate-700">Line Items</p>
              <button onClick={addItem} className="flex items-center gap-1 text-xs text-indigo-500 hover:text-indigo-700">
                <Plus size={13}/> Add Item
              </button>
            </div>
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>{['Item Name','HSN','Qty','Price','Disc%','GST%',''].map(h => (
                    <th key={h} className="text-left px-3 py-2 text-xs font-medium text-slate-500">{h}</th>
                  ))}</tr>
                </thead>
                <tbody>
                  {form.items.map((item, i) => (
                    <tr key={i} className="border-b border-slate-100 last:border-0">
                      <td className="px-2 py-1.5"><input className="inp-sm" value={item.name} onChange={e => setItem(i,'name',e.target.value)} placeholder="Product name"/></td>
                      <td className="px-2 py-1.5 w-20"><input className="inp-sm" value={item.hsn_code} onChange={e => setItem(i,'hsn_code',e.target.value)} placeholder="HSN"/></td>
                      <td className="px-2 py-1.5 w-16"><input className="inp-sm" type="number" min="1" value={item.qty} onChange={e => setItem(i,'qty',e.target.value)}/></td>
                      <td className="px-2 py-1.5 w-24"><input className="inp-sm" type="number" min="0" value={item.price} onChange={e => setItem(i,'price',e.target.value)} placeholder="0.00"/></td>
                      <td className="px-2 py-1.5 w-16"><input className="inp-sm" type="number" min="0" max="100" value={item.discount} onChange={e => setItem(i,'discount',e.target.value)}/></td>
                      <td className="px-2 py-1.5 w-16">
                        <select className="inp-sm" value={item.gst_rate} onChange={e => setItem(i,'gst_rate',e.target.value)}>
                          {[0,5,12,18,28].map(r => <option key={r} value={r}>{r}%</option>)}
                        </select>
                      </td>
                      <td className="px-2 py-1.5 w-8">
                        {form.items.length > 1 && <button onClick={() => removeItem(i)} className="text-slate-300 hover:text-red-400"><X size={14}/></button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label className="lbl">Notes</label>
              <textarea className="inp resize-none" rows={2} value={form.notes} onChange={e => setField('notes', e.target.value)} placeholder="Thank you for your business!"/>
            </div>
            <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-5 py-3 min-w-[180px] flex flex-col justify-center">
              <p className="text-xs text-indigo-400 mb-1">Estimated Total</p>
              <p className="text-2xl font-bold text-indigo-700">₹{fmtINR(preview)}</p>
              <p className="text-xs text-indigo-300 mt-1">incl. GST</p>
            </div>
          </div>
        </div>

        {error && <p className="mx-6 mb-2 text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
        <div className="flex gap-3 px-6 pb-6 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="px-5 py-2 text-sm bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg font-medium disabled:opacity-50">
            {saving ? 'Creating...' : 'Create Invoice'}
          </button>
        </div>
        <style>{`.lbl{display:block;font-size:12px;font-weight:500;color:#475569;margin-bottom:4px}.inp{width:100%;border:1px solid #e2e8f0;border-radius:8px;padding:8px 12px;font-size:13px;color:#0f172a;outline:none}.inp:focus{border-color:#818cf8}.inp-sm{width:100%;border:1px solid #e2e8f0;border-radius:6px;padding:5px 8px;font-size:12px;color:#0f172a;outline:none}.inp-sm:focus{border-color:#818cf8}`}</style>
      </div>
    </div>
  );
}

/* ─── Invoice Detail Modal ──────────────────────────────────────── */
function InvoiceDetailModal({ invoice, onClose, onRefresh }) {
  const [sending,  setSending]  = useState(false);
  const [whatsapp, setWhatsapp] = useState(false);
  if (!invoice) return null;

  const totalTax = (invoice.cgst||0) + (invoice.sgst||0) + (invoice.igst||0);

  const handleEmail = async () => {
    setSending(true);
    try { await api.post(`/invoices/${invoice.id}/send-email`); alert('Email sent!'); onRefresh(); }
    catch (e) { alert(e.response?.data?.message || 'Email failed'); }
    finally { setSending(false); }
  };

  const handleStatus = async (status) => {
    try { await api.put(`/invoices/${invoice.id}/status`, { status }); onRefresh(); onClose(); }
    catch (e) { alert(e.response?.data?.message || 'Failed'); }
  };

  return (
    <>
      <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/50" onClick={onClose}/>
        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto z-10">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
            <div>
              <h2 className="text-base font-semibold text-slate-800">{invoice.invoice_no}</h2>
              <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_STYLE[invoice.status]}`}>{invoice.status}</span>
            </div>
            <div className="flex gap-2">
              {/* WhatsApp button */}
              <button onClick={() => setWhatsapp(true)}
                className="flex items-center gap-1 text-xs bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg text-emerald-600 font-medium">
                <MessageCircle size={13}/> WhatsApp
              </button>
              <button onClick={() => window.open(`${import.meta.env.VITE_API_URL}/invoices/${invoice.id}/pdf`, '_blank')}
                className="flex items-center gap-1 text-xs bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg text-slate-600">
                <Download size={13}/> PDF
              </button>
              <button onClick={handleEmail} disabled={sending}
                className="flex items-center gap-1 text-xs bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg text-indigo-600">
                <Mail size={13}/> {sending ? 'Sending...' : 'Email'}
              </button>
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><X size={18}/></button>
            </div>
          </div>

          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4 bg-slate-50 rounded-xl p-4">
              <div>
                <p className="text-xs text-slate-400 mb-1">Customer</p>
                <p className="font-semibold text-slate-800">{invoice.customer?.name}</p>
                <p className="text-xs text-slate-500">{invoice.customer?.phone}</p>
                {invoice.customer?.gstin && <p className="text-xs text-indigo-500">GSTIN: {invoice.customer.gstin}</p>}
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-400 mb-1">Date</p>
                <p className="text-sm text-slate-700">{new Date(invoice.created_at).toLocaleDateString('en-IN')}</p>
                {invoice.due_date && <p className="text-xs text-amber-600">Due: {new Date(invoice.due_date).toLocaleDateString('en-IN')}</p>}
              </div>
            </div>

            <table className="w-full text-sm border border-slate-100 rounded-xl overflow-hidden">
              <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
                <tr>
                  <th className="text-left px-3 py-2">Item</th>
                  <th className="text-center px-3 py-2">Qty</th>
                  <th className="text-right px-3 py-2">Price</th>
                  <th className="text-right px-3 py-2">GST</th>
                  <th className="text-right px-3 py-2">Total</th>
                </tr>
              </thead>
              <tbody>
                {(invoice.items||[]).map((item, i) => (
                  <tr key={i} className="border-t border-slate-100">
                    <td className="px-3 py-2"><p className="font-medium text-slate-700">{item.name}</p>{item.hsn_code && <p className="text-xs text-slate-400">HSN: {item.hsn_code}</p>}</td>
                    <td className="px-3 py-2 text-center text-slate-600">{item.qty}</td>
                    <td className="px-3 py-2 text-right text-slate-600">₹{fmtINR(item.price)}</td>
                    <td className="px-3 py-2 text-right text-slate-500 text-xs">{item.gst_rate}%</td>
                    <td className="px-3 py-2 text-right font-semibold text-slate-800">₹{fmtINR(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex justify-end">
              <div className="w-64 space-y-1.5">
                {[['Subtotal',invoice.subtotal],['Discount',invoice.discount],['CGST',invoice.cgst],['SGST',invoice.sgst],['IGST',invoice.igst]].map(([l,v]) =>
                  v > 0 ? <div key={l} className="flex justify-between text-sm text-slate-600"><span>{l}</span><span>₹{fmtINR(v)}</span></div> : null
                )}
                <div className="flex justify-between font-bold text-slate-800 border-t border-slate-200 pt-2 text-base">
                  <span>Total</span><span>₹{fmtINR(invoice.total)}</span>
                </div>
              </div>
            </div>

            {invoice.status !== 'PAID' && invoice.status !== 'CANCELLED' && (
              <div className="flex gap-2 pt-2 border-t border-slate-100">
                {invoice.status === 'DRAFT' && (
                  <button onClick={() => handleStatus('SENT')}
                    className="flex items-center gap-1 text-xs bg-blue-50 hover:bg-blue-100 text-blue-600 px-3 py-1.5 rounded-lg">
                    <Send size={12}/> Mark as Sent
                  </button>
                )}
                <button onClick={() => handleStatus('PAID')}
                  className="flex items-center gap-1 text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-600 px-3 py-1.5 rounded-lg">
                  <CheckCircle size={12}/> Mark as Paid
                </button>
                <button onClick={() => handleStatus('CANCELLED')}
                  className="flex items-center gap-1 text-xs bg-red-50 hover:bg-red-100 text-red-600 px-3 py-1.5 rounded-lg">
                  <XCircle size={12}/> Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* WhatsApp modal on top */}
      {whatsapp && <WhatsAppModal invoice={invoice} onClose={() => setWhatsapp(false)}/>}
    </>
  );
}

/* ─── Main Billing Page ─────────────────────────────────────────── */
export default function Billing() {
  const [invoices,   setInvoices]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [pagination, setPagination] = useState({});
  const [search,     setSearch]     = useState('');
  const [status,     setStatus]     = useState('');
  const [page,       setPage]       = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [viewing,    setViewing]    = useState(null);
  const [waInvoice,  setWaInvoice]  = useState(null);
  const [upiInvoice, setUpiInvoice] = useState(null);

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 15 });
      if (search) params.set('search', search);
      if (status) params.set('status', status);
      const res = await api.get(`/invoices?${params}`);
      setInvoices(res.data.invoices    || []);
      setPagination(res.data.pagination || {});
    } catch { setInvoices([]); }
    finally  { setLoading(false); }
  }, [page, search, status]);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);
  useEffect(() => { setPage(1); }, [search, status]);

  const totalPaid    = invoices.filter(i => i.status==='PAID').reduce((s,i) => s+i.total, 0);
  const totalPending = invoices.filter(i => i.status==='SENT'||i.status==='DRAFT').reduce((s,i) => s+i.total, 0);

  return (
    <>
      <div className="flex h-screen bg-slate-50 overflow-hidden">
        <div className="hidden lg:flex"><Sidebar/></div>
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <Navbar title="Billing"/>
          <main className="flex-1 overflow-y-auto px-4 lg:px-6 py-5 space-y-4">

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { label:'Total Invoices',  value: pagination.total ?? invoices.length, color:'text-indigo-600' },
                { label:'Collected',       value: `₹${fmtINR(totalPaid)}`,            color:'text-emerald-600' },
                { label:'Outstanding',     value: `₹${fmtINR(totalPending)}`,         color:'text-amber-600'  },
                { label:'Cancelled',       value: invoices.filter(i=>i.status==='CANCELLED').length, color:'text-red-500' },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-white rounded-xl border border-slate-100 px-4 py-3">
                  <p className={`text-xl font-semibold ${color}`}>{value}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{label}</p>
                </div>
              ))}
            </div>

            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
              <div className="flex gap-2 flex-wrap flex-1">
                <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2 flex-1 min-w-48 max-w-xs">
                  <Search size={14} className="text-slate-400 shrink-0"/>
                  <input type="text" placeholder="Search invoice, customer..."
                    value={search} onChange={e => setSearch(e.target.value)}
                    className="bg-transparent text-sm outline-none w-full text-slate-700 placeholder-slate-400"/>
                  {search && <button onClick={() => setSearch('')}><X size={13} className="text-slate-400"/></button>}
                </div>
                <select value={status} onChange={e => setStatus(e.target.value)}
                  className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-600 outline-none">
                  <option value="">All Status</option>
                  {['DRAFT','SENT','PAID','CANCELLED'].map(s => <option key={s}>{s}</option>)}
                </select>
                <button onClick={fetchInvoices} className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-500">
                  <RefreshCw size={15} className={loading ? 'animate-spin' : ''}/>
                </button>
              </div>
              <button onClick={() => setCreateOpen(true)}
                className="flex items-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium shrink-0">
                <Plus size={16}/> New Invoice
              </button>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-100 text-xs text-slate-400 uppercase tracking-wide">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium">Invoice #</th>
                      <th className="text-left px-4 py-3 font-medium">Customer</th>
                      <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Date</th>
                      <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Due</th>
                      <th className="text-right px-4 py-3 font-medium">Amount</th>
                      <th className="text-center px-4 py-3 font-medium">Status</th>
                      <th className="text-right px-4 py-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? Array(8).fill(0).map((_,i) => (
                      <tr key={i} className="border-b border-slate-50">
                        {Array(7).fill(0).map((_,j) => <td key={j} className="px-4 py-3"><div className="h-4 bg-slate-100 rounded animate-pulse"/></td>)}
                      </tr>
                    )) : invoices.length === 0 ? (
                      <tr><td colSpan={7} className="px-4 py-16 text-center">
                        <FileText size={36} className="mx-auto text-slate-200 mb-3"/>
                        <p className="text-slate-400 font-medium">No invoices found</p>
                        <p className="text-slate-300 text-xs mt-1">Click "New Invoice" to create one</p>
                      </td></tr>
                    ) : invoices.map(inv => (
                      <tr key={inv.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs text-indigo-600 font-semibold">{inv.invoice_no}</td>
                        <td className="px-4 py-3 font-medium text-slate-800">{inv.customer?.name}</td>
                        <td className="px-4 py-3 text-xs text-slate-400 hidden md:table-cell">
                          {new Date(inv.created_at).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}
                        </td>
                        <td className="px-4 py-3 text-xs hidden lg:table-cell">
                          {inv.due_date ? <span className="text-amber-600">{new Date(inv.due_date).toLocaleDateString('en-IN',{day:'2-digit',month:'short'})}</span> : <span className="text-slate-300">—</span>}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-800">₹{fmtINR(inv.total)}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full border ${STATUS_STYLE[inv.status]}`}>{inv.status}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            {/* UPI QR button */}
                            <button onClick={() => setUpiInvoice(inv)} title="UPI Payment QR"
                              className="p-1.5 rounded-lg hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 transition-colors text-[11px] font-bold">
                              ₹
                            </button>
                            {/* WhatsApp quick button */}
                            <button onClick={() => setWaInvoice(inv)} title="Share on WhatsApp"
                              className="p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-400 hover:text-emerald-600 transition-colors">
                              <MessageCircle size={15}/>
                            </button>
                            <button onClick={() => setViewing(inv)} title="View details"
                              className="p-1.5 rounded-lg hover:bg-indigo-50 text-indigo-400 hover:text-indigo-600">
                              <Eye size={15}/>
                            </button>
                            <button onClick={() => window.open(`${import.meta.env.VITE_API_URL}/invoices/${inv.id}/pdf`, '_blank')}
                              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600">
                              <Download size={15}/>
                            </button>
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

      <CreateInvoiceModal open={createOpen} onClose={() => setCreateOpen(false)} onDone={fetchInvoices}/>
      <InvoiceDetailModal invoice={viewing} onClose={() => setViewing(null)} onRefresh={fetchInvoices}/>
      <WhatsAppModal invoice={waInvoice} onClose={() => setWaInvoice(null)}/>
      {upiInvoice && (
        <UPIQRModal
          invoice={upiInvoice}
          onClose={() => setUpiInvoice(null)}
          onPaid={fetchInvoices}
        />
      )}
    </>
  );
}