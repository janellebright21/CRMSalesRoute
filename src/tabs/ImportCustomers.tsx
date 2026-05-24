import { useState, useRef, useCallback } from 'react';
import { Customer } from '../types';
import {
  parseFile,
  autoDetectMapping,
  rowsToCustomers,
  FIELD_ALIASES,
  FieldKey,
} from '../utils/importExport';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Trash2,
  RefreshCw,
} from 'lucide-react';

interface Props {
  onImport: (customers: Customer[], mode: 'replace' | 'merge') => void;
  existingCount: number;
}

// The fields we surface in the column mapper, in display order
const MAPPABLE_FIELDS: { key: FieldKey; label: string; required?: boolean }[] = [
  { key: 'name',          label: 'Customer Name',   required: true },
  { key: 'company',       label: 'Company' },
  { key: 'address',       label: 'Street Address' },
  { key: 'city',          label: 'City' },
  { key: 'state',         label: 'State' },
  { key: 'zip',           label: 'ZIP Code' },
  { key: 'phone',         label: 'Phone' },
  { key: 'email',         label: 'Email' },
  { key: 'priority',      label: 'Priority (high/medium/low)' },
  { key: 'lastVisitDate', label: 'Last Visit Date' },
  { key: 'followUpDate',  label: 'Follow-Up Date' },
  { key: 'visitNotes',    label: 'Notes' },
  { key: 'lat',           label: 'Latitude' },
  { key: 'lng',           label: 'Longitude' },
];

type Step = 'upload' | 'map' | 'preview' | 'done';

export default function ImportCustomers({ onImport, existingCount }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>('upload');
  const [fileName, setFileName] = useState('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, unknown>[]>([]);
  const [mapping, setMapping] = useState<Record<FieldKey, string>>({} as Record<FieldKey, string>);
  const [preview, setPreview] = useState<Customer[]>([]);
  const [skipped, setSkipped] = useState(0);
  const [importMode, setImportMode] = useState<'replace' | 'merge'>('merge');
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState('');
  const [mapError, setMapError] = useState('');
  const [showMappingPanel, setShowMappingPanel] = useState(true);
  const [importedCount, setImportedCount] = useState(0);

  // -------------------------------------------------------------------------
  // File handling
  // -------------------------------------------------------------------------

  const handleFile = useCallback(async (file: File) => {
    setError('');
    setMapError('');
    setFileName(file.name);

    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    if (!['csv', 'xlsx', 'xls'].includes(ext)) {
      setError('Unsupported file type. Please upload a .csv, .xlsx, or .xls file.');
      return;
    }

    const result = await parseFile(file);

    if (result.error) {
      setError(result.error);
      return;
    }

    if (result.rows.length === 0) {
      setError('The file has no data rows. Make sure your file has a header row and at least one customer row.');
      return;
    }

    const detected = autoDetectMapping(result.headers);
    setHeaders(result.headers);
    setRawRows(result.rows);
    setMapping(detected);
    setStep('map');
  }, []);

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    // reset input so same file can be re-uploaded
    e.target.value = '';
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  // -------------------------------------------------------------------------
  // Mapping step
  // -------------------------------------------------------------------------

  function setFieldMapping(field: FieldKey, csvHeader: string) {
    setMapping((prev) => ({ ...prev, [field]: csvHeader }));
    setMapError('');
  }

  function proceedToPreview() {
    if (!mapping['name']) {
      setMapError('You must map the "Customer Name" column before continuing.');
      return;
    }
    const { customers, skipped: s } = rowsToCustomers(rawRows, mapping);
    if (customers.length === 0) {
      setMapError('No valid customer rows were found. Make sure the "Customer Name" column contains names.');
      return;
    }
    setPreview(customers);
    setSkipped(s);
    setStep('preview');
  }

  // -------------------------------------------------------------------------
  // Preview / confirm step
  // -------------------------------------------------------------------------

  function confirmImport() {
    onImport(preview, importMode);
    setImportedCount(preview.length);
    setStep('done');
  }

  function reset() {
    setStep('upload');
    setFileName('');
    setHeaders([]);
    setRawRows([]);
    setMapping({} as Record<FieldKey, string>);
    setPreview([]);
    setSkipped(0);
    setError('');
    setMapError('');
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="max-w-4xl mx-auto space-y-5">

      {/* Step indicator */}
      <div className="flex items-center gap-2 text-sm font-medium">
        {(['upload', 'map', 'preview', 'done'] as Step[]).map((s, i) => {
          const labels: Record<Step, string> = { upload: '1. Upload', map: '2. Map Columns', preview: '3. Preview', done: '4. Done' };
          const done = ['upload', 'map', 'preview', 'done'].indexOf(step) > i;
          const active = step === s;
          return (
            <div key={s} className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${active ? 'bg-blue-600 text-white' : done ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-400'}`}>
                {labels[s]}
              </span>
              {i < 3 && <ArrowRight className="w-3 h-3 text-gray-300 flex-shrink-0" />}
            </div>
          );
        })}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* STEP 1: UPLOAD                                                       */}
      {/* ------------------------------------------------------------------ */}
      {step === 'upload' && (
        <>
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-1">Import Customers</h2>
            <p className="text-sm text-gray-500 mb-6">Upload an Excel (.xlsx) or CSV (.csv) file with your customer data. The app will walk you through matching your columns.</p>

            <div
              onDrop={onDrop}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onClick={() => inputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-colors ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'}`}
            >
              <input
                ref={inputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                onChange={onFileChange}
              />
              <Upload className={`w-12 h-12 mx-auto mb-4 transition-colors ${isDragging ? 'text-blue-500' : 'text-gray-300'}`} />
              <p className="text-base font-semibold text-gray-700">Click here to choose a file, or drag and drop it here</p>
              <p className="text-sm text-gray-400 mt-1">Supports .csv, .xlsx, and .xls files</p>
            </div>

            {error && (
              <div className="mt-4 flex items-start gap-3 bg-red-50 text-red-700 border border-red-200 rounded-xl px-4 py-3">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-sm">Could not read this file</p>
                  <p className="text-sm mt-0.5">{error}</p>
                </div>
              </div>
            )}
          </div>

          {/* Column guide */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <FileSpreadsheet className="w-5 h-5 text-blue-600" />
              <h3 className="font-bold text-gray-900">What should my file look like?</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Your file should have a <strong>header row</strong> as the first row. Each column header tells the app what that column contains.
              Column names are flexible — the app will try to recognize them automatically, and lets you fix them if needed.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {MAPPABLE_FIELDS.map(({ key, label, required }) => (
                <div key={key} className="flex items-center gap-1.5 text-xs bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-lg">
                  <span className="font-mono text-gray-700">{label}</span>
                  {required && <span className="text-red-500 font-bold">*</span>}
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-3">* Required. All other columns are optional.</p>
          </div>
        </>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* STEP 2: MAP COLUMNS                                                  */}
      {/* ------------------------------------------------------------------ */}
      {step === 'map' && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Match Your Columns</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                File: <span className="font-medium text-gray-700">{fileName}</span> — {rawRows.length} rows found.
                The app guessed the column matches below. Fix any that are wrong.
              </p>
            </div>
            <button onClick={reset} className="p-2 rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0" title="Start over">
              <Trash2 className="w-4 h-4 text-gray-400" />
            </button>
          </div>

          <div className="px-6 py-4">
            <button
              onClick={() => setShowMappingPanel((v) => !v)}
              className="flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-gray-900 transition-colors"
            >
              {showMappingPanel ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              {showMappingPanel ? 'Hide column mapping' : 'Show column mapping'}
            </button>
          </div>

          {showMappingPanel && (
            <div className="px-6 pb-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {MAPPABLE_FIELDS.map(({ key, label, required }) => {
                  const currentVal = mapping[key] ?? '';
                  const matched = !!currentVal;
                  return (
                    <div key={key} className={`rounded-xl border-2 p-3 ${matched ? 'border-emerald-200 bg-emerald-50/40' : required ? 'border-red-200 bg-red-50/30' : 'border-gray-100 bg-gray-50/40'}`}>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-semibold text-gray-700">
                          {label}
                          {required && <span className="text-red-500 ml-0.5">*</span>}
                        </label>
                        {matched && <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />}
                      </div>
                      <select
                        value={currentVal}
                        onChange={(e) => setFieldMapping(key, e.target.value)}
                        className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:border-blue-500"
                      >
                        <option value="">— Not in this file —</option>
                        {headers.map((h) => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                    </div>
                  );
                })}
              </div>

              {/* Raw data preview */}
              <div className="mt-5">
                <p className="text-xs font-semibold text-gray-500 mb-2">Raw data sample (first 3 rows of your file):</p>
                <div className="overflow-x-auto rounded-xl border border-gray-200">
                  <table className="text-xs w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        {headers.map((h) => (
                          <th key={h} className="px-3 py-2 text-left font-semibold text-gray-600 whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {rawRows.slice(0, 3).map((row, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          {headers.map((h) => (
                            <td key={h} className="px-3 py-2 text-gray-600 whitespace-nowrap max-w-[160px] truncate">{String(row[h] ?? '')}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {mapError && (
            <div className="mx-6 mb-4 flex items-start gap-3 bg-red-50 text-red-700 border border-red-200 rounded-xl px-4 py-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <p className="text-sm">{mapError}</p>
            </div>
          )}

          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between gap-4">
            <button onClick={reset} className="text-sm text-gray-500 hover:text-gray-700 font-medium">
              ← Upload a different file
            </button>
            <button
              onClick={proceedToPreview}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors"
            >
              Preview Import <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* STEP 3: PREVIEW                                                      */}
      {/* ------------------------------------------------------------------ */}
      {step === 'preview' && (
        <div className="space-y-4">
          {/* Summary bar */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <div className="flex items-start gap-4 flex-wrap">
              <div className="flex-1">
                <h2 className="text-xl font-bold text-gray-900">Preview Import</h2>
                <p className="text-sm text-gray-500 mt-0.5">{fileName}</p>
              </div>
              <div className="flex gap-3 flex-wrap">
                <div className="text-center px-4 py-2 bg-emerald-50 rounded-xl border border-emerald-200">
                  <div className="text-xl font-extrabold text-emerald-700">{preview.length}</div>
                  <div className="text-xs text-emerald-600">Will import</div>
                </div>
                {skipped > 0 && (
                  <div className="text-center px-4 py-2 bg-amber-50 rounded-xl border border-amber-200">
                    <div className="text-xl font-extrabold text-amber-700">{skipped}</div>
                    <div className="text-xs text-amber-600">Skipped (no name)</div>
                  </div>
                )}
              </div>
            </div>

            {skipped > 0 && (
              <div className="mt-3 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                {skipped} row{skipped > 1 ? 's were' : ' was'} skipped because the Customer Name column was empty.
              </div>
            )}

            {existingCount > 0 && (
              <div className="mt-4">
                <p className="text-sm font-semibold text-gray-700 mb-2">
                  You already have <strong>{existingCount}</strong> customers. How should these be imported?
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  {([
                    ['merge', 'Add to existing customers', `Keep your ${existingCount} existing customers and add the new ones`],
                    ['replace', 'Replace all existing customers', 'Delete all existing customers and use only this file'],
                  ] as const).map(([val, label, desc]) => (
                    <label
                      key={val}
                      className={`flex-1 flex items-start gap-3 cursor-pointer p-3 rounded-xl border-2 transition-colors ${importMode === val ? (val === 'replace' ? 'border-red-400 bg-red-50' : 'border-blue-400 bg-blue-50') : 'border-gray-200 hover:border-gray-300'}`}
                    >
                      <input type="radio" name="mode" value={val} checked={importMode === val} onChange={() => setImportMode(val)} className="mt-0.5 accent-blue-600" />
                      <div>
                        <p className="text-sm font-semibold text-gray-800">{label}</p>
                        <p className="text-xs text-gray-500">{desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Data table */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-700">Showing first {Math.min(preview.length, 50)} of {preview.length} customers</p>
              <button onClick={() => setStep('map')} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium">
                <RefreshCw className="w-3 h-3" /> Fix column mapping
              </button>
            </div>
            <div className="overflow-x-auto max-h-80">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    {['#', 'Name', 'Company', 'Address', 'City', 'State', 'ZIP', 'Phone', 'Priority'].map((h) => (
                      <th key={h} className="px-3 py-2.5 text-left font-semibold text-gray-600 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {preview.slice(0, 50).map((c, i) => (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 text-gray-400">{i + 1}</td>
                      <td className="px-3 py-2 font-medium text-gray-900 whitespace-nowrap">{c.name}</td>
                      <td className="px-3 py-2 text-gray-600">{c.company}</td>
                      <td className="px-3 py-2 text-gray-600 max-w-[140px] truncate">{c.address}</td>
                      <td className="px-3 py-2 text-gray-600">{c.city}</td>
                      <td className="px-3 py-2 text-gray-600">{c.state}</td>
                      <td className="px-3 py-2 text-gray-600">{c.zip}</td>
                      <td className="px-3 py-2 text-gray-600">{c.phone}</td>
                      <td className="px-3 py-2">
                        <span className={`px-2 py-0.5 rounded-full font-semibold ${c.priority === 'high' ? 'bg-red-100 text-red-700' : c.priority === 'low' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                          {c.priority}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between gap-4">
              <button onClick={() => setStep('map')} className="text-sm text-gray-500 hover:text-gray-700 font-medium">
                ← Back to column mapping
              </button>
              <button
                onClick={confirmImport}
                className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-colors"
              >
                <CheckCircle className="w-4 h-4" />
                Import {preview.length} Customer{preview.length !== 1 ? 's' : ''}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* STEP 4: DONE                                                         */}
      {/* ------------------------------------------------------------------ */}
      {step === 'done' && (
        <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-5">
            <CheckCircle className="w-9 h-9 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-extrabold text-gray-900 mb-2">
            {importedCount} customer{importedCount !== 1 ? 's' : ''} imported!
          </h2>
          <p className="text-gray-500 text-sm mb-8">
            Your customers are now saved and available in the Customer List, Find Nearby Customers, and Route Builder.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={reset}
              className="flex items-center gap-2 justify-center px-5 py-3 rounded-xl text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              <Upload className="w-4 h-4" /> Import Another File
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
