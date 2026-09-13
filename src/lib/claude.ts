// --- INTEGRAÇÃO COM IA (Claude / Anthropic) ---
//
// Substitui a chamada direta ao Gemini (que só funcionava dentro do Gemini
// Canvas, com a chave injetada pelo ambiente) por uma chamada a uma Supabase
// Edge Function (`supabase/functions/ai-proxy`). A chave da Anthropic fica
// só no servidor (nunca no navegador) — ver supabase/functions/ai-proxy/index.ts.

import { supabase, isSupabaseConfigured } from './supabase';
import { FunctionsHttpError, FunctionsFetchError } from '@supabase/supabase-js';

// Causa raiz de "a IA não funciona, e não dá pra saber por quê": o
// supabase-js, quando a Edge Function responde com um status de erro (4xx/5xx),
// lança um `FunctionsHttpError` cuja `.message` é sempre o texto genérico fixo
// "Edge Function returned a non-2xx status code" — o corpo real da resposta
// (o `{ error: "..." }` que o ai-proxy devolve, com o motivo verdadeiro: chave
// ausente, prompt inválido, erro da própria Anthropic) fica só em
// `error.context`, que é o objeto Response cru, nunca lido automaticamente.
// Isso fazia qualquer falha da IA aparecer como um erro genérico sem
// informação nenhuma (ou silenciosamente, em telas que só faziam
// console.error). Esta função lê esse corpo e devolve a mensagem de verdade.
async function extractEdgeFunctionErrorMessage(error: InstanceType<typeof FunctionsHttpError>): Promise<string> {
  try {
    const body = await error.context.clone().json();
    if (body?.error) return String(body.error);
  } catch {
    // Corpo não era JSON (ou já foi consumido) — cai no fallback abaixo.
  }
  return `A função de IA (ai-proxy) respondeu com erro HTTP ${error.context?.status ?? '?'}.`;
}

export const callClaudeWithRetry = async (prompt: string, maxNetworkRetries = 2): Promise<string> => {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase não configurado — não é possível chamar a IA.');
  }
  const networkRetryDelays = [1000, 3000];
  let attempt = 0;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { data, error } = await supabase.functions.invoke('ai-proxy', {
      body: { prompt },
    });

    if (!error) {
      if (!data?.text) throw new Error('Resposta da IA vazia.');
      return data.text as string;
    }

    if (error instanceof FunctionsHttpError) {
      // A função respondeu (mesmo que com erro) — não é uma falha de rede,
      // então tentar de novo não resolve nada: chave da Anthropic ausente ou
      // inválida, prompt malformado e erro da própria API da Anthropic são
      // todos permanentes até algo ser corrigido no servidor. Antes o código
      // tentava de novo 5x com espera crescente (até 16s) mesmo nesses casos,
      // fazendo o botão parecer "travado" por quase 30s antes de mostrar um
      // erro genérico e inútil.
      throw new Error(await extractEdgeFunctionErrorMessage(error));
    }

    // Só chega aqui em falha de rede/conexão de fato (FunctionsFetchError ou
    // FunctionsRelayError) — essas sim valem uma nova tentativa.
    if (attempt >= maxNetworkRetries) {
      const detail = error instanceof FunctionsFetchError
        ? 'não foi possível conectar à função de IA'
        : (error instanceof Error ? error.message : String(error));
      throw new Error(`Falha ao chamar a IA depois de várias tentativas (${detail}). Verifique sua conexão.`);
    }
    await new Promise((resolve) => setTimeout(resolve, networkRetryDelays[attempt] ?? 3000));
    attempt++;
  }
};
