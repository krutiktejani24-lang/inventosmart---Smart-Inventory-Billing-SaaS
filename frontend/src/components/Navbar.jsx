import { useState } from 'react';
import { Menu, Bell, Search, X } from 'lucide-react';
import Sidebar from './Sidebar';
import useAuthStore from '../store/authStore';

/**
 * Navbar — mobile hamburger, search bar, notifications, user avatar
 * Desktop ma sirf top bar; mobile ma sidebar drawer include kare
 */
export default function Navbar({ title = 'Dashboard' }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuthStore();

  return (
    <>
      {/* Top bar */}
      <header className="h-14 flex items-center gap-4 px-4 lg:px-6 bg-white border-b border-slate-100 shrink-0">

        {/* Mobile hamburger */}
        <button
          onClick={() => setSidebarOpen(true)}
          className="lg:hidden p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>

        {/* Page title */}
        <h1 className="text-[15px] font-semibold text-slate-800 mr-auto">{title}</h1>

        {/* Search */}
        <div className="hidden md:flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 w-52">
          <Search size={14} className="text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder="Search..."
            className="bg-transparent text-sm text-slate-700 placeholder-slate-400 outline-none w-full"
          />
        </div>

        {/* Bell */}
        <button className="relative p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
          <Bell size={18} />
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500"></span>
        </button>

        {/* Avatar */}
        <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white text-xs font-semibold cursor-pointer">
          {user?.name?.charAt(0)?.toUpperCase() || 'U'}
        </div>
      </header>

      {/* Mobile sidebar drawer */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setSidebarOpen(false)}
          />
          {/* Drawer */}
          <div className="relative z-10">
            <Sidebar onClose={() => setSidebarOpen(false)} />
          </div>
          {/* Close btn */}
          <button
            onClick={() => setSidebarOpen(false)}
            className="absolute top-4 right-4 p-1 rounded-full bg-white/10 text-white"
          >
            <X size={18} />
          </button>
        </div>
      )}
    </>
  );
}
