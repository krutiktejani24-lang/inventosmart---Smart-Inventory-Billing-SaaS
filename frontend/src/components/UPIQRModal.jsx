import { useEffect, useState } from 'react';
import { X, RefreshCw, Copy, CheckCircle, Smartphone } from 'lucide-react';
import api from '../api/axiosConfig';

const fmtINR = (n) =>
  new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2 }).format(n || 0);

/**
 * UPIQRModal — Invoice UPI QR code display
 * Props:
 *   invoice  — invoice object { id, invoice_no, total, status }
 *   onClose  — close handler
 *   onPaid   — called when "Mark as Paid" clicked
 */
export default function UPIQRModal({ invoice, onClose, onPaid }) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [copied,  setCopied]  = useState(false);
  const [marking, setMarking] = useState(false);
  const [started, setStarted] = useState(false);
  const [expired, setExpired] = useState(false);
  const [timeLeft, setTimeLeft] = useState(120); 

  useEffect(() => {
    if (!invoice) return;
    fetchQR();
  }, [invoice]);

  const fetchQR = async () => {
    setLoading(true); setError('');
    try {
      const res = await api.get(`/invoices/${invoice.id}/upi-qr`);
      setData(res.data);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to generate QR');
    } finally {
      setLoading(false);
    }
  };

   useEffect(() => {
  if (!started || expired) return;

  if (timeLeft <= 0) {
    setExpired(true);
    return;
  }

  const timer = setInterval(() => {
    setTimeLeft((prev) => prev - 1);
  }, 1000);

  return () => clearInterval(timer);
}, [started, timeLeft, expired]);

  const handleCopyUPI = () => {
    if (data?.upiId) {
      navigator.clipboard.writeText(data.upiId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleMarkPaid = async () => {
    setMarking(true);
    try {
      await api.put(`/invoices/${invoice.id}/status`, { status: 'PAID' });
      onPaid?.();
      onClose();
    } catch (e) {
      alert(e.response?.data?.message || 'Failed');
    } finally { setMarking(false); }
  };

  const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;

  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

  if (!invoice) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">

        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-500 to-indigo-700 px-5 py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-semibold text-sm">UPI Payment</p>
              <p className="text-indigo-200 text-xs mt-0.5">{invoice.invoice_no}</p>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white">
              <X size={16} />
            </button>
          </div>
          {/* Amount */}
          <div className="mt-3 text-center">
            <p className="text-3xl font-bold text-white">₹{fmtINR(data?.amount || invoice.total)}</p>
            <p className="text-indigo-200 text-xs mt-0.5">Scan & Pay</p>
          </div>
        </div>

        <div className="p-5">
          {loading ? (
            /* Loading skeleton */
            <div className="flex flex-col items-center gap-4 py-6">
              <div className="w-44 h-44 bg-slate-100 rounded-xl animate-pulse" />
              <div className="w-32 h-3 bg-slate-100 rounded-full animate-pulse" />
              <div className="w-48 h-3 bg-slate-100 rounded-full animate-pulse" />
            </div>
          ) : error ? (
            /* Error state */
            <div className="text-center py-6">
              <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-3">
                <Smartphone size={22} className="text-amber-500" />
              </div>
              <p className="text-sm text-slate-600 font-medium mb-1">UPI not configured</p>
              <p className="text-xs text-slate-400 mb-4">{error}</p>
              <a href="/settings" onClick={onClose}
                className="text-xs text-indigo-500 hover:text-indigo-700 underline">
                Go to Settings → Add UPI ID
              </a>
            </div>
          ) : (
            /* QR Code display */
            <div className="flex flex-col items-center">

              {/* QR Image */}
             <div className="relative p-2 bg-white rounded-2xl border-2 border-slate-100 shadow-inner mb-4">

                {/* QR IMAGE */}
                <img
                 src={data.qrDataUrl}
                 alt="UPI QR Code"
                 className={`w-64 h-64 rounded-2xl transition-all duration-300 ${
                     !started || expired
                     ? 'blur-xl opacity-40'
                     : ''
                    }`}
                />

               {/* Overlay */}
             {(!started || expired) && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">

              {expired ? (
               <>
                  <p className="text-red-500 font-bold text-lg">
                  QR Expired
              </p>

             <button
              onClick={() => {
                         setExpired(false);
                         setStarted(true);
                         setTimeLeft(120);
                         fetchQR();
                        }}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-xl shadow-lg"
                    >
                   Generate Again
                     </button>
                        </>
                          ) : (
                        <>
                         <button
                             onClick={() => setStarted(true)}
                                 className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-2xl font-semibold shadow-xl"
                                      >
                 Scan Now
                 </button>

                <p className="text-sm text-slate-500">
                     QR valid for 2 minutes
                </p>
                </>
                  )}

                   </div>
                )}
             </div>

           {started && !expired && (
              <div className="text-center mb-4">
                   <p className="text-sm font-semibold text-indigo-600">
                      Expires in {formatTime(timeLeft)}
                  </p>
              </div>
            )}
              {/* UPI ID */}
              <div className="w-full bg-slate-50 rounded-xl px-4 py-3 mb-4">
                <p className="text-xs text-slate-400 mb-1">UPI ID</p>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-800 truncate">{data.upiId}</p>
                  <button onClick={handleCopyUPI}
                    className="shrink-0 flex items-center gap-1 text-xs text-indigo-500 hover:text-indigo-700">
                    {copied ? <CheckCircle size={13} className="text-emerald-500" /> : <Copy size={13} />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>

              {/* Supported apps */}
              <div className="flex items-center gap-2 mb-5 flex-wrap justify-center">
                {['PhonePe', 'GPay', 'Paytm', 'BHIM'].map(app => (
                  <span key={app} className="text-[11px] bg-slate-100 text-slate-500 px-2.5 py-1 rounded-full">
                    {app}
                  </span>
                ))}
              </div>

              {/* Actions */}
              <div className="w-full flex gap-2">
                <button onClick={fetchQR}
                  className="flex items-center justify-center gap-1.5 flex-1 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50">
                  <RefreshCw size={13} /> Refresh
                </button>
                {invoice.status !== 'PAID' && (
                  <button onClick={handleMarkPaid} disabled={marking}
                    className="flex items-center justify-center gap-1.5 flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-medium disabled:opacity-50">
                    <CheckCircle size={13} />
                    {marking ? 'Marking...' : 'Mark Paid'}
                  </button>
                )}
              </div>

              <p className="text-[11px] text-slate-400 mt-3 text-center">
                After payment, click "Mark Paid" to update invoice status
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}   