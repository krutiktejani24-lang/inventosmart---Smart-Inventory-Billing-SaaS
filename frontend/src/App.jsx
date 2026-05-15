import { Routes, Route, Navigate } from 'react-router-dom';
import useAuthStore from './store/authStore';
import Dashboard from './pages/Dashboard';
import Login     from './pages/Login';
import Inventory from './pages/Inventory';
import Billing   from './pages/Billing';
import Customers from './pages/Customers';
import Vendors   from './pages/Vendors';
import Reports   from './pages/Reports';
import Settings  from './pages/Settings';

/** Private route — login na hoy to redirect karo */
const PrivateRoute = ({ children }) => {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

export default function App() {
  return (
    <Routes>
      <Route path="/login"     element={<Login />} />
      <Route path="/"          element={<PrivateRoute><Dashboard /></PrivateRoute>} />
      <Route path="/inventory" element={<PrivateRoute><Inventory /></PrivateRoute>} />
      <Route path="/billing"   element={<PrivateRoute><Billing /></PrivateRoute>} />
      <Route path="/customers" element={<PrivateRoute><Customers /></PrivateRoute>} />
      <Route path="/vendors"   element={<PrivateRoute><Vendors /></PrivateRoute>} />
      <Route path="/reports"   element={<PrivateRoute><Reports /></PrivateRoute>} />
      <Route path="/settings"  element={<PrivateRoute><Settings /></PrivateRoute>} />
      <Route path="*"          element={<Navigate to="/" replace />} />
    </Routes>
  );
}
