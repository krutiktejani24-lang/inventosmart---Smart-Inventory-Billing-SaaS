import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Package, FileText, Users, Truck,
  BarChart2, Settings, LogOut, Zap
} from 'lucide-react';
import useAuthStore from '../store/authStore';

const navItems = [
  { to: '/',          icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/inventory', icon: Package,         label: 'Inventory'  },
  { to: '/billing',   icon: FileText,        label: 'Billing'    },
  { to: '/customers', icon: Users,           label: 'Customers'  },
  { to: '/vendors',   icon: Truck,           label: 'Vendors'    },
  { to: '/reports',   icon: BarChart2,       label: 'Reports'    },
  { to: '/settings',  icon: Settings,        label: 'Settings'   },
];

/**
 * Sidebar — navigation links + business name + logout
 * Props: onClose (mobile ma sidebar band karva)
 */
export default function Sidebar({ onClose }) {
  const { business, user, logout } = useAuthStore();

  return (
    <aside className="flex flex-col h-full bg-[#0f1117] text-white w-64 shrink-0">

      {/* Brand */}
      <div className="flex items-center gap-2.5 px-6 py-5 border-b border-white/10">
        <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center shrink-0">
          <Zap size={16} className="text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white truncate leading-tight">
            {business?.name || 'InventoSmart'}
          </p>
          <p className="text-[11px] text-white/40 truncate">
            {business?.gstin || 'GST Platform'}
          </p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 ${
                isActive
                  ? 'bg-indigo-500/20 text-indigo-300 font-medium'
                  : 'text-white/50 hover:text-white hover:bg-white/5'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={17} className={isActive ? 'text-indigo-400' : ''} />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User + Logout */}
      <div className="px-3 py-4 border-t border-white/10">
        <div className="flex items-center gap-3 px-3 py-2 mb-1">
          <div className="w-7 h-7 rounded-full bg-indigo-500/30 flex items-center justify-center text-[11px] font-semibold text-indigo-300 shrink-0">
            {user?.name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-white truncate">{user?.name || 'User'}</p>
            <p className="text-[11px] text-white/30 truncate capitalize">{user?.role?.toLowerCase() || 'admin'}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-all duration-150"
        >
          <LogOut size={16} />
          Logout
        </button>
      </div>
    </aside>
  );
}
