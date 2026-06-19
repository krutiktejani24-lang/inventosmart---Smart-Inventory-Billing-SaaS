import { Routes, Route, Navigate } from 'react-router-dom';
import useAuthStore   from './store/authStore';
import usePortalStore from './store/portalStore';

// Business app pages
import Dashboard from './pages/Dashboard';
import Login     from './pages/Login';
import Inventory from './pages/Inventory';
import Billing   from './pages/Billing';
import Customers from './pages/Customers';
import Vendors   from './pages/Vendors';
import Reports   from './pages/Reports';
import Settings  from './pages/Settings';
import Pricing      from './pages/Pricing';
import Subscription from './pages/Subscription';
import Payments from "./pages/Payments";

// Customer portal pages
import PortalLogin         from './pages/portal/PortalLogin';
import PortalDashboard     from './pages/portal/PortalDashboard';
import PortalInvoices      from './pages/portal/PortalInvoices';
import PortalInvoiceDetail from './pages/portal/PortalInvoiceDetail';

/** Business admin private route */
const PrivateRoute = ({ children }) => {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

/** Customer portal private route */
const PortalRoute = ({ children }) => {
  const { isAuthenticated } = usePortalStore();
  return isAuthenticated ? children : <Navigate to="/portal/login" replace />;
};

export default function App() {
  return (
    <Routes>
      {/* ── Business Admin Routes ───────────────────────────────── */}
      <Route path="/login"     element={<Login />} />
      <Route path="/"          element={<PrivateRoute><Dashboard /></PrivateRoute>} />
      <Route path="/inventory" element={<PrivateRoute><Inventory /></PrivateRoute>} />
      <Route path="/billing"   element={<PrivateRoute><Billing /></PrivateRoute>} />
      <Route path="/customers" element={<PrivateRoute><Customers /></PrivateRoute>} />
      <Route path="/vendors"   element={<PrivateRoute><Vendors /></PrivateRoute>} />
      <Route path="/reports"   element={<PrivateRoute><Reports /></PrivateRoute>} />
      <Route path="/settings"  element={<PrivateRoute><Settings /></PrivateRoute>} />
      <Route path="/pricing"     element={<PrivateRoute><Pricing /></PrivateRoute>} />
      <Route path="/subscriptions"element={<PrivateRoute><Subscription /></PrivateRoute>}/>
      <Route path="/payments" element={<PrivateRoute><Payments /></PrivateRoute>}/>

      {/* ── Customer Portal Routes ──────────────────────────────── */}
      <Route path="/portal/login"            element={<PortalLogin />} />
      <Route path="/portal/dashboard"        element={<PortalRoute><PortalDashboard /></PortalRoute>} />
      <Route path="/portal/invoices"         element={<PortalRoute><PortalInvoices /></PortalRoute>} />
      <Route path="/portal/invoices/:id"     element={<PortalRoute><PortalInvoiceDetail /></PortalRoute>} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}