import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

// Sinaliza claramente quando o app ainda não foi configurado, em vez de
// falhar silenciosamente ou travar a tela de carregamento.
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured) {
  // eslint-disable-next-line no-console
  console.warn(
    '[Supabase] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY não configurados. ' +
      'Copie .env.example para .env.local e preencha com os dados do seu projeto Supabase.'
  );
}

// Em modo "não configurado" ainda criamos um client (com valores dummy) para
// não quebrar os imports em todo o app; as chamadas vão falhar de forma
// controlada e a UI trata isso via isSupabaseConfigured.
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key'
);
