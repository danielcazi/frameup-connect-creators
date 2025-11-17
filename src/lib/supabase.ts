import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Check if Supabase credentials are configured
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '⚠️ Supabase não configurado. Para habilitar autenticação e backend, conecte o Lovable Cloud.'
  );
}

// Create a mock client if credentials are missing to prevent errors
const createSupabaseClient = () => {
  if (supabaseUrl && supabaseAnonKey) {
    return createClient(supabaseUrl, supabaseAnonKey);
  }
  
  // Return a mock client with no-op methods
  return {
    auth: {
      signInWithPassword: async () => ({ data: null, error: new Error('Supabase não configurado. Conecte o Lovable Cloud.') }),
      signUp: async () => ({ data: null, error: new Error('Supabase não configurado. Conecte o Lovable Cloud.') }),
      signOut: async () => ({ error: null }),
      getSession: async () => ({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
  } as any;
};

export const supabase = createSupabaseClient();
