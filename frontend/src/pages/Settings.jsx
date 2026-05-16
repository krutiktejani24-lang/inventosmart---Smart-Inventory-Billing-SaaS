import { useEffect, useState } from 'react';
import { Save, Key, Users, Building2, Check } from 'lucide-react';
import Navbar        from '../components/Navbar';
import Sidebar       from '../components/Sidebar';
import api           from '../api/axiosConfig';
import useAuthStore  from '../store/authStore';

const TABS = [
  { id:'profile',   label:'Business Profile', icon: Building2 },
  { id:'password',  label:'Change Password',  icon: Key       },
  { id:'team',      label:'Team Members',     icon: Users     },
];

/* ─── Business Profile Tab ──────────────────────────────────────── */
function ProfileTab() {
  const { business, user, setAuth, getToken } = useAuthStore();
  const [form, setForm]     = useState({ name:'', gstin:'', phone:'', email:'', address:'' });
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    if (business) setForm({
      name:    business.name    || '',
      gstin:   business.gstin   || '',
      phone:   business.phone   || '',
      email:   business.email   || '',
      address: business.address || '',
    });
  }, [business]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/auth/business', form);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) { alert(e.response?.data?.message || 'Save failed'); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-4 max-w-lg">
      <div><label className="lbl">Business Name *</label><input className="inp" value={form.name} onChange={e => set('name',e.target.value)}/></div>
      <div><label className="lbl">GSTIN</label><input className="inp" value={form.gstin} onChange={e => set('gstin',e.target.value)} placeholder="22AAAAA0000A1Z5"/></div>
      <div className="grid grid-cols-2 gap-4">
        <div><label className="lbl">Phone</label><input className="inp" value={form.phone} onChange={e => set('phone',e.target.value)}/></div>
        <div><label className="lbl">Email</label><input className="inp" type="email" value={form.email} onChange={e => set('email',e.target.value)}/></div>
      </div>
      <div><label className="lbl">Address</label><textarea className="inp resize-none" rows={3} value={form.address} onChange={e => set('address',e.target.value)}/></div>
      <button onClick={handleSave} disabled={saving}
        className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${saved ? 'bg-emerald-500 text-white' : 'bg-indigo-500 hover:bg-indigo-600 text-white'}`}>
        {saved ? <><Check size={15}/> Saved!</> : <><Save size={15}/>{saving ? 'Saving...' : 'Save Changes'}</>}
      </button>
    </div>
  );
}

/* ─── Change Password Tab ───────────────────────────────────────── */
function PasswordTab() {
  const [form, setForm]     = useState({ currentPassword:'', newPassword:'', confirmPassword:'' });
  const [saving, setSaving] = useState(false);
  const [msg,    setMsg]    = useState('');
  const [error,  setError]  = useState('');
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.currentPassword)                           { setError('Current password required'); return; }
    if (form.newPassword.length < 6)                     { setError('New password must be 6+ chars'); return; }
    if (form.newPassword !== form.confirmPassword)        { setError('Passwords do not match'); return; }
    setSaving(true); setError(''); setMsg('');
    try {
      await api.post('/auth/change-password', { currentPassword: form.currentPassword, newPassword: form.newPassword });
      setMsg('Password changed successfully!');
      setForm({ currentPassword:'', newPassword:'', confirmPassword:'' });
    } catch (e) { setError(e.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-4 max-w-sm">
      {['currentPassword','newPassword','confirmPassword'].map((k) => (
        <div key={k}>
          <label className="lbl">{k === 'currentPassword' ? 'Current Password' : k === 'newPassword' ? 'New Password' : 'Confirm New Password'}</label>
          <input className="inp" type="password" value={form[k]} onChange={e => set(k, e.target.value)} placeholder="••••••••"/>
        </div>
      ))}
      {error && <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
      {msg   && <p className="text-xs text-emerald-600 bg-emerald-50 px-3 py-2 rounded-lg">{msg}</p>}
      <button onClick={handleSave} disabled={saving}
        className="flex items-center gap-2 px-5 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-sm font-medium disabled:opacity-50">
        <Key size={15}/>{saving ? 'Changing...' : 'Change Password'}
      </button>
    </div>
  );
}

/* ─── Team Members Tab ──────────────────────────────────────────── */
function TeamTab() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm]       = useState({ name:'', email:'', password:'', role:'STAFF' });
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');

  const fetchMembers = async () => {
    setLoading(true);
    try { const res = await api.get('/auth/team'); setMembers(res.data.users || []); }
    catch { setMembers([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchMembers(); }, []);

  const handleAdd = async () => {
    if (!form.name || !form.email || !form.password) { setError('All fields required'); return; }
    setSaving(true); setError('');
    try {
      await api.post('/auth/team', form);
      setForm({ name:'', email:'', password:'', role:'STAFF' });
      fetchMembers();
    } catch (e) { setError(e.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const ROLE_STYLE = { ADMIN:'bg-red-50 text-red-600', MANAGER:'bg-amber-50 text-amber-700', STAFF:'bg-slate-100 text-slate-600' };

  return (
    <div className="space-y-6">
      {/* Add member form */}
      <div className="bg-slate-50 rounded-xl p-4 space-y-3">
        <p className="text-sm font-semibold text-slate-700">Add Team Member</p>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="lbl">Name</label><input className="inp" value={form.name} onChange={e => setForm(f=>({...f,name:e.target.value}))} placeholder="Full name"/></div>
          <div><label className="lbl">Email</label><input className="inp" type="email" value={form.email} onChange={e => setForm(f=>({...f,email:e.target.value}))} placeholder="email@company.com"/></div>
          <div><label className="lbl">Password</label><input className="inp" type="password" value={form.password} onChange={e => setForm(f=>({...f,password:e.target.value}))} placeholder="Temp password"/></div>
          <div><label className="lbl">Role</label>
            <select className="inp" value={form.role} onChange={e => setForm(f=>({...f,role:e.target.value}))}>
              <option value="STAFF">Staff</option>
              <option value="MANAGER">Manager</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
        <button onClick={handleAdd} disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-sm font-medium disabled:opacity-50">
          <Users size={14}/>{saving ? 'Adding...' : 'Add Member'}
        </button>
      </div>

      {/* Members list */}
      <div>
        <p className="text-sm font-semibold text-slate-700 mb-3">Current Team</p>
        {loading ? <div className="h-32 bg-slate-100 rounded-xl animate-pulse"/> :
          members.length === 0 ? <p className="text-sm text-slate-400 text-center py-6">No team members yet</p> :
          <div className="space-y-2">
            {members.map(m => (
              <div key={m.id} className="flex items-center justify-between bg-white border border-slate-100 rounded-xl px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-semibold text-sm">
                    {m.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-800">{m.name}</p>
                    <p className="text-xs text-slate-400">{m.email}</p>
                  </div>
                </div>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${ROLE_STYLE[m.role]}`}>{m.role}</span>
              </div>
            ))}
          </div>
        }
      </div>
    </div>
  );
}

/* ─── Main Settings Page ────────────────────────────────────────── */
export default function Settings() {
  const [tab, setTab] = useState('profile');
  const { user } = useAuthStore();

  return (
    <>
      <div className="flex h-screen bg-slate-50 overflow-hidden">
        <div className="hidden lg:flex"><Sidebar /></div>
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <Navbar title="Settings" />
          <main className="flex-1 overflow-y-auto px-4 lg:px-6 py-5">
            <div className="max-w-3xl">
              {/* User info card */}
              <div className="bg-gradient-to-r from-indigo-500 to-indigo-700 rounded-2xl p-5 mb-6 text-white flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-xl font-bold">
                  {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <div>
                  <p className="font-semibold text-lg leading-tight">{user?.name}</p>
                  <p className="text-indigo-200 text-sm">{user?.email}</p>
                  <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full capitalize mt-1 inline-block">
                    {user?.role?.toLowerCase()}
                  </span>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1 mb-5 w-fit">
                {TABS.map(({ id, label, icon: Icon }) => (
                  <button key={id} onClick={() => setTab(id)}
                    className={`flex items-center gap-2 px-4 py-2 text-sm rounded-lg font-medium transition-colors ${tab===id ? 'bg-indigo-500 text-white' : 'text-slate-500 hover:text-slate-700'}`}>
                    <Icon size={14}/>{label}
                  </button>
                ))}
              </div>

              {/* Tab content */}
              <div className="bg-white rounded-xl border border-slate-100 p-6">
                {tab === 'profile'  && <ProfileTab />}
                {tab === 'password' && <PasswordTab />}
                {tab === 'team'     && <TeamTab />}
              </div>
            </div>
          </main>
        </div>
      </div>
      <style>{`.lbl{display:block;font-size:12px;font-weight:500;color:#475569;margin-bottom:4px}.inp{width:100%;border:1px solid #e2e8f0;border-radius:8px;padding:8px 12px;font-size:13px;color:#0f172a;outline:none}.inp:focus{border-color:#818cf8;box-shadow:0 0 0 3px rgba(99,102,241,.1)}`}</style>
    </>
  );
}