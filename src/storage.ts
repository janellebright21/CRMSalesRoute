import { supabase } from './supabaseClient';
import { Customer, Visit, SavedRoute, RouteStop, AppSettings, DEFAULT_SETTINGS } from './types';

// ── Local-storage cache (fast initial render while Supabase loads) ────────────
const CUSTOMERS_KEY = 'crp_customers';
const SETTINGS_KEY  = 'crp_settings';

export function loadCustomers(): Customer[] {
  try {
    const raw = localStorage.getItem(CUSTOMERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function saveCustomers(customers: Customer[]): void {
  localStorage.setItem(CUSTOMERS_KEY, JSON.stringify(customers));
}

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
  } catch { return DEFAULT_SETTINGS; }
}

export function saveSettings(settings: AppSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

// ── Row shape helpers ─────────────────────────────────────────────────────────

function customerToRow(customer: Customer, userId: string) {
  return {
    id:           customer.id,
    user_id:      userId,
    name:         customer.name,
    address:      [customer.address, customer.city, customer.state, customer.zip].filter(Boolean).join(', '),
    phone:        customer.phone ?? '',
    email:        customer.email ?? '',
    notes:        customer.visitNotes ?? '',
    last_visited: customer.lastVisitDate ? new Date(customer.lastVisitDate).toISOString() : null,
    data:         customer,
    updated_at:   new Date().toISOString(),
  };
}

function rowToCustomer(row: { id: string; data: unknown }): Customer {
  const base = row.data as Customer;
  return { ...base, id: row.id };
}

// ── Supabase: customers ───────────────────────────────────────────────────────

export async function fetchCustomers(): Promise<Customer[]> {
  const { data, error } = await supabase
    .from('customers')
    .select('id, data')
    .order('created_at', { ascending: true });

  if (error) throw error;

  const customers = (data ?? []).map(rowToCustomer);
  saveCustomers(customers);
  return customers;
}

export async function upsertCustomer(customer: Customer, userId: string): Promise<void> {
  const { error } = await supabase
    .from('customers')
    .upsert(customerToRow(customer, userId), { onConflict: 'id' });
  if (error) throw error;
}

export async function deleteCustomerRemote(id: string): Promise<void> {
  const { error } = await supabase.from('customers').delete().eq('id', id);
  if (error) throw error;
}

// ── Supabase: visits ──────────────────────────────────────────────────────────

export async function fetchVisitsForCustomer(customerId: string): Promise<Visit[]> {
  const { data, error } = await supabase
    .from('visits')
    .select('id, customer_id, user_id, visit_date, visit_notes, created_at')
    .eq('customer_id', customerId)
    .order('visit_date', { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id as string,
    customerId: row.customer_id as string,
    userId: row.user_id as string,
    visitDate: row.visit_date as string,
    visitNotes: row.visit_notes as string,
    createdAt: row.created_at as string,
  }));
}

export async function insertVisit(visit: Omit<Visit, 'id' | 'createdAt'>, userId: string): Promise<Visit> {
  const { data, error } = await supabase
    .from('visits')
    .insert({
      customer_id: visit.customerId,
      user_id:     userId,
      visit_date:  visit.visitDate,
      visit_notes: visit.visitNotes,
    })
    .select('id, customer_id, user_id, visit_date, visit_notes, created_at')
    .single();

  if (error) throw error;

  return {
    id:          data.id as string,
    customerId:  data.customer_id as string,
    userId:      data.user_id as string,
    visitDate:   data.visit_date as string,
    visitNotes:  data.visit_notes as string,
    createdAt:   data.created_at as string,
  };
}

export async function updateVisit(visit: Visit): Promise<void> {
  const { error } = await supabase
    .from('visits')
    .update({ visit_date: visit.visitDate, visit_notes: visit.visitNotes })
    .eq('id', visit.id);
  if (error) throw error;
}

export async function deleteVisit(id: string): Promise<void> {
  const { error } = await supabase.from('visits').delete().eq('id', id);
  if (error) throw error;
}

// ── Supabase: routes ──────────────────────────────────────────────────────────

function rowToRoute(row: {
  id: string;
  user_id: string;
  route_name: string;
  route_date: string;
  stops: unknown;
  created_at: string;
  start_address?: string;
}): SavedRoute {
  const stops = row.stops as (RouteStop & { startAddress?: string })[];
  // start_address may be stored top-level or was previously embedded in stops metadata
  return {
    id:           row.id,
    userId:       row.user_id,
    routeName:    row.route_name,
    routeDate:    row.route_date,
    startAddress: row.start_address ?? '',
    stops:        stops.map((s, i) => ({ customerId: s.customerId, order: i })),
    createdAt:    row.created_at,
  };
}

export async function fetchRoutes(): Promise<SavedRoute[]> {
  const { data, error } = await supabase
    .from('routes')
    .select('id, user_id, route_name, route_date, stops, start_address, created_at')
    .order('route_date', { ascending: false });

  if (error) throw error;
  return (data ?? []).map(rowToRoute);
}

export async function upsertRoute(route: SavedRoute, userId: string): Promise<SavedRoute> {
  const payload = {
    id:            route.id,
    user_id:       userId,
    route_name:    route.routeName,
    route_date:    route.routeDate,
    stops:         route.stops,
    start_address: route.startAddress,
  };

  const { data, error } = await supabase
    .from('routes')
    .upsert(payload, { onConflict: 'id' })
    .select('id, user_id, route_name, route_date, stops, start_address, created_at')
    .single();

  if (error) throw error;
  return rowToRoute(data);
}

export async function deleteRoute(id: string): Promise<void> {
  const { error } = await supabase.from('routes').delete().eq('id', id);
  if (error) throw error;
}

// ── Supabase: settings ────────────────────────────────────────────────────────

export async function fetchSettings(): Promise<AppSettings> {
  const { data, error } = await supabase
    .from('user_settings')
    .select('data')
    .maybeSingle();

  if (error) throw error;

  const settings: AppSettings = data
    ? { ...DEFAULT_SETTINGS, ...(data.data as AppSettings) }
    : DEFAULT_SETTINGS;

  saveSettings(settings);
  return settings;
}

export async function upsertSettings(settings: AppSettings, userId: string): Promise<void> {
  const { error } = await supabase
    .from('user_settings')
    .upsert({ user_id: userId, data: settings, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
  if (error) throw error;
}
