import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type UserRole = 'course_manager' | 'sponsor' | 'admin';

export interface Profile {
  id: string;
  role: UserRole;
  full_name: string;
  company_name: string | null;
  phone: string | null;
  created_at: string;
  updated_at: string;
}
