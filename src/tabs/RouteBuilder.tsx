import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Customer, AppSettings, SavedRoute } from '../types';
import { buildGoogleMapsUrl } from '../utils/geo';
import { formatDate, todayISO } from '../utils/dates';
import { loadSettings, saveSettings, fetchRoutes, upsertRoute, deleteRoute } from '../storage';
import { useAuth } from '../AuthContext';
import {
  MapPin, ExternalLink, Printer, GripVertical, X, Home,
  Pencil, Check, Save, FolderOpen, Trash2, Plus, Loader2,
  AlertCircle, Route, ChevronDown, ChevronUp,
} from 'lucide-react';
import PriorityBadge from '../components/PriorityBadge';

interface Props {
  customers: Customer[];
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
  onNavigate: (tab: string) => void;
}

// ── Print helper ─────────────────────────────────────────────────────────────

function printRoute(
  routeName: string,
  routeDate: string,
  startAddress: string,
  stops: Customer[]
) {
  const rows = stops
    .map(
      (c, i) => `
      <div class="stop">
        <div class="stop-header">
          <div class="stop-num">${i + 1}</div>
          <div class="stop-title">
            <strong>${c.name}</strong>${c.company ? ` — ${c.company}` : ''}
          </div>
        </div>
        <div class="stop-detail">
          <div class="detail-row"><span class="label">Address:</span> ${[c.address, c.city, c.state, c.zip].filter(Boolean).join(', ')}</div>
          ${c.phone ? `<div class="detail-row"><span class="label">Phone:</span> ${c.phone}</div>` : ''}
          ${c.email ? `<div class="detail-row"><span class="label">Email:</span> ${c.email}</div>` : ''}
          ${c.visitNotes ? `<div class="detail-row notes"><span class="label">Notes:</span> ${c.visitNotes}</div>` : ''}
          ${c.lastVisitDate ? `<div class="detail-row"><span class="label">Last Visit:</span> ${formatDate(c.lastVisitDate)}</div>` : ''}
        </div>
      </div>`
    )
    .join('');

  const startRow = startAddress
    ? `<div class="stop start-stop">
        <div class="stop-header">
          <div class="stop-num start-badge">S</div>
          <div class="stop-title"><strong>Start:</strong> ${startAddress}</div>
        </div>
      </div>`
    : '';

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${routeName || 'Route'} — ${routeDate ? formatDate(routeDate) : ''}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 13px; color: #1a1a1a; padding: 20px; background: white; }
    .page-header { border-bottom: 3px solid #1d4ed8; padding-bottom: 12px; margin-bottom: 20px; }
    .page-header h1 { font-size: 22px; font-weight: 800; color: #1d4ed8; }
    .page-header .meta { font-size: 12px; color: #6b7280; margin-top: 4px; }
    .stop { border: 1px solid #e5e7eb; border-radius: 8px; margin-bottom: 12px; overflow: hidden; page-break-inside: avoid; }
    .stop-header { display: flex; align-items: center; gap: 12px; background: #f8fafc; padding: 10px 14px; border-bottom: 1px solid #e5e7eb; }
    .stop-num { width: 28px; height: 28px; border-radius: 50%; background: #1d4ed8; color: white; font-weight: 700; font-size: 13px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .start-stop .stop-header { background: #f0fdf4; border-bottom-color: #bbf7d0; }
    .start-badge { background: #16a34a !important; }
    .stop-title { font-size: 14px; font-weight: 600; }
    .stop-detail { padding: 10px 14px; display: flex; flex-direction: column; gap: 5px; }
    .detail-row { font-size: 12px; color: #374151; line-height: 1.4; }
    .detail-row.notes { color: #6b7280; font-style: italic; margin-top: 3px; }
    .label { font-weight: 600; color: #111; margin-right: 4px; }
    .footer { margin-top: 24px; padding-top: 12px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #9ca3af; text-align: center; }
    @media print {
      body { padding: 10px; }
      @page { margin: 0.6in; size: letter; }
    }
  </style>
</head>
<body>
  <div class="page-header">
    <h1>${routeName || 'Route Sheet'}</h1>
    <div class="meta">
      ${routeDate ? `Date: ${formatDate(routeDate)}` : ''}
      &nbsp;•&nbsp; ${stops.length} stop${stops.length !== 1 ? 's' : ''}
      ${startAddress ? `&nbsp;•&nbsp; Starting from: ${startAddress}` : ''}
    </div>
  </div>
  ${startRow}
  ${rows}
  <div class="footer">Printed from Route Planner</div>
  <script>window.onload = function() { window.print(); }</script>
</body>
</html>`;

  const win = window.open('', '_blank');
  if (win) { win.document.write(html); win.document.close(); }
}

// ── Main component ────────────────────────────────────────────────────────────

export default function RouteBuilder({ customers, selectedIds, onSelectionChange, onNavigate }: Props) {
  const { user } = useAuth();

  const selected = useMemo(
    () => customers.filter((c) => selectedIds.has(c.id)),
    [customers, selectedIds]
  );

  const [order, setOrder] = useState<string[]>(() => selected.map((c) => c.id));
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);

  // Settings / home base
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());
  const [editingHomeBase, setEditingHomeBase] = useState(false);
  const [homeBaseDraft, setHomeBaseDraft] = useState(settings.homeBase);

  // Route metadata
  const [routeName, setRouteName] = useState('');
  const [routeDate, setRouteDate] = useState(todayISO());
  const [startAddress, setStartAddress] = useState(settings.homeBase);

  // Saved routes
  const [savedRoutes, setSavedRoutes] = useState<SavedRoute[]>([]);
  const [routesLoading, setRoutesLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [savedRoutesPanelOpen, setSavedRoutesPanelOpen] = useState(false);
  const [confirmDeleteRoute, setConfirmDeleteRoute] = useState<string | null>(null);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState('');

  useEffect(() => {
    if (!editingHomeBase) setHomeBaseDraft(settings.homeBase);
  }, [settings.homeBase, editingHomeBase]);

  // Load saved routes on mount
  useEffect(() => {
    if (!user) return;
    setRoutesLoading(true);
    fetchRoutes()
      .then(setSavedRoutes)
      .catch(console.error)
      .finally(() => setRoutesLoading(false));
  }, [user]);

  // Keep order in sync with selection
  const orderedSelected = useMemo(() => {
    const ids = [...order.filter((id) => selectedIds.has(id))];
    selected.forEach((c) => { if (!ids.includes(c.id)) ids.push(c.id); });
    return ids.map((id) => customers.find((c) => c.id === id)).filter(Boolean) as Customer[];
  }, [order, selected, selectedIds, customers]);

  function saveHomeBase() {
    const updated = { ...settings, homeBase: homeBaseDraft.trim() };
    setSettings(updated);
    saveSettings(updated);
    setStartAddress(homeBaseDraft.trim());
    setEditingHomeBase(false);
  }

  function removeCustomer(id: string) {
    const next = new Set(selectedIds);
    next.delete(id);
    onSelectionChange(next);
    setOrder((o) => o.filter((i) => i !== id));
  }

  function handleDrop(toIdx: number) {
    if (dragIdx === null || dragIdx === toIdx) return;
    const ids = orderedSelected.map((c) => c.id);
    const [moved] = ids.splice(dragIdx, 1);
    ids.splice(toIdx, 0, moved);
    setOrder(ids);
    setDragIdx(null);
    setOverIdx(null);
  }

  const addresses = useMemo(() => {
    const addrs: string[] = [];
    if (startAddress.trim()) addrs.push(startAddress.trim());
    orderedSelected.forEach((c) => {
      const a = [c.address, c.city, c.state, c.zip].filter(Boolean).join(', ');
      if (a) addrs.push(a);
    });
    return addrs;
  }, [orderedSelected, startAddress]);

  const mapsUrl = buildGoogleMapsUrl(addresses);

  // ── Save route ──────────────────────────────────────────────────────────────

  async function handleSaveRoute() {
    if (!user || orderedSelected.length === 0) return;
    setSaveLoading(true);
    setSaveError('');
    setSaveSuccess('');
    try {
      const route: SavedRoute = {
        id:           crypto.randomUUID(),
        userId:       user.id,
        routeName:    routeName.trim() || `Route ${new Date().toLocaleDateString()}`,
        routeDate:    routeDate,
        startAddress: startAddress.trim(),
        stops:        orderedSelected.map((c, i) => ({ customerId: c.id, order: i })),
        createdAt:    new Date().toISOString(),
      };
      const saved = await upsertRoute(route, user.id);
      setSavedRoutes((prev) => [saved, ...prev]);
      setSaveSuccess(`Route "${saved.routeName}" saved.`);
      setTimeout(() => setSaveSuccess(''), 3000);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Failed to save route');
    } finally {
      setSaveLoading(false);
    }
  }

  // ── Load route ──────────────────────────────────────────────────────────────

  function handleLoadRoute(route: SavedRoute) {
    const ids = route.stops
      .sort((a, b) => a.order - b.order)
      .map((s) => s.customerId)
      .filter((id) => customers.some((c) => c.id === id));

    setOrder(ids);
    onSelectionChange(new Set(ids));
    setRouteName(route.routeName);
    setRouteDate(route.routeDate.slice(0, 10));
    setStartAddress(route.startAddress);
    setSavedRoutesPanelOpen(false);
  }

  // ── Delete route ────────────────────────────────────────────────────────────

  async function handleDeleteRoute(id: string) {
    try {
      await deleteRoute(id);
      setSavedRoutes((prev) => prev.filter((r) => r.id !== id));
      setConfirmDeleteRoute(null);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Failed to delete route');
    }
  }

  // ── Empty state ─────────────────────────────────────────────────────────────

  if (selected.length === 0) {
    return (
      <div className="space-y-5">
        <HomeBaseCard
          settings={settings}
          editing={editingHomeBase}
          draft={homeBaseDraft}
          onDraftChange={setHomeBaseDraft}
          onEdit={() => { setHomeBaseDraft(settings.homeBase); setEditingHomeBase(true); }}
          onSave={saveHomeBase}
          onCancel={() => { setHomeBaseDraft(settings.homeBase); setEditingHomeBase(false); }}
        />

        <SavedRoutesPanel
          routes={savedRoutes}
          loading={routesLoading}
          open={savedRoutesPanelOpen}
          onToggle={() => setSavedRoutesPanelOpen((v) => !v)}
          onLoad={handleLoadRoute}
          onDelete={(id) => setConfirmDeleteRoute(id)}
        />

        <div className="text-center py-16 bg-white rounded-2xl border-2 border-dashed border-gray-200">
          <Route className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">No customers selected</h3>
          <p className="text-gray-500 mb-4">
            Select customers from "Find Nearby Customers" or "Customer List" to build a route.
          </p>
          <button
            onClick={() => onNavigate('nearby')}
            className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors"
          >
            Find Nearby Customers
          </button>
        </div>

        {confirmDeleteRoute && (
          <DeleteRouteDialog
            onConfirm={() => handleDeleteRoute(confirmDeleteRoute)}
            onCancel={() => setConfirmDeleteRoute(null)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Home Base */}
      <HomeBaseCard
        settings={settings}
        editing={editingHomeBase}
        draft={homeBaseDraft}
        onDraftChange={setHomeBaseDraft}
        onEdit={() => { setHomeBaseDraft(settings.homeBase); setEditingHomeBase(true); }}
        onSave={saveHomeBase}
        onCancel={() => { setHomeBaseDraft(settings.homeBase); setEditingHomeBase(false); }}
      />

      {/* Saved routes panel */}
      <SavedRoutesPanel
        routes={savedRoutes}
        loading={routesLoading}
        open={savedRoutesPanelOpen}
        onToggle={() => setSavedRoutesPanelOpen((v) => !v)}
        onLoad={handleLoadRoute}
        onDelete={(id) => setConfirmDeleteRoute(id)}
      />

      {/* Route metadata */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
        <h2 className="text-xl font-bold text-gray-900">Route Builder</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Route Name</label>
            <input
              type="text"
              value={routeName}
              onChange={(e) => setRouteName(e.target.value)}
              placeholder={`Route ${new Date().toLocaleDateString()}`}
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Route Date</label>
            <input
              type="date"
              value={routeDate}
              onChange={(e) => setRouteDate(e.target.value)}
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            Starting Address
            <span className="font-normal text-gray-400 ml-1">(defaults to your home base)</span>
          </label>
          <input
            type="text"
            value={startAddress}
            onChange={(e) => setStartAddress(e.target.value)}
            placeholder="e.g. 123 Office Park Dr, Chicago, IL 60601"
            className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Route stop list */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-gray-900">
              Route Stops — {orderedSelected.length} stop{orderedSelected.length !== 1 ? 's' : ''}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">Drag rows or use arrows to reorder</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleSaveRoute}
              disabled={saveLoading}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 disabled:opacity-50 transition-colors"
            >
              {saveLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Route
            </button>
            <button
              onClick={() => printRoute(
                routeName || `Route ${new Date().toLocaleDateString()}`,
                routeDate,
                startAddress,
                orderedSelected
              )}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
            >
              <Printer className="w-4 h-4" />
              Print Route
            </button>
            {mapsUrl && (
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                Open in Google Maps
              </a>
            )}
          </div>
        </div>

        {/* Feedback banners */}
        {saveSuccess && (
          <div className="mx-6 mt-4 flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3">
            <Check className="w-4 h-4 flex-shrink-0" />
            {saveSuccess}
          </div>
        )}
        {saveError && (
          <div className="mx-6 mt-4 flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {saveError}
          </div>
        )}

        <div className="divide-y divide-gray-100">
          {startAddress.trim() && (
            <div className="px-6 py-3 flex items-center gap-3 bg-emerald-50">
              <div className="w-7 h-7 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                S
              </div>
              <p className="text-sm font-semibold text-emerald-800">Start: {startAddress}</p>
            </div>
          )}

          {orderedSelected.map((customer, idx) => (
            <div
              key={customer.id}
              draggable
              onDragStart={() => setDragIdx(idx)}
              onDragOver={(e) => { e.preventDefault(); setOverIdx(idx); }}
              onDrop={() => handleDrop(idx)}
              onDragEnd={() => { setDragIdx(null); setOverIdx(null); }}
              className={`px-6 py-4 flex items-center gap-4 cursor-grab active:cursor-grabbing transition-colors ${
                overIdx === idx ? 'bg-blue-50 border-l-4 border-blue-400' : 'hover:bg-gray-50'
              } ${dragIdx === idx ? 'opacity-50' : ''}`}
            >
              <GripVertical className="w-4 h-4 text-gray-300 flex-shrink-0" />
              <div className="w-7 h-7 rounded-full bg-blue-600 text-white text-sm font-bold flex items-center justify-center flex-shrink-0">
                {idx + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-gray-900 text-sm">{customer.name}</span>
                  {customer.company && <span className="text-xs text-gray-500">— {customer.company}</span>}
                  <PriorityBadge priority={customer.priority} />
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  {[customer.address, customer.city, customer.state, customer.zip].filter(Boolean).join(', ')}
                </p>
                {customer.phone && <p className="text-xs text-gray-400 mt-0.5">{customer.phone}</p>}
                {customer.visitNotes && (
                  <p className="text-xs text-amber-600 mt-0.5 truncate max-w-xs">{customer.visitNotes}</p>
                )}
                {customer.lastVisitDate && (
                  <p className="text-xs text-gray-400 mt-0.5">Last visit: {formatDate(customer.lastVisitDate)}</p>
                )}
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => {
                    const ids = orderedSelected.map((c) => c.id);
                    [ids[idx - 1], ids[idx]] = [ids[idx], ids[idx - 1]];
                    setOrder(ids);
                  }}
                  disabled={idx === 0}
                  className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30 text-gray-400"
                  title="Move up"
                >
                  <ChevronUp className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => {
                    const ids = orderedSelected.map((c) => c.id);
                    [ids[idx], ids[idx + 1]] = [ids[idx + 1], ids[idx]];
                    setOrder(ids);
                  }}
                  disabled={idx === orderedSelected.length - 1}
                  className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30 text-gray-400"
                  title="Move down"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => removeCustomer(customer.id)}
                  className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors ml-1"
                  title="Remove from route"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Maps link copy bar */}
        {mapsUrl && (
          <div className="px-6 py-4 border-t border-gray-100 bg-gray-50">
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              Google Maps Link — copy &amp; share or open on mobile
            </label>
            <div className="flex gap-2">
              <input
                readOnly
                value={mapsUrl}
                className="flex-1 text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-600 min-w-0"
              />
              <button
                onClick={() => navigator.clipboard.writeText(mapsUrl)}
                className="px-3 py-2 text-xs font-semibold bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors whitespace-nowrap"
              >
                Copy
              </button>
            </div>
          </div>
        )}
      </div>

      {confirmDeleteRoute && (
        <DeleteRouteDialog
          onConfirm={() => handleDeleteRoute(confirmDeleteRoute)}
          onCancel={() => setConfirmDeleteRoute(null)}
        />
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

interface HomeBaseCardProps {
  settings: AppSettings;
  editing: boolean;
  draft: string;
  onDraftChange: (v: string) => void;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
}

function HomeBaseCard({ settings, editing, draft, onDraftChange, onEdit, onSave, onCancel }: HomeBaseCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
          <Home className="w-5 h-5 text-emerald-700" />
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-gray-900">Home Base</h3>
          <p className="text-xs text-gray-500">Your default starting point for all routes</p>
        </div>
        {!editing && (
          <button
            onClick={onEdit}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" />
            {settings.homeBase ? 'Edit' : 'Set Home Base'}
          </button>
        )}
      </div>

      {editing ? (
        <div className="space-y-3">
          <input
            type="text"
            value={draft}
            onChange={(e) => onDraftChange(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') onSave(); if (e.key === 'Escape') onCancel(); }}
            autoFocus
            placeholder="e.g. 123 Main St, Chicago, IL 60601"
            className="w-full border-2 border-emerald-400 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500"
          />
          <div className="flex gap-2">
            <button
              onClick={onSave}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 transition-colors"
            >
              <Check className="w-4 h-4" />
              Save
            </button>
            <button onClick={onCancel} className="px-4 py-2 text-sm font-semibold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className={`rounded-xl px-4 py-3 text-sm ${settings.homeBase ? 'bg-emerald-50 border border-emerald-200 text-emerald-900 font-medium' : 'bg-gray-50 border border-dashed border-gray-300 text-gray-400 italic'}`}>
          {settings.homeBase || 'No home base set — click "Set Home Base" to add one'}
        </div>
      )}
    </div>
  );
}

interface SavedRoutesPanelProps {
  routes: SavedRoute[];
  loading: boolean;
  open: boolean;
  onToggle: () => void;
  onLoad: (r: SavedRoute) => void;
  onDelete: (id: string) => void;
}

function SavedRoutesPanel({ routes, loading, open, onToggle, onLoad, onDelete }: SavedRoutesPanelProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <FolderOpen className="w-5 h-5 text-blue-600" />
          <span className="font-bold text-gray-900">Saved Routes</span>
          {routes.length > 0 && (
            <span className="text-xs font-semibold text-gray-500 bg-gray-100 rounded-full px-2 py-0.5">
              {routes.length}
            </span>
          )}
        </div>
        <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="border-t border-gray-100">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
            </div>
          )}
          {!loading && routes.length === 0 && (
            <div className="text-center py-8 text-gray-400 text-sm">
              No saved routes yet. Build a route and click "Save Route".
            </div>
          )}
          {!loading && routes.map((route) => (
            <div key={route.id} className="px-6 py-4 border-b border-gray-50 last:border-0 flex items-start justify-between gap-4 hover:bg-gray-50 transition-colors">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 text-sm">{route.routeName}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {formatDate(route.routeDate)} &nbsp;•&nbsp; {route.stops.length} stop{route.stops.length !== 1 ? 's' : ''}
                  {route.startAddress && ` &nbsp;•&nbsp; From: ${route.startAddress}`}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => onLoad(route)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  Load
                </button>
                <button
                  onClick={() => onDelete(route.id)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DeleteRouteDialog({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onCancel}>
      <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
            <AlertCircle className="w-5 h-5 text-red-600" />
          </div>
          <h3 className="font-bold text-gray-900">Delete Saved Route?</h3>
        </div>
        <p className="text-sm text-gray-600 mb-5">This will permanently remove the saved route. This cannot be undone.</p>
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors">
            Cancel
          </button>
          <button onClick={onConfirm} className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors">
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
