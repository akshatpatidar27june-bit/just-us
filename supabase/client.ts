import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Keep the Next.js build from crashing when Vercel environment variables
// have not been added yet. The app will show a clear configuration error
// at runtime instead of failing during `next build`.
const isConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key',
);

export function isSupabaseConfigured() {
  return isConfigured;
}
