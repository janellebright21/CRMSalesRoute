import { useState, useMemo, useCallback } from 'react';
import { Customer } from '../types';
import { haversineDistance, geocodeAddress } from '../utils/geo';
import CustomerCard from '../components/CustomerCard';
import { MapPin, Loader2, AlertCircle } from 'lucide-react';

interface Props {
  customers: Customer[];
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
  onUpdateCustomer: (c: Customer) => void;
  onEditCustomer: (c: Customer) => void;
  onNavigate: (tab: string) => void;
}

const RADIUS_OPTIONS = [10, 25, 50, 75];

export default function FindNearby({ customers, selectedIds, onSelectionChange, onEditCustomer, onNavigate }: Props) {
  const cities = useMemo(() => {
    const set = new Set(customers.map((c) => c.city).filter(Boolean));
    return Array.from(set).sort();
  }, [customers]);

  const [city, setCity] = useState('');
  const [radius, setRadius] = useState(25);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState<{ customer: Customer; distance: number | null }[]>([]);
  const [searched, setSearched] = useState(false);

  async function handleSearch() {
    if (!city) return;
    setLoading(true);
    setError('');
    setSearched(true);

    const inCity = customers.filter((c) => c.city.toLowerCase() === city.toLowerCase());

    // Try to get a reference lat/lng from first customer in city that has coords, or geocode the city
    let refLat: number | null = null;
    let refLng: number | null = null;

    const withCoords = inCity.find((c) => c.lat && c.lng);
    if (withCoords) {
      refLat = withCoords.lat!;
      refLng = withCoords.lng!;
    } else {
      const geocoded = await geocodeAddress(`${city}`);
      if (geocoded) {
        refLat = geocoded.lat;
        refLng = geocoded.lng;
      }
    }

    if (refLat === null || refLng === null) {
      setError(`Could not determine coordinates for "${city}". Showing only customers in that city.`);
      setResults(inCity.map((c) => ({ customer: c, distance: null })));
      setLoading(false);
      return;
    }

    // Build results: all in-city customers (distance 0) + nearby from other cities
    const seen = new Set(inCity.map((c) => c.id));
    const nearby: { customer: Customer; distance: number }[] = [];

    for (const c of customers) {
      if (seen.has(c.id)) continue;
      // Need coords for this customer
      let lat = c.lat;
      let lng = c.lng;
      if (!lat || !lng) {
        // Try geocoding if we don't have coords
        const gc = await geocodeAddress(`${c.address}, ${c.city}, ${c.state} ${c.zip}`);
        if (gc) { lat = gc.lat; lng = gc.lng; }
      }
      if (!lat || !lng) continue;
      const dist = haversineDistance(refLat!, refLng!, lat, lng);
      if (dist <= radius) {
        nearby.push({ customer: c, distance: dist });
      }
    }

    nearby.sort((a, b) => a.distance - b.distance);

    setResults([
      ...inCity.map((c) => ({ customer: c, distance: 0 })),
      ...nearby,
    ]);
    setLoading(false);
  }

  const toggleSelect = useCallback((id: string, checked: boolean) => {
    const next = new Set(selectedIds);
    if (checked) next.add(id);
    else next.delete(id);
    onSelectionChange(next);
  }, [selectedIds, onSelectionChange]);

  function selectAll() {
    const next = new Set(selectedIds);
    results.forEach((r) => next.add(r.customer.id));
    onSelectionChange(next);
  }

  function clearAll() {
    const next = new Set(selectedIds);
    results.forEach((r) => next.delete(r.customer.id));
    onSelectionChange(next);
  }

  const selectedCount = results.filter((r) => selectedIds.has(r.customer.id)).length;
  const totalSelectedGlobal = selectedIds.size;

  return (
    <div className="space-y-5">
      {/* Search controls */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Find Nearby Customers</h2>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Select a City</label>
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500"
            >
              <option value="">-- Choose a city --</option>
              {cities.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Search Radius</label>
            <select
              value={radius}
              onChange={(e) => setRadius(Number(e.target.value))}
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500"
            >
              {RADIUS_OPTIONS.map((r) => (
                <option key={r} value={r}>{r} miles</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={handleSearch}
              disabled={!city || loading}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors whitespace-nowrap"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
              {loading ? 'Searching...' : 'Find Customers'}
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-4 flex items-start gap-2 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl px-4 py-3 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            {error}
          </div>
        )}
      </div>

      {/* Results */}
      {searched && !loading && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="font-bold text-gray-900">
                {results.length === 0 ? 'No customers found' : `${results.length} customer${results.length !== 1 ? 's' : ''} found`}
              </p>
              {totalSelectedGlobal > 0 && (
                <p className="text-sm text-blue-600 font-medium">{totalSelectedGlobal} selected for route</p>
              )}
            </div>
            {results.length > 0 && (
              <div className="flex items-center gap-3">
                <button onClick={selectAll} className="text-sm text-blue-600 hover:text-blue-800 font-semibold">Select All</button>
                <button onClick={clearAll} className="text-sm text-gray-500 hover:text-gray-700 font-semibold">Clear</button>
                {totalSelectedGlobal > 0 && (
                  <button
                    onClick={() => onNavigate('route')}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-colors"
                  >
                    Build Route ({totalSelectedGlobal})
                  </button>
                )}
              </div>
            )}
          </div>
          <div className="p-4 space-y-3 max-h-[60vh] overflow-y-auto">
            {results.map(({ customer, distance }) => (
              <CustomerCard
                key={customer.id}
                customer={customer}
                selected={selectedIds.has(customer.id)}
                onSelect={toggleSelect}
                onEdit={onEditCustomer}
                showCheckbox
                distanceMiles={distance !== null && distance > 0 ? distance : undefined}
              />
            ))}
          </div>
        </div>
      )}

      {customers.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <MapPin className="w-10 h-10 mx-auto mb-3 text-gray-200" />
          <p>No customers imported yet.</p>
        </div>
      )}
    </div>
  );
}
