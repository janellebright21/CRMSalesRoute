import { useState, useMemo, useCallback } from 'react';
import { Customer } from '../types';
import { Search, StickyNote, ChevronDown } from 'lucide-react';
import PriorityBadge from '../components/PriorityBadge';
import VisitHistory from '../components/VisitHistory';

interface Props {
  customers: Customer[];
  onUpdateCustomer: (c: Customer) => void;
}

export default function VisitNotes({ customers, onUpdateCustomer }: Props) {
  const [search, setSearch] = useState('');
  const [expandedVisits, setExpandedVisits] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.company?.toLowerCase().includes(q) ||
        c.city.toLowerCase().includes(q)
    );
  }, [customers, search]);

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

  if (customers.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <StickyNote className="w-10 h-10 mx-auto mb-3 text-gray-200" />
        <p>No customers yet. Import customers to start adding visit notes.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Visit Notes</h2>
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search customers..."
            className="w-full border-2 border-gray-200 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      <div className="space-y-3">
        {filtered.map((customer) => {
          const open = expandedVisits.has(customer.id);
          return (
            <div
              key={customer.id}
              className="bg-white rounded-2xl border border-gray-200 overflow-hidden"
            >
              {/* Customer header */}
              <div className="px-5 py-4 flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-gray-900">{customer.name}</span>
                    {customer.company && (
                      <span className="text-sm text-gray-500">— {customer.company}</span>
                    )}
                    <PriorityBadge priority={customer.priority} />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {customer.city}, {customer.state}
                  </p>
                  {customer.visitNotes && (
                    <p className="text-sm text-gray-600 mt-2 line-clamp-2">{customer.visitNotes}</p>
                  )}
                </div>
              </div>

              {/* Visit history toggle */}
              <div className="border-t border-gray-100">
                <button
                  onClick={() => toggleVisits(customer.id)}
                  className="w-full flex items-center justify-between px-5 py-3 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <ChevronDown
                      className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
                    />
                    Visit History
                  </span>
                  {customer.lastVisitDate && !open && (
                    <span className="text-xs text-gray-400 font-normal">
                      Last visited{' '}
                      {new Date(customer.lastVisitDate).toLocaleDateString('en-US', {
                        month: 'short', day: 'numeric', year: 'numeric',
                      })}
                    </span>
                  )}
                </button>

                {open && (
                  <VisitHistory
                    customer={customer}
                    onLastVisitChange={(date) => handleLastVisitChange(customer.id, date)}
                  />
                )}
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <p>No customers match your search.</p>
          </div>
        )}
      </div>
    </div>
  );
}
