import { useEffect, useState } from 'react';
import { BarChart2, Download, RefreshCw, TrendingUp, Package, FileText, AlertTriangle } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import Navbar  from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import api     from '../api/axiosConfig';

const fmtINR = (n) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n || 0);
const today  = new Date();
const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0,10);
const todayStr     = today.toISOString().slice(0,10);

const COLORS = ['#6366f1','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#f97316'];

/* ─── Export Button ─────────────────────────────────────────────── */
function ExportBtn({ endpoint, label }) {
  const [loading, setLoading] = useState(false);

  const doExport = async (format) => {
    setLoading(true);
    try {
      const res = await api.get(`${endpoint}?format=${format}`, { responseType: 'blob' });
      const url  = URL.createObjectURL(res.data);
      const a    = document.createElement('a');
      a.href = url;
      a.download = `${label}.${format === 'pdf' ? 'pdf' : 'xlsx'}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { alert('Export failed — check backend connection'); }
    finally { setLoading(false); }
  };

  return (
    <div className="flex gap-1">
      <button onClick={() => doExport('pdf')} disabled={loading}
        className="flex items-center gap-1 text-xs bg-red-50 hover:bg-red-100 text-red-600 px-2.5 py-1.5 rounded-lg disabled:opacity-50">
        <Download size={12}/> PDF
      </button>
      <button onClick={() => doExport('excel')} disabled={loading}
        className="flex items-center gap-1 text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-600 px-2.5 py-1.5 rounded-lg disabled:opacity-50">
        <Download size={12}/> Excel
      </button>
    </div>
  );
}

/* ─── Stat Card ─────────────────────────────────────────────────── */
function StatCard({ icon: Icon, label, value, sub, color }) {
  return (
    <div className="bg-white rounded-xl border border-slate-100 p-4">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${color}`}>
        <Icon size={16} className="text-white"/>
      </div>
      <p className="text-xl font-semibold text-slate-800">{value}</p>
      <p className="text-xs text-slate-400 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
    </div>
  );
}

/* ─── Main Reports Page ─────────────────────────────────────────── */
export default function Reports() {
  const [dashboard,   setDashboard]   = useState(null);
  const [sales,       setSales]       = useState(null);
  const [pl,          setPL]          = useState(null);
  const [topProducts, setTopProducts] = useState([]);
  const [lowStock,    setLowStock]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [from,        setFrom]        = useState(firstOfMonth);
  const [to,          setTo]          = useState(todayStr);
  const [gstrMonth,   setGstrMonth]   = useState(today.getMonth() + 1);
  const [gstrYear,    setGstrYear]    = useState(today.getFullYear());

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [d, s, p, t, l] = await Promise.allSettled([
        api.get('/reports/dashboard'),
        api.get(`/reports/sales?from=${from}&to=${to}`),
        api.get(`/reports/profit-loss?from=${from}&to=${to}`),
        api.get('/reports/top-products?limit=7'),
        api.get('/reports/low-stock'),
      ]);
      if (d.status === 'fulfilled') setDashboard(d.value.data);
      if (s.status === 'fulfilled') setSales(s.value.data);
      if (p.status === 'fulfilled') setPL(p.value.data);
      if (t.status === 'fulfilled') setTopProducts(t.value.data.rows || []);
      if (l.status === 'fulfilled') setLowStock(l.value.data.rows   || []);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, [from, to]);

  const weekly = dashboard?.weeklyData || [];
  const stats  = dashboard?.stats      || {};

  /* Pie data from P&L */
  const pieData = pl ? [
    { name: 'Revenue', value: pl.summary?.totalRevenue || 0 },
    { name: 'COGS',    value: pl.summary?.totalCOGS    || 0 },
  ] : [];

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <div className="hidden lg:flex"><Sidebar /></div>
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Navbar title="Reports & Analytics" />
        <main className="flex-1 overflow-y-auto px-4 lg:px-6 py-5 space-y-5">

          {/* Date Range Filter */}
          <div className="flex flex-wrap gap-3 items-center bg-white border border-slate-100 rounded-xl px-4 py-3">
            <p className="text-sm font-medium text-slate-600 mr-2">Date Range:</p>
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-400">From</label>
              <input type="date" value={from} onChange={e => setFrom(e.target.value)}
                className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm text-slate-700 outline-none"/>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-400">To</label>
              <input type="date" value={to} onChange={e => setTo(e.target.value)}
                className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm text-slate-700 outline-none"/>
            </div>
            <button onClick={fetchAll} className="flex items-center gap-1 text-sm bg-indigo-500 hover:bg-indigo-600 text-white px-3 py-1.5 rounded-lg">
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''}/> Apply
            </button>
            {/* Quick ranges */}
            {[
              { label:'This Month', f: firstOfMonth, t: todayStr },
              { label:'Last 7 Days', f: new Date(Date.now()-7*86400000).toISOString().slice(0,10), t: todayStr },
              { label:'Last 30 Days', f: new Date(Date.now()-30*86400000).toISOString().slice(0,10), t: todayStr },
            ].map(({ label, f, t: t2 }) => (
              <button key={label} onClick={() => { setFrom(f); setTo(t2); }}
                className="text-xs text-indigo-500 hover:text-indigo-700 underline">{label}</button>
            ))}
          </div>

          {/* Stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard icon={TrendingUp} label="Total Revenue"    value={`₹${fmtINR(sales?.summary?.totalRevenue)}`} color="bg-indigo-500"/>
            <StatCard icon={FileText}   label="Total Invoices"   value={sales?.summary?.invoiceCount || 0}          color="bg-emerald-500"/>
            <StatCard icon={TrendingUp} label="Gross Profit"     value={`₹${fmtINR(pl?.summary?.grossProfit)}`}    color="bg-amber-500"
              sub={pl?.summary?.grossMarginPct ? `${pl.summary.grossMarginPct}% margin` : ''}/>
            <StatCard icon={AlertTriangle} label="Low Stock Items" value={lowStock.length}                          color="bg-red-500"/>
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Weekly sales line chart */}
            <div className="lg:col-span-2 bg-white rounded-xl border border-slate-100 p-5">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-semibold text-slate-800">Weekly Sales Trend</p>
                <ExportBtn endpoint="/reports/sales" label="Sales_Report"/>
              </div>
              {loading ? <div className="h-48 bg-slate-100 rounded-xl animate-pulse"/> : (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={weekly} margin={{ top:4, right:4, left:-16, bottom:0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                    <XAxis dataKey="day" tick={{ fontSize:11, fill:'#94a3b8' }} axisLine={false} tickLine={false}/>
                    <YAxis tick={{ fontSize:11, fill:'#94a3b8' }} axisLine={false} tickLine={false}
                      tickFormatter={v => `₹${v>=1000?(v/1000).toFixed(0)+'k':v}`}/>
                    <Tooltip formatter={(v) => [`₹${fmtINR(v)}`, 'Sales']} contentStyle={{ fontSize:12, borderRadius:8 }}/>
                    <Line type="monotone" dataKey="sales" stroke="#6366f1" strokeWidth={2.5}
                      dot={{ r:4, fill:'#6366f1', stroke:'#fff', strokeWidth:2 }} activeDot={{ r:6 }}/>
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Revenue vs COGS pie */}
            <div className="bg-white rounded-xl border border-slate-100 p-5">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-semibold text-slate-800">Revenue vs COGS</p>
                <ExportBtn endpoint="/reports/profit-loss" label="PL_Report"/>
              </div>
              {loading ? <div className="h-48 bg-slate-100 rounded-xl animate-pulse"/> : (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} dataKey="value" paddingAngle={4}>
                      {pieData.map((_, i) => <Cell key={i} fill={COLORS[i]}/>)}
                    </Pie>
                    <Legend iconSize={10} wrapperStyle={{ fontSize:12 }}/>
                    <Tooltip formatter={(v) => `₹${fmtINR(v)}`} contentStyle={{ fontSize:12, borderRadius:8 }}/>
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Top Products + Low Stock */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Top Products bar chart */}
            <div className="bg-white rounded-xl border border-slate-100 p-5">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-semibold text-slate-800">Top Selling Products</p>
                <ExportBtn endpoint="/reports/top-products" label="Top_Products"/>
              </div>
              {loading ? <div className="h-48 bg-slate-100 rounded-xl animate-pulse"/> :
                topProducts.length === 0 ? <p className="text-slate-400 text-sm text-center py-10">No sales data yet</p> : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={topProducts} layout="vertical" margin={{ top:0, right:16, left:0, bottom:0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false}/>
                    <XAxis type="number" tick={{ fontSize:10, fill:'#94a3b8' }} axisLine={false} tickLine={false}
                      tickFormatter={v => `₹${v>=1000?(v/1000).toFixed(0)+'k':v}`}/>
                    <YAxis type="category" dataKey="name" tick={{ fontSize:10, fill:'#475569' }} width={100} axisLine={false} tickLine={false}/>
                    <Tooltip formatter={(v) => [`₹${fmtINR(v)}`, 'Revenue']} contentStyle={{ fontSize:12, borderRadius:8 }}/>
                    <Bar dataKey="revenue" radius={[0,4,4,0]}>
                      {topProducts.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]}/>)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Low Stock table */}
            <div className="bg-white rounded-xl border border-slate-100 p-5">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-semibold text-slate-800">Low Stock — Reorder List</p>
                <ExportBtn endpoint="/reports/low-stock" label="Low_Stock"/>
              </div>
              {loading ? <div className="h-48 bg-slate-100 rounded-xl animate-pulse"/> :
                lowStock.length === 0 ? <p className="text-slate-400 text-sm text-center py-10">All stock levels are healthy ✅</p> : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {lowStock.map((item, i) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                      <div className="min-w-0 mr-3">
                        <p className="text-xs font-medium text-slate-700 truncate">{item.name}</p>
                        <p className="text-[11px] text-slate-400">{item.sku} · {item.category}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs font-semibold text-red-500">{item.stock_qty} / {item.min_threshold} {item.unit}</p>
                        <p className="text-[11px] text-amber-600">Order {item.to_order} {item.unit}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* GSTR-1 Section */}
          <div className="bg-white rounded-xl border border-slate-100 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <p className="text-sm font-semibold text-slate-800">GSTR-1 Export</p>
              <div className="flex items-center gap-3">
                <select value={gstrMonth} onChange={e => setGstrMonth(e.target.value)}
                  className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm text-slate-700 outline-none">
                  {Array.from({ length:12 }, (_, i) => (
                    <option key={i+1} value={i+1}>
                      {new Date(2025,i,1).toLocaleString('en-IN',{ month:'long' })}
                    </option>
                  ))}
                </select>
                <select value={gstrYear} onChange={e => setGstrYear(e.target.value)}
                  className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm text-slate-700 outline-none">
                  {[2024,2025,2026].map(y => <option key={y}>{y}</option>)}
                </select>
                <div className="flex gap-1">
                  <a href={`${import.meta.env.VITE_API_URL}/reports/gstr1?month=${gstrMonth}&year=${gstrYear}&format=pdf`}
                    className="flex items-center gap-1 text-xs bg-red-50 hover:bg-red-100 text-red-600 px-2.5 py-1.5 rounded-lg">
                    <Download size={12}/> PDF
                  </a>
                  <a href={`${import.meta.env.VITE_API_URL}/reports/gstr1?month=${gstrMonth}&year=${gstrYear}&format=excel`}
                    className="flex items-center gap-1 text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-600 px-2.5 py-1.5 rounded-lg">
                    <Download size={12}/> Excel
                  </a>
                </div>
              </div>
            </div>
            <div className="bg-slate-50 rounded-xl p-4 text-sm text-slate-500 text-center">
              Select month & year above, then click PDF or Excel to download GSTR-1 report.<br/>
              <span className="text-xs text-slate-400">B2B invoices (with GSTIN) + B2C summary included.</span>
            </div>
          </div>
  
          {/* Inventory Valuation */}
          <div className="bg-white rounded-xl border border-slate-100 p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-slate-800">Inventory Valuation</p>
              <ExportBtn endpoint="/reports/inventory-valuation" label="Inventory_Valuation"/>
            </div>
            <p className="text-xs text-slate-400">Current stock value based on cost price. Download for full product-wise breakdown.</p>
          </div>

        </main>
      </div>
    </div>
  );
}