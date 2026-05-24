import { useState, useEffect, useCallback } from 'react';
import { Visit, Customer } from '../types';
import { useAuth } from '../AuthContext';
import { supabase } from '../supabaseClient';
import {
  fetchVisitsForCustomer, insertVisit, updateVisit, deleteVisit,
} from '../storage';
import {
  Plus, Pencil, Trash2, Check, X, Loader2, CalendarDays,
  ClipboardList, Clock, AlertCircle,
} from 'lucide-react';

interface Props {
  customer: Customer;
  onLastVisitChange: (date: string | undefined) => void;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function timeAgo(iso: string) {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

export default function VisitHistory({ customer, onLastVisitChange }: Props) {
  const { user } = useAuth();
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // "Add visit" form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [addDate, setAddDate] = useState(todayISO());
  const [addNotes, setAddNotes] = useState('');
  const [addSaving, setAddSaving] = useState(false);

  // "Edit visit" state
  const [editId, setEditId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // ── Load + Realtime ─────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    try {
      const data = await fetchVisitsForCustomer(customer.id);
      setVisits(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load visits');
    } finally {
      setLoading(false);
    }
  }, [customer.id]);

  useEffect(() => {
    load();

    const channel = supabase
      .channel(`visits-${customer.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'visits', filter: `customer_id=eq.${customer.id}` },
        () => { load(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [customer.id, load]);

  // Keep parent in sync with latest visit date
  useEffect(() => {
    const latest = visits[0]?.visitDate;
    onLastVisitChange(latest ? latest.slice(0, 10) : undefined);
  }, [visits, onLastVisitChange]);

  // ── Mutations ───────────────────────────────────────────────────────────────

  async function handleAdd() {
    if (!user || !addDate) return;
    setAddSaving(true);
    setError('');
    try {
      const created = await insertVisit(
        { customerId: customer.id, userId: user.id, visitDate: addDate, visitNotes: addNotes },
        user.id
      );
      setVisits((prev) => [created, ...prev].sort((a, b) => b.visitDate.localeCompare(a.visitDate)));
      setShowAddForm(false);
      setAddDate(todayISO());
      setAddNotes('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save visit');
    } finally {
      setAddSaving(false);
    }
  }

  function startEdit(v: Visit) {
    setEditId(v.id);
    setEditDate(v.visitDate.slice(0, 10));
    setEditNotes(v.visitNotes);
  }

  async function handleEditSave(v: Visit) {
    setEditSaving(true);
    setError('');
    try {
      const updated: Visit = { ...v, visitDate: editDate, visitNotes: editNotes };
      await updateVisit(updated);
      setVisits((prev) =>
        prev.map((x) => (x.id === v.id ? updated : x))
          .sort((a, b) => b.visitDate.localeCompare(a.visitDate))
      );
      setEditId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update visit');
    } finally {
      setEditSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setError('');
    try {
      await deleteVisit(id);
      setVisits((prev) => prev.filter((v) => v.id !== id));
      setDeleteConfirm(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete visit');
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  const latestVisit = visits[0];

  return (
    <div className="border-t border-gray-100">
      {/* Summary bar */}
      <div className="px-5 py-3 bg-slate-50 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-5 text-sm">
          <span className="flex items-center gap-1.5 text-gray-600">
            <ClipboardList className="w-4 h-4 text-slate-400" />
            <span className="font-semibold text-gray-900">{visits.length}</span>
            {visits.length === 1 ? 'visit' : 'visits'}
          </span>
          {latestVisit && (
            <span className="flex items-center gap-1.5 text-gray-600">
              <Clock className="w-4 h-4 text-slate-400" />
              Latest: <span className="font-semibold text-gray-900">{formatDateTime(latestVisit.visitDate)}</span>
              <span className="text-gray-400">({timeAgo(latestVisit.visitDate)})</span>
            </span>
          )}
        </div>
        <button
          onClick={() => { setShowAddForm((v) => !v); setError(''); }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Visit
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="mx-5 mt-3 flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Add form */}
      {showAddForm && (
        <div className="mx-5 mt-4 mb-2 border-2 border-blue-200 rounded-xl bg-blue-50/40 p-4 space-y-3">
          <p className="text-xs font-bold text-blue-700 uppercase tracking-wider">New Visit</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Visit Date</label>
              <input
                type="date"
                value={addDate}
                max={todayISO()}
                onChange={(e) => setAddDate(e.target.value)}
                className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Visit Notes</label>
            <textarea
              value={addNotes}
              onChange={(e) => setAddNotes(e.target.value)}
              autoFocus
              rows={3}
              placeholder="What happened during this visit? Any observations or follow-ups?"
              className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500 resize-none"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              disabled={!addDate || addSaving}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {addSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              Save Visit
            </button>
            <button
              onClick={() => { setShowAddForm(false); setAddNotes(''); setAddDate(todayISO()); }}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Visit list */}
      <div className="px-5 pb-4 pt-3 space-y-3">
        {loading && (
          <div className="flex items-center justify-center py-6 text-gray-400">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        )}

        {!loading && visits.length === 0 && !showAddForm && (
          <div className="text-center py-6 text-gray-400">
            <CalendarDays className="w-8 h-8 mx-auto mb-2 text-gray-200" />
            <p className="text-sm">No visits recorded yet.</p>
          </div>
        )}

        {visits.map((visit, idx) => (
          <div
            key={visit.id}
            className={`rounded-xl border ${idx === 0 ? 'border-blue-200 bg-blue-50/30' : 'border-gray-200 bg-white'} overflow-hidden`}
          >
            {editId === visit.id ? (
              <div className="p-4 space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Visit Date</label>
                  <input
                    type="date"
                    value={editDate}
                    max={todayISO()}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Notes</label>
                  <textarea
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    autoFocus
                    rows={3}
                    className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500 resize-none"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEditSave(visit)}
                    disabled={!editDate || editSaving}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {editSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    Save
                  </button>
                  <button
                    onClick={() => setEditId(null)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="flex items-center gap-1.5 text-sm font-semibold text-gray-900">
                      <CalendarDays className="w-4 h-4 text-blue-500" />
                      {formatDateTime(visit.visitDate)}
                    </span>
                    <span className="text-xs text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">
                      {timeAgo(visit.visitDate)}
                    </span>
                    {idx === 0 && (
                      <span className="text-xs font-semibold text-blue-700 bg-blue-100 rounded-full px-2 py-0.5">
                        Latest
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => startEdit(visit)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                      title="Edit visit"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(visit.id)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="Delete visit"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                {visit.visitNotes ? (
                  <p className="mt-2 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{visit.visitNotes}</p>
                ) : (
                  <p className="mt-2 text-sm text-gray-400 italic">No notes for this visit.</p>
                )}
              </div>
            )}

            {/* Delete confirmation inline */}
            {deleteConfirm === visit.id && (
              <div className="border-t border-red-200 bg-red-50 px-4 py-3 flex items-center justify-between gap-3">
                <p className="text-sm text-red-700 font-medium">Delete this visit?</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleDelete(visit.id)}
                    className="px-3 py-1.5 text-xs font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Delete
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(null)}
                    className="px-3 py-1.5 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
