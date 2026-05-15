import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';

export default function Vendors() {
  return (
    <div className="flex h-screen bg-slate-50">
      <div className="hidden lg:flex"><Sidebar /></div>
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar title="Vendors" />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-2xl font-semibold text-slate-300">Vendors</p>
            <p className="text-sm text-slate-400 mt-1">Coming Soon — Generate with AI Assistant</p>
          </div>
        </main>
      </div>
    </div>
  );
}
