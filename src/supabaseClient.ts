import { createClient } from '@supabase/supabase-js';

const supabaseUrl: string = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey: string = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseUrl.startsWith('https://')) {
  throw new Error(
    'VITE_SUPABASE_URL is missing or invalid. ' +
    'Copy .env.example to .env and set your Supabase project URL.'
  );
}

if (!supabaseAnonKey) {
  throw new Error(
    'VITE_SUPABASE_ANON_KEY is missing. ' +
    'Copy .env.example to .env and set your Supabase anon key.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'crp_auth',
  },
  global: {
    headers: { 'x-app-name': 'route-planner-crm' },
  },
});
