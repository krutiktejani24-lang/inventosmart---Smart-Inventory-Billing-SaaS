import { useEffect, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from 'recharts';
import {
  IndianRupee, Package, Clock, AlertTriangle,
  TrendingUp, TrendingDown, ArrowRight
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import api from '../api/axiosConfig';

/* ─── Helpers ─────────────────────────────────────────────────────── */
const fmt = (n) =>
  new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n);

const statusColor = {
  PAID:      'bg-emerald-50 text-emerald-700',
  SENT:      'bg-blue-50 text-blue-700',
  PENDING:   'bg-amber-50 text-amber-700',
  DRAFT:     'bg-slate-100 text-slate-600',
  CANCELLED: 'bg-red-50 text-red-600',
};

/* ─── Stat Card ────────────────────────────────────────────────────── */
function StatCard({ icon: Icon, label, value, sub, accent, trend }) {
  return (
    <div className="bg-white rounded-xl border border-slate-100 p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${accent}`}>
          <Icon size={18} className="text-white" />
        </div>
        {trend !== undefined && (
          <span className={`flex items-center gap-1 text-xs font-medium ${trend >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
            {trend >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      <div>
        <p className="text-2xl font-semibold text-slate-800 leading-tight">{value}</p>
        <p className="text-xs text-slate-400 mt-0.5">{label}</p>
      </div>
      {sub && <p className="text-xs text-slate-500">{sub}</p>}
    </div>
  );
}

/* ─── Custom Tooltip ───────────────────────────────────────────────── */
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg px-3 py-2 text-xs">
      <p className="text-slate-500 mb-1">{label}</p>
      <p className="font-semibold text-slate-800">₹{fmt(payload[0]?.value)}</p>
    </div>
  );
}

/* ─── Skeleton ─────────────────────────────────────────────────────── */
const Skeleton = ({ className }) => (
  <div className={`animate-pulse bg-slate-100 rounded-lg ${className}`} />
);

/* ─── Mock fallback data (jyare API na hoy tyare) ──────────────────── */
const MOCK = {
  stats: {
    todaySales: 48200,
    totalProducts: 312,
    pendingInvoices: 17,
    lowStockCount: 8,
    salesTrend: 12,
  },
  weeklyData: [
    { day: 'Mon', sales: 28000 },
    { day: 'Tue', sales: 41000 },
    { day: 'Wed', sales: 35000 },
    { day: 'Thu', sales: 52000 },
    { day: 'Fri', sales: 47000 },
    { day: 'Sat', sales: 63000 },
    { day: 'Sun', sales: 48200 },
  ],
  recentInvoices: [
    { id: 1, invoice_no: 'INV-2025-0042', customer: { name: 'Ravi Patel' },      total: 12400, status: 'PAID',    created_at: '2025-05-13' },
    { id: 2, invoice_no: 'INV-2025-0041', customer: { name: 'Meena Shah' },      total: 8750,  status: 'SENT',    created_at: '2025-05-13' },
    { id: 3, invoice_no: 'INV-2025-0040', customer: { name: 'Kiran Traders' },   total: 31200, status: 'PENDING', created_at: '2025-05-12' },
    { id: 4, invoice_no: 'INV-2025-0039', customer: { name: 'Anand Stores' },    total: 5600,  status: 'PAID',    created_at: '2025-05-12' },
    { id: 5, invoice_no: 'INV-2025-0038', customer: { name: 'Priya Enterprises'},total: 19800, status: 'DRAFT',   created_at: '2025-05-11' },
  ],
  lowStock: [
    { id: 1, name: 'Tata Salt 1kg',       stock_qty: 3,  min_threshold: 10, unit: 'Pkt'  },
    { id: 2, name: 'Colgate 200g',         stock_qty: 5,  min_threshold: 15, unit: 'Pcs'  },
    { id: 3, name: 'Parle-G Biscuit 800g', stock_qty: 2,  min_threshold: 20, unit: 'Carton'},
    { id: 4, name: 'Surf Excel 1kg',       stock_qty: 7,  min_threshold: 12, unit: 'Pkt'  },
    { id: 5, name: 'Amul Butter 500g',     stock_qty: 4,  min_threshold: 8,  unit: 'Pcs'  },
  ],
};

/* ─── Dashboard Page ───────────────────────────────────────────────── */
export default function Dashboard() {
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await api.get('/reports/dashboard');
        setData(res.data);
      } catch {
        // API na hoy toh mock data use karo (dev/demo mode)
        setData(MOCK);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  const stats = data?.stats || {};
  const weekly = data?.weeklyData || [];
  const invoices = data?.recentInvoices || [];
  const lowStock = data?.lowStock || [];

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">

      {/* Sidebar — desktop only */}
      <div className="hidden lg:flex">
        <Sidebar />
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Navbar title="Dashboard" />

        <main className="flex-1 overflow-y-auto px-4 lg:px-6 py-5 space-y-5">

          {/* ── Stat Cards ── */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
            {loading ? (
              Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-32" />)
            ) : (
              <>
                <StatCard
                  icon={IndianRupee}
                  label="Today's Sales"
                  value={`₹${fmt(stats.todaySales)}`}
                  sub="Compared to yesterday"
                  accent="bg-indigo-500"
                  trend={stats.salesTrend}
                />
                <StatCard
                  icon={Package}
                  label="Total Products"
                  value={fmt(stats.totalProducts)}
                  sub="Across all categories"
                  accent="bg-emerald-500"
                />
                <StatCard
                  icon={Clock}
                  label="Pending Invoices"
                  value={stats.pendingInvoices}
                  sub="Awaiting payment"
                  accent="bg-amber-500"
                />
                <StatCard
                  icon={AlertTriangle}
                  label="Low Stock Alerts"
                  value={stats.lowStockCount}
                  sub="Below minimum threshold"
                  accent="bg-red-500"
                />
              </>
            )}
          </div>

          {/* ── Chart + Low Stock row ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

            {/* Weekly Sales Chart */}
            <div className="lg:col-span-2 bg-white rounded-xl border border-slate-100 p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm font-semibold text-slate-800">Weekly Sales</p>
                  <p className="text-xs text-slate-400 mt-0.5">This week's revenue trend</p>
                </div>
              </div>
              {loading ? (
                <Skeleton className="h-48" />
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={weekly} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis
                      dataKey="day"
                      tick={{ fontSize: 11, fill: '#94a3b8' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#94a3b8' }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => `₹${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`}
                    />
                    <Tooltip content={<ChartTooltip />} />
                    <Line
                      type="monotone"
                      dataKey="sales"
                      stroke="#6366f1"
                      strokeWidth={2.5}
                      dot={{ r: 4, fill: '#6366f1', strokeWidth: 2, stroke: '#fff' }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Low Stock List */}
            <div className="bg-white rounded-xl border border-slate-100 p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-slate-800">Low Stock</p>
                <button className="text-xs text-indigo-500 hover:text-indigo-700 flex items-center gap-1">
                  View all <ArrowRight size={12} />
                </button>
              </div>
              {loading ? (
                <div className="space-y-3">
                  {Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-10" />)}
                </div>
              ) : (
                <div className="space-y-2">
                  {lowStock.map((item) => (
                    <div key={item.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                      <div className="min-w-0 mr-2">
                        <p className="text-xs font-medium text-slate-700 truncate">{item.name}</p>
                        <p className="text-[11px] text-slate-400">Min: {item.min_threshold} {item.unit}</p>
                      </div>
                      <span className="shrink-0 text-xs font-semibold bg-red-50 text-red-600 px-2 py-0.5 rounded-full">
                        {item.stock_qty} left
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Recent Invoices Table ── */}
          <div className="bg-white rounded-xl border border-slate-100">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-50">
              <p className="text-sm font-semibold text-slate-800">Recent Invoices</p>
              <button className="text-xs text-indigo-500 hover:text-indigo-700 flex items-center gap-1">
                View all <ArrowRight size={12} />
              </button>
            </div>
            <div className="overflow-x-auto">
              {loading ? (
                <div className="p-5 space-y-3">
                  {Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-10" />)}
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-slate-400 uppercase tracking-wide border-b border-slate-50">
                      <th className="text-left px-5 py-3 font-medium">Invoice #</th>
                      <th className="text-left px-5 py-3 font-medium">Customer</th>
                      <th className="text-left px-5 py-3 font-medium hidden md:table-cell">Date</th>
                      <th className="text-right px-5 py-3 font-medium">Amount</th>
                      <th className="text-right px-5 py-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0">
                        <td className="px-5 py-3 font-mono text-xs text-slate-600">{inv.invoice_no}</td>
                        <td className="px-5 py-3 text-slate-700 font-medium">{inv.customer?.name}</td>
                        <td className="px-5 py-3 text-slate-400 text-xs hidden md:table-cell">
                          {new Date(inv.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="px-5 py-3 text-right font-semibold text-slate-800">
                          ₹{fmt(inv.total)}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full ${statusColor[inv.status] || 'bg-slate-100 text-slate-600'}`}>
                            {inv.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

        </main>
      </div>
    </div>
  );
}
