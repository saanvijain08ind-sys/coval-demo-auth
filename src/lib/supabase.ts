import { createClient } from '@supabase/supabase-js';

// Safe environment fallback for client-side Supabase client
// CRITICAL: Ensure SUPABASE_URL is the project base URL (https://xxx.supabase.co),
// never /rest/v1/auth/v1/authorize.
const rawUrl =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) ||
  'https://cdfltsogriaaedxtibqh.supabase.co';

const SUPABASE_URL = rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');

const SUPABASE_ANON_KEY =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkZmx0c29ncmlhYWVkeHRpYnFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEwMzgzMTEsImV4cCI6MjEwNjYxNDMxMX0.5Vmu4OJwRjKhsuzqew4sNoFUOo_x9X0EM8ZPf1u1rJw';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
export { SUPABASE_URL, SUPABASE_ANON_KEY };

