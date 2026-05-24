import { Customer } from '../types';
import { daysSince, daysUntil, formatDate } from '../utils/dates';
import { Star, Clock, Calendar, MapPin, Users, AlertTriangle, TrendingUp } from 'lucide-react';
import PriorityBadge from '../components/PriorityBadge';

interface Props {
  customers: Customer[];
  onEditCustomer: (c: Customer) => void;
  onNavigate: (tab: string) => void;
}

export default function Dashboard({ customers, onEditCustomer, onNavigate }: Props) {
  const highPriority = customers.filter((c) => c.priority === 'high');
  const overdue = customers.filter((c) => {
    const d = daysSince(c.lastVisitDate);
    return d === null || d > 30;
  });
  const upcoming = customers
    .filter((c) => {
      const d = daysUntil(c.followUpDate);
      return d !== null && d >= 0 && d <= 14 && c.followUpStatus !== 'completed';
    })
    .sort((a, b) => (a.followUpDate ?? '').localeCompare(b.followUpDate ?? ''));

  const cityCounts = customers.reduce<Record<string, number>>((acc, c) => {
    const key = c.city || 'Unknown';
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
  const topCities = Object.entries(cityCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  return (
    <div className="space-y-6">
      {customers.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border-2 border-dashed border-gray-200">
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">No customers yet</h3>
          <p className="text-gray-500 mb-4">Import your customer list to get started.</p>
          <button
            onClick={() => onNavigate('import')}
            className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors"
          >
            Import Customers
          </button>
        </div>
      ) : (
        <>
          {/* Stats row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={<Users className="w-6 h-6 text-blue-600" />} label="Total Customers" value={customers.length} bg="bg-blue-50" />
            <StatCard icon={<Star className="w-6 h-6 text-red-500" />} label="High Priority" value={highPriority.length} bg="bg-red-50" />
            <StatCard icon={<AlertTriangle className="w-6 h-6 text-amber-500" />} label="Overdue Visits" value={overdue.length} bg="bg-amber-50" />
            <StatCard icon={<Calendar className="w-6 h-6 text-emerald-600" />} label="Upcoming Follow-Ups" value={upcoming.length} bg="bg-emerald-50" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* High Priority */}
            <Section
              title="High Priority Customers"
              icon={<Star className="w-5 h-5 text-red-500" />}
              empty={highPriority.length === 0 ? 'No high priority customers.' : ''}
              action={{ label: 'View All', onClick: () => onNavigate('customers') }}
            >
              <div className="space-y-2">
                {highPriority.slice(0, 5).map((c) => (
                  <CustomerRow key={c.id} customer={c} onClick={() => onEditCustomer(c)} />
                ))}
                {highPriority.length > 5 && (
                  <p className="text-xs text-center text-gray-400 pt-1">+{highPriority.length - 5} more</p>
                )}
              </div>
            </Section>

            {/* Overdue Visits */}
            <Section
              title="Overdue Visits (30+ days)"
              icon={<Clock className="w-5 h-5 text-amber-500" />}
              empty={overdue.length === 0 ? 'All visits are up to date!' : ''}
              action={{ label: 'View All', onClick: () => onNavigate('customers') }}
            >
              <div className="space-y-2">
                {overdue.slice(0, 5).map((c) => {
                  const d = daysSince(c.lastVisitDate);
                  return (
                    <CustomerRow
                      key={c.id}
                      customer={c}
                      onClick={() => onEditCustomer(c)}
                      meta={d === null ? 'Never visited' : `${d} days ago`}
                    />
                  );
                })}
                {overdue.length > 5 && (
                  <p className="text-xs text-center text-gray-400 pt-1">+{overdue.length - 5} more</p>
                )}
              </div>
            </Section>

            {/* Upcoming Follow-Ups */}
            <Section
              title="Upcoming Follow-Ups (next 14 days)"
              icon={<Calendar className="w-5 h-5 text-emerald-600" />}
              empty={upcoming.length === 0 ? 'No upcoming follow-ups.' : ''}
              action={{ label: 'View All', onClick: () => onNavigate('followups') }}
            >
              <div className="space-y-2">
                {upcoming.slice(0, 5).map((c) => (
                  <CustomerRow
                    key={c.id}
                    customer={c}
                    onClick={() => onEditCustomer(c)}
                    meta={`Follow up: ${formatDate(c.followUpDate)}`}
                  />
                ))}
              </div>
            </Section>

            {/* Customers by City */}
            <Section
              title="Customers by City"
              icon={<MapPin className="w-5 h-5 text-blue-500" />}
              empty={topCities.length === 0 ? 'No data.' : ''}
            >
              <div className="space-y-2">
                {topCities.map(([city, count]) => (
                  <div key={city} className="flex items-center gap-3">
                    <span className="flex-1 text-sm text-gray-700 font-medium">{city}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-blue-500 h-2 rounded-full"
                        style={{ width: `${(count / customers.length) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-semibold text-gray-600 w-8 text-right">{count}</span>
                  </div>
                ))}
              </div>
            </Section>
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, bg }: { icon: React.ReactNode; label: string; value: number; bg: string }) {
  return (
    <div className={`${bg} rounded-2xl p-5 flex items-center gap-4`}>
      <div className="flex-shrink-0">{icon}</div>
      <div>
        <div className="text-2xl font-extrabold text-gray-900">{value}</div>
        <div className="text-xs font-medium text-gray-600 leading-tight">{label}</div>
      </div>
    </div>
  );
}

function Section({
  title,
  icon,
  children,
  empty,
  action,
}: {
  title: string;
  icon: React.ReactNode;
  children?: React.ReactNode;
  empty?: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="font-bold text-gray-900 text-sm">{title}</h3>
        </div>
        {action && (
          <button
            onClick={action.onClick}
            className="text-xs text-blue-600 hover:text-blue-800 font-semibold"
          >
            {action.label}
          </button>
        )}
      </div>
      <div className="p-5">
        {empty ? (
          <p className="text-sm text-gray-400 italic text-center py-2">{empty}</p>
        ) : (
          children
        )}
      </div>
    </div>
  );
}

function CustomerRow({ customer, onClick, meta }: { customer: Customer; onClick: () => void; meta?: string }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors text-left group"
    >
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-gray-900 truncate">{customer.name}</div>
        <div className="text-xs text-gray-500 truncate">
          {meta ?? `${customer.city}, ${customer.state}`}
        </div>
      </div>
      <PriorityBadge priority={customer.priority} />
    </button>
  );
}
