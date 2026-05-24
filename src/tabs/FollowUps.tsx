import { useState, useMemo } from 'react';
import { Customer, FollowUpStatus } from '../types';
import { formatDate, daysUntil, todayISO } from '../utils/dates';
import { Calendar, CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';
import PriorityBadge from '../components/PriorityBadge';

interface Props {
  customers: Customer[];
  onUpdateCustomer: (c: Customer) => void;
}

type Filter = 'all' | 'pending' | 'overdue' | 'upcoming' | 'completed';

export default function FollowUps({ customers, onUpdateCustomer }: Props) {
  const [filter, setFilter] = useState<Filter>('pending');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [followUpDate, setFollowUpDate] = useState('');
  const [followUpStatus, setFollowUpStatus] = useState<FollowUpStatus>('pending');

  const withFollowUp = customers.filter((c) => c.followUpDate);
  const withoutFollowUp = customers.filter((c) => !c.followUpDate);

  const filtered = useMemo(() => {
    const today = todayISO();
    return withFollowUp.filter((c) => {
      if (filter === 'all') return true;
      if (filter === 'pending') return c.followUpStatus === 'pending' || !c.followUpStatus;
      if (filter === 'completed') return c.followUpStatus === 'completed';
      if (filter === 'overdue') return (c.followUpDate ?? '') < today && c.followUpStatus !== 'completed';
      if (filter === 'upcoming') {
        const d = daysUntil(c.followUpDate);
        return d !== null && d >= 0 && d <= 14 && c.followUpStatus !== 'completed';
      }
      return true;
    }).sort((a, b) => (a.followUpDate ?? '').localeCompare(b.followUpDate ?? ''));
  }, [withFollowUp, filter]);

  const counts = useMemo(() => {
    const today = todayISO();
    return {
      pending: withFollowUp.filter((c) => c.followUpStatus === 'pending' || !c.followUpStatus).length,
      overdue: withFollowUp.filter((c) => (c.followUpDate ?? '') < today && c.followUpStatus !== 'completed').length,
      upcoming: withFollowUp.filter((c) => { const d = daysUntil(c.followUpDate); return d !== null && d >= 0 && d <= 14 && c.followUpStatus !== 'completed'; }).length,
      completed: withFollowUp.filter((c) => c.followUpStatus === 'completed').length,
    };
  }, [withFollowUp]);

  function startEdit(c: Customer) {
    setEditingId(c.id);
    setFollowUpDate(c.followUpDate ?? '');
    setFollowUpStatus(c.followUpStatus ?? 'pending');
  }

  function saveEdit(c: Customer) {
    onUpdateCustomer({ ...c, followUpDate: followUpDate || undefined, followUpStatus, updatedAt: new Date().toISOString() });
    setEditingId(null);
  }

  function quickStatus(c: Customer, status: FollowUpStatus) {
    onUpdateCustomer({ ...c, followUpStatus: status, updatedAt: new Date().toISOString() });
  }

  function addFollowUp(c: Customer) {
    setEditingId(c.id);
    setFollowUpDate('');
    setFollowUpStatus('pending');
  }

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Follow-Ups</h2>
        <div className="flex flex-wrap gap-2">
          {([
            ['all', 'All', withFollowUp.length, null],
            ['pending', 'Pending', counts.pending, 'text-amber-600'],
            ['overdue', 'Overdue', counts.overdue, 'text-red-600'],
            ['upcoming', 'Next 14 Days', counts.upcoming, 'text-blue-600'],
            ['completed', 'Completed', counts.completed, 'text-emerald-600'],
          ] as const).map(([val, label, count, color]) => (
            <button
              key={val}
              onClick={() => setFilter(val as Filter)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${filter === val ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              {label}
              <span className={`ml-1.5 text-xs ${filter === val ? 'text-blue-200' : color ?? 'text-gray-500'}`}>({count})</span>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="text-center py-12 bg-white rounded-2xl border border-gray-200 text-gray-400">
            <Calendar className="w-10 h-10 mx-auto mb-3 text-gray-200" />
            <p>No follow-ups in this category.</p>
          </div>
        )}
        {filtered.map((customer) => {
          const d = daysUntil(customer.followUpDate);
          const overdue = d !== null && d < 0 && customer.followUpStatus !== 'completed';
          const upcoming = d !== null && d >= 0 && d <= 3;
          return (
            <div key={customer.id} className={`bg-white rounded-2xl border-2 overflow-hidden ${overdue ? 'border-red-200' : upcoming ? 'border-amber-200' : 'border-gray-200'}`}>
              <div className="px-5 py-4 flex items-start justify-between gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-gray-900">{customer.name}</span>
                    {customer.company && <span className="text-sm text-gray-500">— {customer.company}</span>}
                    <PriorityBadge priority={customer.priority} />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{customer.city}, {customer.state}</p>
                  <div className="flex items-center gap-3 mt-2 flex-wrap text-sm">
                    <span className={`flex items-center gap-1.5 font-medium ${overdue ? 'text-red-600' : upcoming ? 'text-amber-600' : 'text-gray-700'}`}>
                      {overdue ? <AlertTriangle className="w-3.5 h-3.5" /> : <Calendar className="w-3.5 h-3.5" />}
                      {formatDate(customer.followUpDate)}
                      {d !== null && (
                        <span className="text-xs">
                          {d < 0 ? `(${Math.abs(d)}d overdue)` : d === 0 ? '(today)' : `(in ${d}d)`}
                        </span>
                      )}
                    </span>
                    <StatusBadge status={customer.followUpStatus ?? 'pending'} />
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {customer.followUpStatus !== 'completed' && (
                    <button
                      onClick={() => quickStatus(customer, 'completed')}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors"
                    >
                      <CheckCircle className="w-3.5 h-3.5" /> Done
                    </button>
                  )}
                  <button
                    onClick={() => editingId === customer.id ? saveEdit(customer) : startEdit(customer)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${editingId === customer.id ? 'bg-blue-600 text-white hover:bg-blue-700' : 'text-blue-600 bg-blue-50 border border-blue-200 hover:bg-blue-100'}`}
                  >
                    {editingId === customer.id ? 'Save' : 'Edit'}
                  </button>
                  {editingId === customer.id && (
                    <button onClick={() => setEditingId(null)} className="px-3 py-1.5 text-xs font-semibold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                      Cancel
                    </button>
                  )}
                </div>
              </div>
              {editingId === customer.id && (
                <div className="px-5 pb-5 pt-3 border-t border-gray-100 flex flex-wrap gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">Follow-Up Date</label>
                    <input type="date" value={followUpDate} onChange={(e) => setFollowUpDate(e.target.value)} className="border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">Status</label>
                    <select value={followUpStatus} onChange={(e) => setFollowUpStatus(e.target.value as FollowUpStatus)} className="border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500">
                      <option value="pending">Pending</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {withoutFollowUp.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="font-bold text-gray-900 text-sm">Customers Without a Follow-Up Date ({withoutFollowUp.length})</h3>
          </div>
          <div className="divide-y divide-gray-100 max-h-64 overflow-y-auto">
            {withoutFollowUp.slice(0, 20).map((c) => (
              <div key={c.id} className="px-5 py-3 flex items-center justify-between gap-4">
                <div>
                  <span className="text-sm font-medium text-gray-800">{c.name}</span>
                  {c.company && <span className="text-xs text-gray-500 ml-2">{c.company}</span>}
                </div>
                {editingId === c.id ? (
                  <div className="flex items-center gap-2">
                    <input type="date" value={followUpDate} onChange={(e) => setFollowUpDate(e.target.value)} className="border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-blue-500" />
                    <button onClick={() => saveEdit(c)} className="text-xs font-semibold text-blue-600 hover:text-blue-800">Save</button>
                    <button onClick={() => setEditingId(null)} className="text-xs text-gray-400 hover:text-gray-600">Cancel</button>
                  </div>
                ) : (
                  <button onClick={() => addFollowUp(c)} className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> Add Follow-Up
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: FollowUpStatus }) {
  const styles: Record<FollowUpStatus, string> = {
    pending: 'bg-amber-100 text-amber-700',
    completed: 'bg-emerald-100 text-emerald-700',
    cancelled: 'bg-gray-100 text-gray-500',
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold capitalize ${styles[status]}`}>{status}</span>
  );
}
