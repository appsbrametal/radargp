// --- INTEGRAÇÃO COM IA (Claude / Anthropic) ---
//
// Substitui a chamada direta ao Gemini (que só funcionava dentro do Gemini
// Canvas, com a chave injetada pelo ambiente) por uma chamada a uma Supabase
// Edge Function (`supabase/functions/ai-proxy`). A chave da Anthropic fica
// só no servidor (nunca no navegador) — ver supabase/functions/ai-proxy/index.ts.

import { supabase, isSupabaseConfigured } from './supabase';

export const callClaudeWithRetry = async (prompt: string, retries = 5): Promise<string> => {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase não configurado — não é possível chamar a IA.');
  }
  const delays = [1000, 2000, 4000, 8000, 16000];
  for (let i = 0; i < retries; i++) {
    try {
      const { data, error } = await supabase.functions.invoke('ai-proxy', {
        body: { prompt },
      });
      if (error) throw error;
      if (!data?.text) throw new Error('Resposta da IA vazia.');
      return data.text as string;
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise((resolve) => setTimeout(resolve, delays[i]));
    }
  }
  throw new Error('Falha ao chamar a IA.');
};
