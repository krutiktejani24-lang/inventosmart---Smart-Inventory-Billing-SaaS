import { useState } from 'react';
import { Menu, Bell, X } from 'lucide-react';
import Sidebar from './Sidebar';
import LanguageSwitcher from './LanguageSwitcher';
import useAuthStore from '../store/authStore';

export default function Navbar({ title }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuthStore();

  return (
    <>
      <header className="h-14 flex items-center gap-3 px-4 lg:px-6 bg-white border-b border-slate-100 shrink-0">
        <button
          onClick={() => setSidebarOpen(true)}
          className="lg:hidden p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"
        >
          <Menu size={20} />
        </button>

        <h1 className="text-[15px] font-semibold text-slate-800 mr-auto">
          {title}
        </h1>

        <LanguageSwitcher />

        <button className="relative p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
          <Bell size={18} />
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500" />
        </button>

        <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white text-xs font-semibold cursor-pointer">
          {user?.name?.charAt(0)?.toUpperCase() || 'U'}
        </div>
      </header>

      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setSidebarOpen(false)}
          />

          <div className="relative z-10">
            <Sidebar onClose={() => setSidebarOpen(false)} />
          </div>

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