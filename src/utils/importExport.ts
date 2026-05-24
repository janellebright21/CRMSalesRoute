import * as XLSX from 'xlsx';
import { Customer, Priority } from '../types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function newId(): string {
  return crypto.randomUUID();
}

function now(): string {
  return new Date().toISOString();
}

function parsePriority(val: unknown): Priority {
  const s = String(val ?? '').toLowerCase().trim();
  if (s === 'high') return 'high';
  if (s === 'low') return 'low';
  return 'medium';
}

function str(val: unknown): string {
  return val == null ? '' : String(val).trim();
}

function num(val: unknown): number | undefined {
  const n = parseFloat(String(val ?? ''));
  return isNaN(n) ? undefined : n;
}

// ---------------------------------------------------------------------------
// Column mapping
// ---------------------------------------------------------------------------

// Known aliases for each logical field. Case-insensitive matching.
export const FIELD_ALIASES: Record<string, string[]> = {
  name:         ['name', 'customer name', 'customer_name', 'full name', 'full_name', 'contact', 'contact name'],
  company:      ['company', 'business', 'business name', 'organization', 'org', 'account', 'account name'],
  address:      ['address', 'street', 'street address', 'addr', 'street_address'],
  city:         ['city', 'town', 'municipality'],
  state:        ['state', 'province', 'region', 'st'],
  zip:          ['zip', 'zip code', 'postal', 'postal code', 'zipcode', 'postcode'],
  phone:        ['phone', 'phone number', 'telephone', 'tel', 'mobile', 'cell'],
  email:        ['email', 'e-mail', 'email address'],
  priority:     ['priority', 'tier', 'level', 'rank'],
  lastVisitDate:['last visit', 'last visit date', 'last_visit', 'last visited', 'visit date'],
  followUpDate: ['follow up', 'follow up date', 'follow_up', 'followup', 'next visit', 'callback date'],
  visitNotes:   ['notes', 'visit notes', 'comments', 'memo', 'remarks', 'note'],
  lat:          ['lat', 'latitude', 'y'],
  lng:          ['lng', 'lon', 'longitude', 'long', 'x'],
  value:        ['value', 'sales', 'revenue', 'annual value', 'account value', 'sales value'],
};

export type FieldKey = keyof typeof FIELD_ALIASES;

/** Given a raw header string, return the matched field key or null. */
export function detectField(header: string): FieldKey | null {
  const h = header.toLowerCase().trim();
  for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
    if (aliases.includes(h)) return field as FieldKey;
  }
  return null;
}

/** Auto-detect column mapping for a set of headers. Returns { fieldKey -> csvHeader }. */
export function autoDetectMapping(headers: string[]): Record<FieldKey, string> {
  const mapping: Partial<Record<FieldKey, string>> = {};
  for (const h of headers) {
    const field = detectField(h);
    if (field && !mapping[field]) {
      mapping[field] = h;
    }
  }
  return mapping as Record<FieldKey, string>;
}

// ---------------------------------------------------------------------------
// Row -> Customer
// ---------------------------------------------------------------------------

export function rowToCustomer(
  row: Record<string, unknown>,
  mapping: Record<FieldKey, string>
): Customer | null {
  const get = (field: FieldKey) => str(row[mapping[field]] ?? '');

  const name = get('name');
  if (!name) return null;

  return {
    id: newId(),
    name,
    company:        get('company') || undefined,
    address:        get('address'),
    city:           get('city'),
    state:          get('state'),
    zip:            get('zip'),
    phone:          get('phone') || undefined,
    email:          get('email') || undefined,
    priority:       parsePriority(row[mapping['priority']]),
    lastVisitDate:  get('lastVisitDate') || undefined,
    followUpDate:   get('followUpDate') || undefined,
    visitNotes:     get('visitNotes') || undefined,
    followUpStatus: 'pending',
    lat:            num(row[mapping['lat']]),
    lng:            num(row[mapping['lng']]),
    createdAt:      now(),
    updatedAt:      now(),
  };
}

export function rowsToCustomers(
  rows: Record<string, unknown>[],
  mapping: Record<FieldKey, string>
): { customers: Customer[]; skipped: number } {
  let skipped = 0;
  const customers: Customer[] = [];
  for (const row of rows) {
    const c = rowToCustomer(row, mapping);
    if (c) customers.push(c);
    else skipped++;
  }
  return { customers, skipped };
}

// ---------------------------------------------------------------------------
// File parsing
// ---------------------------------------------------------------------------

export interface ParseResult {
  headers: string[];
  rows: Record<string, unknown>[];
  error?: string;
}

function isCSV(file: File): boolean {
  return (
    file.name.toLowerCase().endsWith('.csv') ||
    file.type === 'text/csv' ||
    file.type === 'text/plain'
  );
}

export async function parseFile(file: File): Promise<ParseResult> {
  if (isCSV(file)) {
    return parseCSV(file);
  }
  return parseExcel(file);
}

function parseCSVText(text: string): ParseResult {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== '');
  if (lines.length === 0) return { headers: [], rows: [], error: 'The CSV file is empty or has no data rows.' };

  const parseRow = (line: string): string[] => {
    const cols: string[] = [];
    let cur = '';
    let inQuote = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuote) {
        if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
        else if (ch === '"') inQuote = false;
        else cur += ch;
      } else {
        if (ch === '"') inQuote = true;
        else if (ch === ',') { cols.push(cur); cur = ''; }
        else cur += ch;
      }
    }
    cols.push(cur);
    return cols;
  };

  const headers = parseRow(lines[0]).map((h) => h.trim());
  if (headers.length === 0) return { headers: [], rows: [], error: 'Could not read column headers from the CSV file.' };

  const rows: Record<string, unknown>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const vals = parseRow(lines[i]);
    const row: Record<string, unknown> = {};
    headers.forEach((h, idx) => { row[h] = vals[idx] ?? ''; });
    rows.push(row);
  }
  return { headers, rows };
}

function parseCSV(file: File): Promise<ParseResult> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target!.result as string;
        resolve(parseCSVText(text));
      } catch (err) {
        resolve({ headers: [], rows: [], error: 'CSV parse error.' });
      }
    };
    reader.onerror = () => resolve({ headers: [], rows: [], error: 'Failed to read the file.' });
    reader.readAsText(file);
  });
}

async function parseExcel(file: File): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { defval: '' }) as Record<string, unknown>[];
        if (!rows || rows.length === 0) {
          resolve({ headers: [], rows: [], error: 'The Excel file is empty or has no data rows.' });
          return;
        }
        // Trim header whitespace
        const trimmed = rows.map((r) => {
          const out: Record<string, unknown> = {};
          for (const [k, v] of Object.entries(r)) out[k.trim()] = v;
          return out;
        });
        const headers = Object.keys(trimmed[0] ?? {});
        resolve({ headers, rows: trimmed });
      } catch (err) {
        resolve({ headers: [], rows: [], error: 'Could not read the Excel file. Make sure it is a valid .xlsx or .xls file.' });
      }
    };
    reader.onerror = () => resolve({ headers: [], rows: [], error: 'Failed to read the file.' });
    reader.readAsArrayBuffer(file);
  });
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export function exportToCSV(customers: Customer[]): void {
  const rows = customers.map((c) => ({
    Name: c.name,
    Company: c.company ?? '',
    Address: c.address,
    City: c.city,
    State: c.state,
    Zip: c.zip,
    Phone: c.phone ?? '',
    Email: c.email ?? '',
    Priority: c.priority,
    'Last Visit': c.lastVisitDate ?? '',
    'Follow Up Date': c.followUpDate ?? '',
    'Follow Up Status': c.followUpStatus ?? '',
    Notes: c.visitNotes ?? '',
    Lat: c.lat ?? '',
    Lng: c.lng ?? '',
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Customers');
  XLSX.writeFile(wb, 'customers_export.xlsx');
}
