import { useState, useEffect } from 'react';
import api from '../api/axiosConfig';
import { Menu, Bell, X } from 'lucide-react';
import Sidebar from './Sidebar';
import LanguageSwitcher from './LanguageSwitcher';
import useAuthStore from '../store/authStore';

export default function Navbar({ title }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuthStore();
  const [notifications, setNotifications] = useState([]);
const [showNotifications, setShowNotifications] = useState(false);


useEffect(() => {
  loadNotifications();
}, []);

const loadNotifications = async () => {
  try {
    const res = await api.get("/notifications");
    setNotifications(res.data.data || []);
  } catch (err) {
    console.error(err);
  }
};

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

        <div className="relative">

  <button
    onClick={() =>
      setShowNotifications(!showNotifications)
    }
    className="relative p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"
  >
    <Bell size={18} />

    {notifications.length > 0 && (
      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] px-1 rounded-full">
        {notifications.length}
      </span>
    )}
  </button>

  {showNotifications && (
    <div className="absolute right-0 mt-2 w-96 bg-white border rounded-xl shadow-xl z-50">

      <div className="p-4 border-b font-semibold">
        Notifications
      </div>

      {notifications.length === 0 ? (
        <p className="p-4 text-slate-500">
          No Notifications
        </p>
      ) : (
        notifications.map((n) => (
          <div
            key={n.id}
            className="p-4 border-b hover:bg-slate-50"
          >
            <p className="font-medium">
              {n.title}
            </p>

            <p className="text-sm text-slate-500">
              {n.message}
            </p>

            <p className="text-xs text-slate-400 mt-1">
              {new Date(
                n.created_at
              ).toLocaleString()}
            </p>
          </div>
        ))
      )}

    </div>
  )}

</div>

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