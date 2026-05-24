import { useState, useCallback, useEffect, useRef } from 'react';
import { Customer, AppSettings } from './types';
import { useAuth } from './AuthContext';
import { supabase } from './supabaseClient';
import LoginPage from './pages/LoginPage';
import {
  loadCustomers, saveCustomers, loadSettings, saveSettings,
  fetchCustomers, fetchSettings,
  upsertCustomer, deleteCustomerRemote, upsertSettings,
} from './storage';
import Dashboard from './tabs/Dashboard';
import ImportCustomers from './tabs/ImportCustomers';
import FindNearby from './tabs/FindNearby';
import RouteBuilder from './tabs/RouteBuilder';
import VisitNotes from './tabs/VisitNotes';
import FollowUps from './tabs/FollowUps';
import CustomerList from './tabs/CustomerList';
import Settings from './tabs/Settings';
import CustomerModal from './components/CustomerModal';
import ToastContainer, { ToastMessage } from './components/Toast';
import {
  LayoutDashboard, Upload, MapPin, Route, StickyNote, Calendar,
  Users, Settings2, Menu, X, Map, LogOut, Loader2,
} from 'lucide-react';

type Tab = 'dashboard' | 'import' | 'nearby' | 'route' | 'notes' | 'followups' | 'customers' | 'settings';

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'dashboard', label: 'Dashboard',            icon: <LayoutDashboard className="w-5 h-5" /> },
  { id: 'import',    label: 'Import Customers',      icon: <Upload className="w-5 h-5" /> },
  { id: 'nearby',    label: 'Find Nearby Customers', icon: <MapPin className="w-5 h-5" /> },
  { id: 'route',     label: 'Route Builder',         icon: <Route className="w-5 h-5" /> },
  { id: 'notes',     label: 'Visit Notes',           icon: <StickyNote className="w-5 h-5" /> },
  { id: 'followups', label: 'Follow-Ups',            icon: <Calendar className="w-5 h-5" /> },
  { id: 'customers', label: 'Customer List',         icon: <Users className="w-5 h-5" /> },
  { id: 'settings',  label: 'Settings',              icon: <Settings2 className="w-5 h-5" /> },
];

export default function App() {
  const { session, user, loading: authLoading, signOut } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>(() => loadCustomers());
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());
  const [dataLoading, setDataLoading] = useState(false);
  const [dataError, setDataError] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [editModalCustomer, setEditModalCustomer] = useState<Customer | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const userIdRef = useRef<string | undefined>(user?.id);
  useEffect(() => { userIdRef.current = user?.id; }, [user?.id]);

  // ── Toast helpers ──────────────────────────────────────────────────────────

  function addToast(type: ToastMessage['type'], message: string) {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev.slice(-3), { id, type, message }]);
  }

  function dismissToast(id: string) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  // ── Online / offline detection ─────────────────────────────────────────────

  useEffect(() => {
    function onOffline() { addToast('offline', 'You are offline. Changes will sync when reconnected.'); }
    function onOnline()  { setToasts((prev) => prev.filter((t) => t.type !== 'offline')); }
    window.addEventListener('offline', onOffline);
    window.addEventListener('online', onOnline);
    if (!navigator.onLine) onOffline();
    return () => {
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('online', onOnline);
    };
  }, []);

  // ── Initial data load + Realtime subscription ──────────────────────────────

  useEffect(() => {
    if (!session) return;

    setDataLoading(true);
    setDataError('');
    Promise.all([fetchCustomers(), fetchSettings()])
      .then(([c, s]) => { setCustomers(c); setSettings(s); })
      .catch((err) => {
        const msg = err instanceof Error ? err.message : 'Failed to load data';
        setDataError(msg);
        addToast('error', 'Could not load your data. Showing cached version.');
      })
      .finally(() => setDataLoading(false));

    const channel = supabase
      .channel('customers-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'customers', filter: `user_id=eq.${session.user.id}` },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const row = payload.new as { id: string; data: unknown };
            const updated = { ...(row.data as Customer), id: row.id };
            setCustomers((prev) => {
              const exists = prev.some((c) => c.id === updated.id);
              const next = exists
                ? prev.map((c) => (c.id === updated.id ? updated : c))
                : [...prev, updated];
              saveCustomers(next);
              return next;
            });
          } else if (payload.eventType === 'DELETE') {
            const id = (payload.old as { id: string }).id;
            setCustomers((prev) => {
              const next = prev.filter((c) => c.id !== id);
              saveCustomers(next);
              return next;
            });
            setSelectedIds((prev) => { const n = new Set(prev); n.delete(id); return n; });
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [session?.user.id]);

  // ── Customer mutations ─────────────────────────────────────────────────────

  async function handleImport(imported: Customer[], mode: 'replace' | 'merge') {
    const next = mode === 'replace' ? imported : [...customers, ...imported];
    setCustomers(next);
    saveCustomers(next);
    if (mode === 'replace') setSelectedIds(new Set());
    if (user) {
      try {
        await Promise.all(imported.map((c) => upsertCustomer(c, user.id)));
      } catch {
        addToast('error', 'Import saved locally but failed to sync. Will retry on next change.');
      }
    }
  }

  const handleAddCustomer = useCallback(async (c: Customer) => {
    setCustomers((prev) => { const next = [...prev, c]; saveCustomers(next); return next; });
    if (user) {
      try { await upsertCustomer(c, user.id); }
      catch { addToast('error', 'Customer saved locally but failed to sync to database.'); }
    }
  }, [user]);

  const handleUpdateCustomer = useCallback(async (updated: Customer) => {
    setCustomers((prev) => {
      const next = prev.map((c) => (c.id === updated.id ? updated : c));
      saveCustomers(next);
      return next;
    });
    setEditModalCustomer(null);
    if (user) {
      try { await upsertCustomer(updated, user.id); }
      catch { addToast('error', 'Change saved locally but failed to sync to database.'); }
    }
  }, [user]);

  const handleDeleteCustomer = useCallback(async (id: string) => {
    setCustomers((prev) => { const next = prev.filter((c) => c.id !== id); saveCustomers(next); return next; });
    setSelectedIds((prev) => { const n = new Set(prev); n.delete(id); return n; });
    if (user) {
      try { await deleteCustomerRemote(id); }
      catch { addToast('error', 'Delete failed to sync. The customer may reappear on reload.'); }
    }
  }, [user]);

  // ── Settings mutations ─────────────────────────────────────────────────────

  async function handleSaveSettings(s: AppSettings) {
    setSettings(s);
    saveSettings(s);
    if (user) {
      try { await upsertSettings(s, user.id); }
      catch { addToast('error', 'Settings saved locally but failed to sync.'); }
    }
  }

  async function handleClearAllData() {
    setCustomers([]);
    saveCustomers([]);
    setSelectedIds(new Set());
    const blank: AppSettings = { defaultRadius: 25, defaultCity: '', companyName: '', salesRepName: '', homeBase: '' };
    await handleSaveSettings(blank);
    if (user) {
      try { await supabase.from('customers').delete().eq('user_id', user.id); }
      catch { addToast('error', 'Remote data could not be cleared. Please try again.'); }
    }
  }

  function navigate(tab: string) { setActiveTab(tab as Tab); setSidebarOpen(false); }

  // ── Auth gate ──────────────────────────────────────────────────────────────

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (!session) return <LoginPage />;

  const pendingFollowUps = customers.filter(
    (c) => c.followUpDate && c.followUpStatus !== 'completed' && new Date(c.followUpDate) <= new Date()
  ).length;

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 h-full w-64 bg-slate-900 text-white z-40 flex flex-col transition-transform duration-200 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static lg:z-auto`}>
        <div className="px-5 py-5 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0">
              <Map className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-sm leading-tight truncate">{settings.companyName || 'Route Planner'}</p>
              {settings.salesRepName && (
                <p className="text-xs text-slate-400 leading-tight truncate">{settings.salesRepName}</p>
              )}
            </div>
          </div>
          <button className="lg:hidden p-1 rounded-lg hover:bg-slate-700" onClick={() => setSidebarOpen(false)}>
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-1">
          {TABS.map((tab) => {
            const active = activeTab === tab.id;
            const followBadge = tab.id === 'followups' && pendingFollowUps > 0 ? pendingFollowUps : null;
            const routeBadge  = tab.id === 'route' && selectedIds.size > 0 ? selectedIds.size : null;
            return (
              <button
                key={tab.id}
                onClick={() => navigate(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${active ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}
              >
                {tab.icon}
                <span className="flex-1 text-left">{tab.label}</span>
                {followBadge !== null && (
                  <span className="bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center">{followBadge}</span>
                )}
                {routeBadge !== null && (
                  <span className="bg-emerald-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center">{routeBadge}</span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="px-4 py-4 border-t border-slate-700 space-y-3">
          <p className="text-xs text-slate-500 truncate">{user?.email}</p>
          <button
            onClick={signOut}
            className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-gray-200 px-4 lg:px-6 py-4 flex items-center gap-4 sticky top-0 z-20">
          <button className="lg:hidden p-2 rounded-xl hover:bg-gray-100 transition-colors" onClick={() => setSidebarOpen(true)}>
            <Menu className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-gray-900 leading-tight">
              {TABS.find((t) => t.id === activeTab)?.label}
            </h1>
            {customers.length > 0 && (
              <p className="text-xs text-gray-400 hidden sm:block">
                {customers.length} customers • {settings.salesRepName || user?.email}
              </p>
            )}
          </div>
          {dataLoading && <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />}
          {selectedIds.size > 0 && (
            <button
              onClick={() => navigate('route')}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-colors"
            >
              <Route className="w-4 h-4" />
              Route ({selectedIds.size})
            </button>
          )}
        </header>

        {/* Data load error banner */}
        {dataError && (
          <div className="mx-4 lg:mx-6 mt-4 flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
            <Loader2 className="w-4 h-4 flex-shrink-0" />
            <span className="flex-1">Showing cached data. Could not reach the database: {dataError}</span>
            <button
              onClick={() => {
                setDataError('');
                setDataLoading(true);
                Promise.all([fetchCustomers(), fetchSettings()])
                  .then(([c, s]) => { setCustomers(c); setSettings(s); })
                  .catch((err) => setDataError(err instanceof Error ? err.message : 'Failed'))
                  .finally(() => setDataLoading(false));
              }}
              className="text-xs font-semibold underline whitespace-nowrap"
            >
              Retry
            </button>
          </div>
        )}

        <main className="flex-1 px-4 lg:px-6 py-6 overflow-auto">
          {activeTab === 'dashboard' && (
            <Dashboard customers={customers} onEditCustomer={(c) => setEditModalCustomer(c)} onNavigate={navigate} />
          )}
          {activeTab === 'import' && (
            <ImportCustomers onImport={handleImport} existingCount={customers.length} />
          )}
          {activeTab === 'nearby' && (
            <FindNearby
              customers={customers}
              selectedIds={selectedIds}
              onSelectionChange={setSelectedIds}
              onUpdateCustomer={handleUpdateCustomer}
              onEditCustomer={(c) => setEditModalCustomer(c)}
              onNavigate={navigate}
            />
          )}
          {activeTab === 'route' && (
            <RouteBuilder
              customers={customers}
              selectedIds={selectedIds}
              onSelectionChange={setSelectedIds}
              onNavigate={navigate}
            />
          )}
          {activeTab === 'notes' && (
            <VisitNotes customers={customers} onUpdateCustomer={handleUpdateCustomer} />
          )}
          {activeTab === 'followups' && (
            <FollowUps customers={customers} onUpdateCustomer={handleUpdateCustomer} />
          )}
          {activeTab === 'customers' && (
            <CustomerList
              customers={customers}
              onAddCustomer={handleAddCustomer}
              onUpdateCustomer={handleUpdateCustomer}
              onDeleteCustomer={handleDeleteCustomer}
            />
          )}
          {activeTab === 'settings' && (
            <Settings
              settings={settings}
              customers={customers}
              onSaveSettings={handleSaveSettings}
              onClearAllData={handleClearAllData}
            />
          )}
        </main>
      </div>

      {editModalCustomer && (
        <CustomerModal
          customer={editModalCustomer}
          onSave={handleUpdateCustomer}
          onClose={() => setEditModalCustomer(null)}
        />
      )}

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
