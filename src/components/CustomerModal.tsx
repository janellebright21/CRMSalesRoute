import { useState, useEffect } from 'react';
import { Customer, Priority, FollowUpStatus } from '../types';
import { todayISO } from '../utils/dates';
import { X } from 'lucide-react';

interface Props {
  customer: Customer | null;
  onSave: (customer: Customer) => void;
  onClose: () => void;
}

function blank(): Customer {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    name: '',
    firstName: '',
    lastName: '',
    company: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    phone: '',
    email: '',
    priority: 'medium',
    visitNotes: '',
    followUpStatus: 'pending',
    createdAt: now,
    updatedAt: now,
  };
}

export default function CustomerModal({ customer, onSave, onClose }: Props) {
  const [form, setForm] = useState<Customer>(customer ?? blank());

  useEffect(() => {
    setForm(customer ?? blank());
  }, [customer]);

  function set<K extends keyof Customer>(key: K, val: Customer[K]) {
    setForm((f) => ({ ...f, [key]: val, updatedAt: new Date().toISOString() }));
  }

  function handleFirstLastChange(first: string, last: string) {
    const fullName = [first, last].filter(Boolean).join(' ');
    setForm((f) => ({
      ...f,
      firstName: first,
      lastName: last,
      name: fullName || f.name,
      updatedAt: new Date().toISOString(),
    }));
  }

  function handleSave() {
    const finalName = form.name.trim() || [form.firstName, form.lastName].filter(Boolean).join(' ');
    if (!finalName) return;
    onSave({ ...form, name: finalName });
  }

  const canSave = !!(form.name.trim() || form.firstName?.trim() || form.lastName?.trim());

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <h2 className="text-xl font-bold text-gray-900">{customer ? 'Edit Customer' : 'Add Customer'}</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <div className="p-6 space-y-6">
          {/* Contact name */}
          <section>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Contact Name</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field
                label="First Name"
                value={form.firstName ?? ''}
                onChange={(v) => handleFirstLastChange(v, form.lastName ?? '')}
                placeholder="John"
              />
              <Field
                label="Last Name"
                value={form.lastName ?? ''}
                onChange={(v) => handleFirstLastChange(form.firstName ?? '', v)}
                placeholder="Smith"
              />
            </div>
          </section>

          {/* Business */}
          <section>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Business</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Display Name *" value={form.name} onChange={(v) => set('name', v)} placeholder="Auto-filled from first + last" />
              <Field label="Company" value={form.company ?? ''} onChange={(v) => set('company', v)} placeholder="Acme Corp" />
            </div>
          </section>

          {/* Address */}
          <section>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Address</p>
            <Field label="Street Address" value={form.address} onChange={(v) => set('address', v)} placeholder="123 Main St" />
            <div className="grid grid-cols-3 gap-4 mt-4">
              <div className="col-span-1">
                <Field label="City" value={form.city} onChange={(v) => set('city', v)} placeholder="Springfield" />
              </div>
              <div>
                <Field label="State" value={form.state} onChange={(v) => set('state', v)} placeholder="IL" />
              </div>
              <div>
                <Field label="ZIP" value={form.zip} onChange={(v) => set('zip', v)} placeholder="62701" />
              </div>
            </div>
          </section>

          {/* Contact info */}
          <section>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Contact Info</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Phone" value={form.phone ?? ''} onChange={(v) => set('phone', v)} placeholder="555-123-4567" />
              <Field label="Email" value={form.email ?? ''} onChange={(v) => set('email', v)} placeholder="john@example.com" />
            </div>
          </section>

          {/* Visit & follow-up */}
          <section>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Visit & Follow-Up</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Priority</label>
                <select
                  value={form.priority}
                  onChange={(e) => set('priority', e.target.value as Priority)}
                  className="w-full border-2 border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500"
                >
                  <option value="high">High Priority</option>
                  <option value="medium">Medium Priority</option>
                  <option value="low">Low Priority</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Last Visit Date</label>
                <input
                  type="date"
                  value={form.lastVisitDate ?? ''}
                  max={todayISO()}
                  onChange={(e) => set('lastVisitDate', e.target.value || undefined)}
                  className="w-full border-2 border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Follow-Up Date</label>
                <input
                  type="date"
                  value={form.followUpDate ?? ''}
                  onChange={(e) => set('followUpDate', e.target.value || undefined)}
                  className="w-full border-2 border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Follow-Up Status</label>
                <select
                  value={form.followUpStatus ?? 'pending'}
                  onChange={(e) => set('followUpStatus', e.target.value as FollowUpStatus)}
                  className="w-full border-2 border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500"
                >
                  <option value="pending">Pending</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>
          </section>

          {/* Notes */}
          <section>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Notes</p>
            <textarea
              value={form.visitNotes ?? ''}
              onChange={(e) => set('visitNotes', e.target.value)}
              rows={4}
              placeholder="Notes from last visit, customer preferences, follow-up reminders, etc."
              className="w-full border-2 border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500 resize-none"
            />
          </section>
        </div>
        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex gap-3 justify-end rounded-b-2xl">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Save Customer
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1.5">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border-2 border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500"
      />
    </div>
  );
}
