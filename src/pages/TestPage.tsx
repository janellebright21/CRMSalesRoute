import { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Customer } from '../types';
import {
  LogIn, UserPlus, RefreshCw, Trash2, CheckCircle,
  AlertCircle, Loader2, Database, User, Mail, Lock,
} from 'lucide-react';

type LogLevel = 'info' | 'success' | 'error';
interface LogEntry { id: number; level: LogLevel; message: string; detail?: string; ts: string; }

let logSeq = 0;

function ts() { return new Date().toLocaleTimeString(); }

// ── sample customer data ──────────────────────────────────────────────────────

function makeSampleCustomer(userId: string): Omit<Parameters<typeof supabase.from>[0] extends 'customers' ? never : object, never> {
  const id = crypto.randomUUID();
  const customer: Customer = {
    id,
    name: 'Jane Sample',
    company: 'Acme Corp',
    address: '100 Test Street',
    city: 'Chicago',
    state: 'IL',
    zip: '60601',
    phone: '312-555-0100',
    email: 'jane@acme-test.example',
    priority: 'high',
    visitNotes: 'Inserted by integration test',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return {
    id,
    user_id: userId,
    name: customer.name,
    address: [customer.address, customer.city, customer.state, customer.zip].join(', '),
    phone: customer.phone ?? '',
    email: customer.email ?? '',
    notes: customer.visitNotes ?? '',
    last_visited: null,
    data: customer,
    updated_at: customer.updatedAt,
  };
}

// ── component ─────────────────────────────────────────────────────────────────

export default function TestPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [userId, setUserId] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [busy, setBusy] = useState('');

  function addLog(level: LogLevel, message: string, detail?: string) {
    setLog((prev) => [{ id: ++logSeq, level, message, detail, ts: ts() }, ...prev]);
  }

  // ── 1. Sign in ──────────────────────────────────────────────────────────────

  async function handleLogin() {
    if (!email || !password) { addLog('error', 'Enter email and password first'); return; }
    setBusy('login');
    addLog('info', `Signing in as ${email}…`);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      setUserId(data.user.id);
      addLog('success', `Signed in successfully`, `user_id: ${data.user.id}`);
    } catch (e) {
      addLog('error', 'Sign-in failed', e instanceof Error ? e.message : String(e));
    } finally { setBusy(''); }
  }

  // ── 2. Sign up ──────────────────────────────────────────────────────────────

  async function handleSignUp() {
    if (!email || !password) { addLog('error', 'Enter email and password first'); return; }
    setBusy('signup');
    addLog('info', `Creating account for ${email}…`);
    try {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      if (data.user) {
        setUserId(data.user.id);
        addLog('success', 'Account created and signed in', `user_id: ${data.user.id}`);
      } else {
        addLog('info', 'Check your email to confirm your account');
      }
    } catch (e) {
      addLog('error', 'Sign-up failed', e instanceof Error ? e.message : String(e));
    } finally { setBusy(''); }
  }

  // ── 3. Insert sample customer ───────────────────────────────────────────────

  async function handleInsert() {
    if (!userId) { addLog('error', 'Sign in first — no user_id available'); return; }
    setBusy('insert');
    addLog('info', 'Inserting sample customer…');
    try {
      const row = makeSampleCustomer(userId);
      const { data, error } = await supabase
        .from('customers')
        .insert(row as never)
        .select('id, name')
        .single();
      if (error) throw error;
      addLog('success', `Customer inserted`, `id: ${(data as { id: string }).id}  name: ${(data as { name: string }).name}`);
    } catch (e) {
      addLog('error', 'Insert failed', e instanceof Error ? e.message : String(e));
    } finally { setBusy(''); }
  }

  // ── 4. Fetch customers ──────────────────────────────────────────────────────

  async function handleFetch() {
    if (!userId) { addLog('error', 'Sign in first — no user_id available'); return; }
    setBusy('fetch');
    addLog('info', 'Fetching customers from Supabase…');
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('id, data')
        .order('created_at', { ascending: false });
      if (error) throw error;
      const parsed: Customer[] = (data ?? []).map((row) => ({
        ...(row.data as Customer),
        id: row.id as string,
      }));
      setCustomers(parsed);
      addLog('success', `Fetched ${parsed.length} customer${parsed.length !== 1 ? 's' : ''}`, `Rows returned from Supabase`);
    } catch (e) {
      addLog('error', 'Fetch failed', e instanceof Error ? e.message : String(e));
    } finally { setBusy(''); }
  }

  // ── 5. Delete test customers ────────────────────────────────────────────────

  async function handleDeleteTestData() {
    if (!userId) { addLog('error', 'Sign in first'); return; }
    setBusy('delete');
    addLog('info', 'Deleting sample test customers (email = jane@acme-test.example)…');
    try {
      const { error, count } = await supabase
        .from('customers')
        .delete({ count: 'exact' })
        .eq('user_id', userId)
        .eq('email', 'jane@acme-test.example');
      if (error) throw error;
      addLog('success', `Deleted ${count ?? 0} test customer row(s)`);
      setCustomers((prev) => prev.filter((c) => c.email !== 'jane@acme-test.example'));
    } catch (e) {
      addLog('error', 'Delete failed', e instanceof Error ? e.message : String(e));
    } finally { setBusy(''); }
  }

  const isLoggedIn = !!userId;

  return (
    <div className="min-h-screen bg-gray-50 p-4 lg:p-8">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
              <Database className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Supabase Integration Test</h1>
              <p className="text-sm text-gray-500">
                URL: <code className="text-xs bg-gray-100 rounded px-1 py-0.5">{import.meta.env.VITE_SUPABASE_URL}</code>
              </p>
            </div>
          </div>
          {isLoggedIn && (
            <div className="mt-3 flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
              <CheckCircle className="w-4 h-4" />
              Authenticated &nbsp;·&nbsp; user_id: <code className="text-xs">{userId}</code>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Left col: Auth + Actions */}
          <div className="space-y-5">

            {/* Auth */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
              <h2 className="font-bold text-gray-900 flex items-center gap-2">
                <User className="w-4 h-4 text-gray-500" />
                Step 1 — Authenticate
              </h2>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="test@example.com"
                    className="w-full border-2 border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="min 6 characters"
                    onKeyDown={(e) => { if (e.key === 'Enter') handleLogin(); }}
                    className="w-full border-2 border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleLogin}
                  disabled={!!busy}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {busy === 'login' ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
                  Sign In
                </button>
                <button
                  onClick={handleSignUp}
                  disabled={!!busy}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-200 disabled:opacity-50 transition-colors"
                >
                  {busy === 'signup' ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                  Sign Up
                </button>
              </div>
            </div>

            {/* DB Actions */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-3">
              <h2 className="font-bold text-gray-900 flex items-center gap-2">
                <Database className="w-4 h-4 text-gray-500" />
                Step 2 — Database Operations
              </h2>
              <p className="text-xs text-gray-500">Sign in first, then run operations in order.</p>

              <button
                onClick={handleInsert}
                disabled={!!busy || !isLoggedIn}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-colors"
              >
                {busy === 'insert' ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                Insert Sample Customer
              </button>

              <button
                onClick={handleFetch}
                disabled={!!busy || !isLoggedIn}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {busy === 'fetch' ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                Fetch Customers
              </button>

              <button
                onClick={handleDeleteTestData}
                disabled={!!busy || !isLoggedIn}
                className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-red-200 text-red-600 rounded-xl text-sm font-semibold hover:bg-red-50 disabled:opacity-50 transition-colors"
              >
                {busy === 'delete' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Delete Test Data
              </button>
            </div>
          </div>

          {/* Right col: Log */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden flex flex-col">
            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-gray-900 text-sm">Operation Log</h2>
              {log.length > 0 && (
                <button onClick={() => setLog([])} className="text-xs text-gray-400 hover:text-gray-600">Clear</button>
              )}
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2 max-h-80 lg:max-h-none">
              {log.length === 0 && (
                <p className="text-sm text-gray-400 italic text-center py-6">No operations yet.</p>
              )}
              {log.map((entry) => (
                <div key={entry.id} className={`rounded-lg px-3 py-2.5 text-xs ${
                  entry.level === 'success' ? 'bg-emerald-50 border border-emerald-200' :
                  entry.level === 'error'   ? 'bg-red-50 border border-red-200' :
                  'bg-blue-50 border border-blue-200'
                }`}>
                  <div className="flex items-start gap-2">
                    {entry.level === 'success' && <CheckCircle className="w-3.5 h-3.5 text-emerald-600 mt-0.5 flex-shrink-0" />}
                    {entry.level === 'error'   && <AlertCircle className="w-3.5 h-3.5 text-red-600 mt-0.5 flex-shrink-0" />}
                    {entry.level === 'info'    && <Loader2    className="w-3.5 h-3.5 text-blue-600 mt-0.5 flex-shrink-0" />}
                    <div className="flex-1">
                      <span className={`font-semibold ${
                        entry.level === 'success' ? 'text-emerald-800' :
                        entry.level === 'error'   ? 'text-red-800' :
                        'text-blue-800'
                      }`}>{entry.message}</span>
                      {entry.detail && (
                        <div className="text-gray-500 mt-0.5 font-mono">{entry.detail}</div>
                      )}
                    </div>
                    <span className="text-gray-400 text-xs whitespace-nowrap">{entry.ts}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Customer list */}
        {customers.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100">
              <h2 className="font-bold text-gray-900">
                Fetched Customers
                <span className="ml-2 text-sm font-normal text-gray-500">({customers.length})</span>
              </h2>
            </div>
            <div className="divide-y divide-gray-100">
              {customers.map((c) => (
                <div key={c.id} className="px-5 py-4 flex items-start gap-4">
                  <div className={`mt-0.5 w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                    c.priority === 'high' ? 'bg-red-500' :
                    c.priority === 'medium' ? 'bg-amber-400' : 'bg-emerald-500'
                  }`} />
                  <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-1 text-sm">
                    <div>
                      <span className="font-semibold text-gray-900">{c.name}</span>
                      {c.company && <span className="text-gray-500 ml-1.5 text-xs">— {c.company}</span>}
                    </div>
                    <div className="text-gray-600 text-xs">
                      {[c.address, c.city, c.state, c.zip].filter(Boolean).join(', ')}
                    </div>
                    {c.phone && <div className="text-gray-500 text-xs">{c.phone}</div>}
                    {c.email && <div className="text-gray-500 text-xs">{c.email}</div>}
                    {c.visitNotes && <div className="text-amber-700 text-xs col-span-full">{c.visitNotes}</div>}
                    <div className="text-gray-400 text-xs font-mono col-span-full">id: {c.id}</div>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${
                    c.priority === 'high' ? 'bg-red-100 text-red-700' :
                    c.priority === 'medium' ? 'bg-amber-100 text-amber-700' :
                    'bg-emerald-100 text-emerald-700'
                  }`}>{c.priority}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="text-center text-xs text-gray-400">
          Test page only — not linked from the main app. Navigate to <a href="/" className="underline hover:text-gray-600">/</a> for the full app.
        </p>
      </div>
    </div>
  );
}
