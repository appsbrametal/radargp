// Supabase Edge Function: ai-proxy
//
// Recebe { prompt: string } de um usuário já autenticado (o Supabase verifica
// o JWT automaticamente antes de chamar este handler) e repassa para a API
// da Anthropic (Claude), devolvendo { text: string }.
//
// A chave da Anthropic (ANTHROPIC_API_KEY) fica só aqui, como "secret" da
// função — nunca é exposta ao navegador. Configure com:
//   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
//
// Deploy: supabase functions deploy ai-proxy

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
// Atualizado de "claude-sonnet-4-5-20250929" (Claude Sonnet 4.5) para
// "claude-sonnet-5" (Claude Sonnet 5, o Sonnet atual) em 13/09/2026: o
// modelo anterior tem data de retirada prevista para não antes de
// 29/09/2026 — a poucos dias, na época desta troca — o que faria a IA
// parar de responder (chamadas à API da Anthropic passariam a falhar com
// "modelo não encontrado/retirado"). Pode ser sobrescrito por variável de
// ambiente (`supabase secrets set ANTHROPIC_MODEL=...`) sem precisar mexer
// no código, caso a Anthropic lance um modelo mais novo no futuro.
const MODEL = Deno.env.get('ANTHROPIC_MODEL') || 'claude-sonnet-5';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (!ANTHROPIC_API_KEY) {
    return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY não configurada no servidor.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const { prompt } = await req.json();
    if (!prompt || typeof prompt !== 'string') {
      return new Response(JSON.stringify({ error: 'Campo "prompt" (string) é obrigatório.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 2048,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return new Response(JSON.stringify({ error: `Erro da API da Anthropic: ${errText}` }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    const text = data?.content?.[0]?.text ?? '';

    return new Response(JSON.stringify({ text }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
