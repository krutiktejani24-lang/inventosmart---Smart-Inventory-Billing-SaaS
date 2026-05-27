import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, MessageCircle, CheckCircle, Clock, XCircle, FileText } from 'lucide-react';
import usePortalStore from '../../store/portalStore';
import portalApi from '../../api/portalApi';

const fmt = (n) => new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0);

const STATUS_CONFIG = {
  PAID:      { icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50',  border: 'border-emerald-200' },
  SENT:      { icon: Clock,       color: 'text-blue-600',    bg: 'bg-blue-50',     border: 'border-blue-200'    },
  DRAFT:     { icon: FileText,    color: 'text-slate-600',   bg: 'bg-slate-100',   border: 'border-slate-200'   },
  CANCELLED: { icon: XCircle,     color: 'text-red-600',     bg: 'bg-red-50',      border: 'border-red-200'     },
};

export default function PortalInvoiceDetail() {
  const { id }                    = useParams();
  const [invoice, setInvoice]     = useState(null);
  const [loading, setLoading]     = useState(true);
  const { logout, customer }      = usePortalStore();
  const navigate                  = useNavigate();

  useEffect(() => {
    portalApi.get(`/invoices/${id}`)
      .then(r => setInvoice(r.data.invoice))
      .catch(e => { if (e.response?.status === 401) { logout(); navigate('/portal/login'); } })
      .finally(() => setLoading(false));
  }, [id]);

  const handleDownloadPDF = () => {
    const token = usePortalStore.getState().token;
    // Open with auth header via fetch + blob
    portalApi.get(`/invoices/${id}/pdf`, { responseType: 'blob' })
      .then(res => {
        const url = URL.createObjectURL(res.data);
        const a   = document.createElement('a');
        a.href     = url;
        a.download = `${invoice?.invoice_no || 'invoice'}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      })
      .catch(() => alert('PDF download failed'));
  };

  const handleWhatsApp = () => {
    if (!invoice?.business?.phone) { alert('Business phone not available'); return; }
    const msg = `Hi, I am ${customer?.name}. Please share invoice ${invoice.invoice_no} of ₹${fmt(invoice.total)}. Thank you.`;
    window.open(`https://wa.me/91${invoice.business.phone.replace(/\D/g,'')}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"/>
    </div>
  );

  if (!invoice) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center">
        <p className="text-slate-400">Invoice not found</p>
        <Link to="/portal/invoices" className="text-indigo-500 text-sm mt-2 block">← Back to invoices</Link>
      </div>
    </div>
  );

  const sc = STATUS_CONFIG[invoice.status] || STATUS_CONFIG.DRAFT;
  const StatusIcon = sc.icon;
  const totalTax = (invoice.cgst||0) + (invoice.sgst||0) + (invoice.igst||0);
  const totalPaid = (invoice.payments||[]).reduce((s,p) => s+p.amount, 0);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link to="/portal/invoices" className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
            <ArrowLeft size={18}/>
          </Link>
          <p className="text-sm font-semibold text-slate-800 flex-1 font-mono">{invoice.invoice_no}</p>
          {/* Action buttons */}
          <button onClick={handleWhatsApp}
            className="flex items-center gap-1 text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-600 px-3 py-1.5 rounded-lg">
            <MessageCircle size={13}/> WhatsApp
          </button>
          <button onClick={handleDownloadPDF}
            className="flex items-center gap-1 text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-600 px-3 py-1.5 rounded-lg">
            <Download size={13}/> PDF
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-5 space-y-4">

        {/* Status card */}
        <div className={`${sc.bg} border ${sc.border} rounded-2xl p-4 flex items-center gap-3`}>
          <div className={`w-10 h-10 rounded-xl bg-white flex items-center justify-center`}>
            <StatusIcon size={20} className={sc.color}/>
          </div>
          <div>
            <p className={`font-semibold ${sc.color}`}>{invoice.status}</p>
            <p className="text-xs text-slate-500">
              {new Date(invoice.created_at).toLocaleDateString('en-IN', { day:'2-digit', month:'long', year:'numeric' })}
              {invoice.due_date && ` • Due: ${new Date(invoice.due_date).toLocaleDateString('en-IN', { day:'2-digit', month:'short' })}`}
            </p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-xl font-bold text-slate-800">₹{fmt(invoice.total)}</p>
            {invoice.status !== 'PAID' && totalPaid > 0 && (
              <p className="text-xs text-emerald-600">Paid: ₹{fmt(totalPaid)}</p>
            )}
          </div>
        </div>

        {/* From business */}
        <div className="bg-white rounded-2xl border border-slate-100 p-4">
          <p className="text-xs text-slate-400 mb-2">From</p>
          <p className="font-semibold text-slate-800">{invoice.business?.name}</p>
          {invoice.business?.gstin  && <p className="text-xs text-indigo-500 mt-1">GSTIN: {invoice.business.gstin}</p>}
          {invoice.business?.phone  && <p className="text-xs text-slate-500 mt-0.5">📞 {invoice.business.phone}</p>}
          {invoice.business?.email  && <p className="text-xs text-slate-500 mt-0.5">✉️ {invoice.business.email}</p>}
        </div>

        {/* Items */}
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <p className="px-4 py-3 text-xs font-semibold text-slate-600 border-b border-slate-50">Items</p>
          <div className="divide-y divide-slate-50">
            {(invoice.items || []).map((item, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800">{item.name}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    ₹{fmt(item.price)} × {item.qty}
                    {item.hsn_code && ` • HSN: ${item.hsn_code}`}
                    {item.gst_rate > 0 && ` • GST: ${item.gst_rate}%`}
                  </p>
                </div>
                <p className="text-sm font-semibold text-slate-800">₹{fmt(item.total)}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Totals */}
        <div className="bg-white rounded-2xl border border-slate-100 p-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-slate-600">
              <span>Subtotal</span><span>₹{fmt(invoice.subtotal)}</span>
            </div>
            {invoice.discount > 0 && (
              <div className="flex justify-between text-sm text-emerald-600">
                <span>Discount</span><span>-₹{fmt(invoice.discount)}</span>
              </div>
            )}
            {invoice.cgst > 0 && <div className="flex justify-between text-xs text-slate-400"><span>CGST</span><span>₹{fmt(invoice.cgst)}</span></div>}
            {invoice.sgst > 0 && <div className="flex justify-between text-xs text-slate-400"><span>SGST</span><span>₹{fmt(invoice.sgst)}</span></div>}
            {invoice.igst > 0 && <div className="flex justify-between text-xs text-slate-400"><span>IGST</span><span>₹{fmt(invoice.igst)}</span></div>}
            <div className="flex justify-between font-bold text-slate-800 text-base border-t border-slate-100 pt-2">
              <span>Total</span><span>₹{fmt(invoice.total)}</span>
            </div>
          </div>
        </div>

        {/* Payment history */}
        {(invoice.payments || []).length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
            <p className="px-4 py-3 text-xs font-semibold text-slate-600 border-b border-slate-50">Payment History</p>
            <div className="divide-y divide-slate-50">
              {invoice.payments.map((p, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-xs font-medium text-slate-700">{p.method}</p>
                    <p className="text-[11px] text-slate-400">
                      {new Date(p.created_at).toLocaleDateString('en-IN')}
                      {p.reference && ` • Ref: ${p.reference}`}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-emerald-600">₹{fmt(p.amount)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        {invoice.notes && (
          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
            <p className="text-xs font-semibold text-amber-700 mb-1">Notes</p>
            <p className="text-sm text-amber-800">{invoice.notes}</p>
          </div>
        )}
      </main>
    </div>
  );
}