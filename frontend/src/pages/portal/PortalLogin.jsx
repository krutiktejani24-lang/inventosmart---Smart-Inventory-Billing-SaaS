import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, ArrowRight, RefreshCw, Shield } from 'lucide-react';
import usePortalStore from '../../store/portalStore';
import portalApi from '../../api/portalApi';

export default function PortalLogin() {
  const [step, setStep]             = useState('identify');
  const [identifier, setIdentifier] = useState('');
  const [otp, setOtp]               = useState(['','','','','','']);
  const [maskedTo, setMaskedTo]     = useState('');
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');
  const { setPortalAuth }           = usePortalStore();
  const navigate                    = useNavigate();

  const handleSendOTP = async (e) => {
    e.preventDefault();
    if (!identifier.trim()) { setError('Email or phone required'); return; }
    setLoading(true); setError('');
    try {
      const res = await portalApi.post('/send-otp', { identifier });
      setMaskedTo(res.data.maskedTo);
      setStep('otp');
    } catch (e) { setError(e.response?.data?.message || 'Failed to send OTP'); }
    finally { setLoading(false); }
  };

  const handleVerifyOTP = async () => {
    const code = otp.join('');
    if (code.length < 6) { setError('Enter complete 6-digit OTP'); return; }
    setLoading(true); setError('');
    try {
      const res = await portalApi.post('/verify-otp', { identifier, otp: code });
      setPortalAuth(res.data.token, res.data.customer, res.data.business);
      navigate('/portal/dashboard');
    } catch (e) {
      setError(e.response?.data?.message || 'Invalid OTP');
      setOtp(['','','','','','']);
    } finally { setLoading(false); }
  };

  const handleOtpChange = (i, val) => {
    if (!/^\d*$/.test(val)) return;
    const n = [...otp]; n[i] = val.slice(-1); setOtp(n);
    if (val && i < 5) document.getElementById(`op-${i+1}`)?.focus();
  };

  const handleKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !otp[i] && i > 0) document.getElementById(`op-${i-1}`)?.focus();
    if (e.key === 'Enter' && otp.join('').length === 6) handleVerifyOTP();
  };

  const handlePaste = (e) => {
    const p = e.clipboardData.getData('text').replace(/\D/g,'').slice(0,6);
    if (p.length === 6) { setOtp(p.split('')); document.getElementById('op-5')?.focus(); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 justify-center mb-8">
          <div className="w-11 h-11 bg-indigo-500 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
            <Zap size={22} className="text-white"/>
          </div>
          <div>
            <p className="text-xl font-bold text-slate-800">InventoSmart</p>
            <p className="text-xs text-slate-400">Customer Portal</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-500 to-indigo-700 px-6 py-5 text-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                <Shield size={20}/>
              </div>
              <div>
                <p className="font-semibold">{step==='identify' ? 'Sign in to your account' : 'Enter OTP'}</p>
                <p className="text-indigo-200 text-sm">{step==='identify' ? 'View your invoices & payments' : `Code sent to ${maskedTo}`}</p>
              </div>
            </div>
          </div>

          <div className="p-7">
            {error && <div className="mb-4 bg-red-50 border border-red-100 rounded-xl px-4 py-2.5 text-xs text-red-600">{error}</div>}

            {step === 'identify' && (
              <form onSubmit={handleSendOTP} className="space-y-5">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-2">Email or Phone Number</label>
                  <input type="text" value={identifier} onChange={e => setIdentifier(e.target.value)}
                    placeholder="you@email.com or 9099731627" autoFocus
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10"/>
                  <p className="text-xs text-slate-400 mt-2">We'll send an OTP to your registered contact</p>
                </div>
                <button type="submit" disabled={loading}
                  className="w-full flex items-center justify-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white font-medium text-sm py-3 rounded-xl disabled:opacity-60">
                  {loading ? <><RefreshCw size={15} className="animate-spin"/> Sending...</> : <>Get OTP <ArrowRight size={15}/></>}
                </button>
              </form>
            )}

            {step === 'otp' && (
              <div className="space-y-6">
                <div>
                  <p className="text-xs text-slate-500 text-center mb-4">
                    Enter 6-digit OTP sent to <span className="text-indigo-600 font-semibold">{maskedTo}</span>
                  </p>
                  <div className="flex gap-2 justify-center" onPaste={handlePaste}>
                    {otp.map((d, i) => (
                      <input key={i} id={`op-${i}`} type="text" inputMode="numeric" maxLength={1} value={d}
                        onChange={e => handleOtpChange(i, e.target.value)}
                        onKeyDown={e => handleKeyDown(i, e)}
                        autoFocus={i===0}
                        className={`w-11 h-12 text-center text-xl font-bold border-2 rounded-xl outline-none transition-all ${
                          d ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-200 focus:border-indigo-400'
                        }`}/>
                    ))}
                  </div>
                </div>
                <button onClick={handleVerifyOTP} disabled={loading || otp.join('').length < 6}
                  className="w-full flex items-center justify-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white font-medium text-sm py-3 rounded-xl disabled:opacity-60">
                  {loading ? <><RefreshCw size={15} className="animate-spin"/> Verifying...</> : <>Verify OTP <ArrowRight size={15}/></>}
                </button>
                <div className="flex justify-between text-xs">
                  <button onClick={() => { setStep('identify'); setOtp(['','','','','','']); setError(''); }}
                    className="text-slate-400 hover:text-slate-600">← Change email/phone</button>
                  <button onClick={handleSendOTP} disabled={loading} className="text-indigo-500 hover:text-indigo-700 font-medium">
                    Resend OTP
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        <p className="text-center text-xs text-slate-400 mt-5">Customer portal — view invoices & track payments</p>
      </div>
    </div>
  );
}