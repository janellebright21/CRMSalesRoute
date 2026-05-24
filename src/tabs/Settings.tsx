import { useState } from 'react';
import { AppSettings } from '../types';
import { exportToCSV } from '../utils/importExport';
import { Customer } from '../types';
import { Settings2, Download, Trash2, AlertCircle, CheckCircle } from 'lucide-react';

interface Props {
  settings: AppSettings;
  customers: Customer[];
  onSaveSettings: (s: AppSettings) => void;
  onClearAllData: () => void;
}

export default function Settings({ settings, customers, onSaveSettings, onClearAllData }: Props) {
  const [form, setForm] = useState<AppSettings>(settings);
  const [saved, setSaved] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  function handleSave() {
    onSaveSettings(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function set<K extends keyof AppSettings>(key: K, val: AppSettings[K]) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* General settings */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-5">
          <Settings2 className="w-5 h-5 text-blue-600" />
          <h2 className="text-xl font-bold text-gray-900">Settings</h2>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Your Name / Sales Rep Name</label>
            <input
              type="text"
              value={form.salesRepName}
              onChange={(e) => set('salesRepName', e.target.value)}
              placeholder="e.g. Jane Smith"
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Company Name</label>
            <input
              type="text"
              value={form.companyName}
              onChange={(e) => set('companyName', e.target.value)}
              placeholder="e.g. Acme Sales Co."
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Home Base Address</label>
            <input
              type="text"
              value={form.homeBase ?? ''}
              onChange={(e) => set('homeBase', e.target.value)}
              placeholder="e.g. 123 Main St, Chicago, IL 60601"
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500"
            />
            <p className="text-xs text-gray-400 mt-1">Your default starting point in Route Builder</p>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Default Search Radius (miles)</label>
            <select
              value={form.defaultRadius}
              onChange={(e) => set('defaultRadius', Number(e.target.value))}
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500"
            >
              {[10, 25, 50, 75].map((r) => (
                <option key={r} value={r}>{r} miles</option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-5 flex items-center gap-3">
          <button
            onClick={handleSave}
            className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors"
          >
            Save Settings
          </button>
          {saved && (
            <div className="flex items-center gap-1.5 text-emerald-600 text-sm font-medium">
              <CheckCircle className="w-4 h-4" />
              Saved!
            </div>
          )}
        </div>
      </div>

      {/* Data management */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Data Management</h3>
        <div className="space-y-3">
          <div className="flex items-start justify-between p-4 bg-gray-50 rounded-xl">
            <div>
              <p className="text-sm font-semibold text-gray-800">Total Customers</p>
              <p className="text-sm text-gray-500">{customers.length} customers stored in local storage</p>
            </div>
          </div>
          <div className="flex items-start justify-between p-4 bg-gray-50 rounded-xl">
            <div>
              <p className="text-sm font-semibold text-gray-800">Export All Customers</p>
              <p className="text-sm text-gray-500">Download your customer data as an Excel file</p>
            </div>
            <button
              onClick={() => exportToCSV(customers)}
              disabled={customers.length === 0}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-gray-700 bg-white border-2 border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-50 transition-colors flex-shrink-0"
            >
              <Download className="w-4 h-4" />
              Export Excel
            </button>
          </div>
          <div className="flex items-start justify-between p-4 bg-red-50 rounded-xl border border-red-100">
            <div>
              <p className="text-sm font-semibold text-red-800">Clear All Data</p>
              <p className="text-sm text-red-600">Permanently delete all customers and settings. This cannot be undone.</p>
            </div>
            <button
              onClick={() => setConfirmClear(true)}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-red-700 bg-white border-2 border-red-200 rounded-xl hover:bg-red-50 transition-colors flex-shrink-0"
            >
              <Trash2 className="w-4 h-4" />
              Clear All
            </button>
          </div>
        </div>
      </div>

      {/* Storage info */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-3">About This App</h3>
        <ul className="text-sm text-gray-600 space-y-2">
          <li className="flex items-start gap-2"><span className="text-blue-500 mt-0.5">•</span> All data is stored in your browser's local storage — nothing is sent to any server.</li>
          <li className="flex items-start gap-2"><span className="text-blue-500 mt-0.5">•</span> Geocoding (for distance search) uses the free OpenStreetMap Nominatim API.</li>
          <li className="flex items-start gap-2"><span className="text-blue-500 mt-0.5">•</span> Google Maps route links open in your browser and do not require an API key.</li>
          <li className="flex items-start gap-2"><span className="text-blue-500 mt-0.5">•</span> To back up your data, use the Export function regularly.</li>
        </ul>
      </div>

      {confirmClear && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setConfirmClear(false)}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="font-bold text-gray-900">Clear All Data?</h3>
            </div>
            <p className="text-sm text-gray-600 mb-5">This will permanently delete all {customers.length} customers and all settings. There is no way to undo this.</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setConfirmClear(false)} className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors">Cancel</button>
              <button onClick={() => { onClearAllData(); setConfirmClear(false); }} className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors">Yes, Delete Everything</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
