import { useState, useMemo, useCallback } from 'react';
import { Customer, Priority } from '../types';
import CustomerCard from '../components/CustomerCard';
import CustomerModal from '../components/CustomerModal';
import VisitHistory from '../components/VisitHistory';
import { exportToCSV } from '../utils/importExport';
import {
  Plus, Search, Download, Trash2, AlertCircle,
  StickyNote, Check, X as XIcon, ChevronDown,
} from 'lucide-react';

interface Props {
  customers: Customer[];
  onAddCustomer: (c: Customer) => void;
  onUpdateCustomer: (c: Customer) => void;
  onDeleteCustomer: (id: string) => void;
}

type SortBy = 'name' | 'city' | 'priority' | 'lastVisit';

const PRIORITY_ORDER: Record<Priority, number> = { high: 0, medium: 1, low: 2 };

export default function CustomerList({ customers, onAddCustomer, onUpdateCustomer, onDeleteCustomer }: Props) {
  const [search, setSearch] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<Priority | ''>('');
  const [sortBy, setSortBy] = useState<SortBy>('name');
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // Inline notes state
  const [notesOpen, setNotesOpen] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState('');

  // Expanded visit history panels
  const [expandedVisits, setExpandedVisits] = useState<Set<string>>(new Set());

  const cities = useMemo(
    () => Array.from(new Set(customers.map((c) => c.city).filter(Boolean))).sort(),
    [customers]
  );

  const filtered = useMemo(() => {
    let list = customers;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.firstName?.toLowerCase().includes(q) ||
          c.lastName?.toLowerCase().includes(q) ||
          c.company?.toLowerCase().includes(q) ||
          c.address.toLowerCase().includes(q) ||
          c.city.toLowerCase().includes(q)
      );
    }
    if (cityFilter) list = list.filter((c) => c.city === cityFilter);
    if (priorityFilter) list = list.filter((c) => c.priority === priorityFilter);

    return [...list].sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'city') return a.city.localeCompare(b.city);
      if (sortBy === 'priority') return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
      if (sortBy === 'lastVisit') return (b.lastVisitDate ?? '').localeCompare(a.lastVisitDate ?? '');
      return 0;
    });
  }, [customers, search, cityFilter, priorityFilter, sortBy]);

  function openNew() { setEditingCustomer(null); setShowModal(true); }
  function openEdit(c: Customer) { setEditingCustomer(c); setShowModal(true); }

  function handleSave(c: Customer) {
    customers.find((x) => x.id === c.id) ? onUpdateCustomer(c) : onAddCustomer(c);
    setShowModal(false);
  }

  function handleDelete(id: string) { onDeleteCustomer(id); setConfirmDelete(null); }

  function openNotes(c: Customer) { setNotesOpen(c.id); setNotesDraft(c.visitNotes ?? ''); }
  function saveNotes(c: Customer) {
    onUpdateCustomer({ ...c, visitNotes: notesDraft, updatedAt: new Date().toISOString() });
    setNotesOpen(null);
  }

  function toggleVisits(id: string) {
    setExpandedVisits((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const handleLastVisitChange = useCallback(
    (customerId: string, date: string | undefined) => {
      const customer = customers.find((c) => c.id === customerId);
      if (!customer || customer.lastVisitDate === date) return;
      onUpdateCustomer({ ...customer, lastVisitDate: date, updatedAt: new Date().toISOString() });
    },
    [customers, onUpdateCustomer]
  );

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">
            Customer List{' '}
            <span className="text-gray-400 font-normal text-base">({customers.length})</span>
          </h2>
          <div className="flex items-center gap-3">
            <button
              onClick={() => exportToCSV(customers)}
              className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
            <button
              onClick={openNew}
              className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Customer
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, company, city..."
              className="w-full border-2 border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <select
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            className="border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500"
          >
            <option value="">All Cities</option>
            {cities.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as Priority | '')}
            className="border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500"
          >
            <option value="">All Priorities</option>
            <option value="high">High Priority</option>
            <option value="medium">Medium Priority</option>
            <option value="low">Low Priority</option>
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortBy)}
            className="border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500"
          >
            <option value="name">Sort: Name</option>
            <option value="city">Sort: City</option>
            <option value="priority">Sort: Priority</option>
            <option value="lastVisit">Sort: Last Visit</option>
          </select>
        </div>
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 bg-white rounded-2xl border border-gray-200 text-gray-400">
          <p className="text-lg">No customers match your filters.</p>
        </div>
      )}

      <div className="space-y-3">
        {filtered.map((customer) => {
          const visitsOpen = expandedVisits.has(customer.id);
          return (
            <div
              key={customer.id}
              className="bg-white rounded-2xl border-2 border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all overflow-hidden"
            >
              {(customer.firstName || customer.lastName) && (
                <div className="px-4 pt-3 pb-0">
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-full px-2.5 py-1">
                    Contact: {[customer.firstName, customer.lastName].filter(Boolean).join(' ')}
                  </span>
                </div>
              )}

              <div className="relative group">
                <CustomerCard customer={customer} onEdit={openEdit} />
                <div className="absolute top-4 right-4 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => notesOpen === customer.id ? setNotesOpen(null) : openNotes(customer)}
                    title="Customer notes"
                    className={`p-1.5 rounded-lg transition-colors ${notesOpen === customer.id ? 'bg-amber-100 text-amber-600' : 'hover:bg-amber-50 text-gray-300 hover:text-amber-500'}`}
                  >
                    <StickyNote className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setConfirmDelete(customer.id)}
                    className="p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Inline notes panel */}
              {notesOpen === customer.id && (
                <div className="border-t border-amber-100 bg-amber-50/60 px-4 pb-4 pt-3">
                  <p className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-2">Notes</p>
                  <textarea
                    value={notesDraft}
                    onChange={(e) => setNotesDraft(e.target.value)}
                    autoFocus
                    rows={3}
                    placeholder="Customer preferences, follow-up reminders, observations..."
                    className="w-full border-2 border-amber-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400 resize-none bg-white"
                  />
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => saveNotes(customer)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-white bg-amber-500 rounded-lg hover:bg-amber-600 transition-colors"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Save Notes
                    </button>
                    <button
                      onClick={() => setNotesOpen(null)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <XIcon className="w-3.5 h-3.5" />
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Notes preview (collapsed) */}
              {notesOpen !== customer.id && customer.visitNotes && (
                <div
                  className="border-t border-gray-100 px-4 py-2.5 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => openNotes(customer)}
                >
                  <p className="text-xs text-gray-500 flex items-start gap-1.5">
                    <StickyNote className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-amber-400" />
                    <span className="truncate">{customer.visitNotes}</span>
                  </p>
                </div>
              )}

              {/* Visit history toggle */}
              <div className="border-t border-gray-100">
                <button
                  onClick={() => toggleVisits(customer.id)}
                  className="w-full flex items-center justify-between px-5 py-3 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <ChevronDown
                      className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${visitsOpen ? 'rotate-180' : ''}`}
                    />
                    Visit History
                  </span>
                  {customer.lastVisitDate && !visitsOpen && (
                    <span className="text-xs text-gray-400 font-normal">
                      Last visited{' '}
                      {new Date(customer.lastVisitDate).toLocaleDateString('en-US', {
                        month: 'short', day: 'numeric', year: 'numeric',
                      })}
                    </span>
                  )}
                </button>

                {visitsOpen && (
                  <VisitHistory
                    customer={customer}
                    onLastVisitChange={(date) => handleLastVisitChange(customer.id, date)}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {showModal && (
        <CustomerModal
          customer={editingCustomer}
          onSave={handleSave}
          onClose={() => setShowModal(false)}
        />
      )}

      {confirmDelete && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setConfirmDelete(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="font-bold text-gray-900">Delete Customer?</h3>
            </div>
            <p className="text-sm text-gray-600 mb-5">
              This will permanently delete this customer and all their visit history. This cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(confirmDelete)}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
