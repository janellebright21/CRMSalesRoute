import { Customer } from '../types';
import PriorityBadge from './PriorityBadge';
import { formatDate, daysSince } from '../utils/dates';
import { MapPin, Phone, Mail, Calendar, Star } from 'lucide-react';

interface Props {
  customer: Customer;
  selected?: boolean;
  onSelect?: (id: string, checked: boolean) => void;
  onEdit?: (customer: Customer) => void;
  showCheckbox?: boolean;
  distanceMiles?: number;
}

export default function CustomerCard({ customer, selected, onSelect, onEdit, showCheckbox, distanceMiles }: Props) {
  const since = daysSince(customer.lastVisitDate);
  const overdue = since !== null && since > 30;

  return (
    <div className={`bg-white rounded-xl border-2 transition-all ${selected ? 'border-blue-500 shadow-md' : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'}`}>
      <div className="p-4">
        <div className="flex items-start gap-3">
          {showCheckbox && (
            <input
              type="checkbox"
              checked={!!selected}
              onChange={(e) => onSelect?.(customer.id, e.target.checked)}
              className="mt-1 w-5 h-5 accent-blue-600 cursor-pointer flex-shrink-0"
            />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-gray-900 text-base leading-tight">{customer.name}</h3>
              {customer.priority === 'high' && <Star className="w-4 h-4 text-red-500 fill-red-500" />}
              <PriorityBadge priority={customer.priority} />
              {distanceMiles !== undefined && (
                <span className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full font-medium">
                  {distanceMiles.toFixed(1)} mi
                </span>
              )}
            </div>
            {customer.company && (
              <p className="text-sm text-gray-500 mt-0.5">{customer.company}</p>
            )}
            <div className="mt-2 space-y-1">
              <div className="flex items-start gap-1.5 text-sm text-gray-600">
                <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-gray-400" />
                <span>{customer.address}, {customer.city}, {customer.state} {customer.zip}</span>
              </div>
              {customer.phone && (
                <div className="flex items-center gap-1.5 text-sm text-gray-600">
                  <Phone className="w-3.5 h-3.5 flex-shrink-0 text-gray-400" />
                  <a href={`tel:${customer.phone}`} className="hover:text-blue-600">{customer.phone}</a>
                </div>
              )}
              {customer.email && (
                <div className="flex items-center gap-1.5 text-sm text-gray-600">
                  <Mail className="w-3.5 h-3.5 flex-shrink-0 text-gray-400" />
                  <a href={`mailto:${customer.email}`} className="hover:text-blue-600 truncate">{customer.email}</a>
                </div>
              )}
            </div>
            <div className="mt-2 flex items-center gap-3 flex-wrap text-xs">
              {customer.lastVisitDate ? (
                <span className={`flex items-center gap-1 ${overdue ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
                  <Calendar className="w-3.5 h-3.5" />
                  Last visit: {formatDate(customer.lastVisitDate)}
                  {since !== null && ` (${since}d ago)`}
                  {overdue && ' — Overdue!'}
                </span>
              ) : (
                <span className="text-gray-400 italic">No visit recorded</span>
              )}
            </div>
          </div>
          {onEdit && (
            <button
              onClick={() => onEdit(customer)}
              className="flex-shrink-0 text-sm text-blue-600 hover:text-blue-800 font-medium px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
            >
              Edit
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
