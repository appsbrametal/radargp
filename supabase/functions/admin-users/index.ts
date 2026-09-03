// Supabase Edge Function: admin-users
//
// Cria ou apaga um login (usuário no Supabase Auth + a linha correspondente
// em `profiles`). Isso exige a service_role key, que nunca pode ir para o
// navegador — por isso mora aqui, no servidor.
//
// Segurança: confere que quem está a chamar tem um JWT válido (verificado
// automaticamente pelo Supabase antes de chegar aqui) e que o perfil desse
// usuário tem a role "Admin", antes de fazer qualquer coisa.
//
// Secrets necessários (o Supabase já define os dois primeiros
// automaticamente em produção; para rodar local com `supabase start` eles
// também ficam disponíveis):
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
//
// Deploy: supabase functions deploy admin-users

import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return jsonResponse({ error: 'Não autenticado.' }, 401);

  // Client "como o usuário que chamou", só para checar quem é e se é Admin.
  const callerClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const {
    data: { user: caller },
  } = await callerClient.auth.getUser();
  if (!caller) return jsonResponse({ error: 'Não autenticado.' }, 401);

  const { data: callerProfile } = await callerClient.from('profiles').select('roles').eq('id', caller.id).maybeSingle();
  if (!callerProfile?.roles?.includes('Admin')) {
    return jsonResponse({ error: 'Apenas administradores podem gerir usuários.' }, 403);
  }

  // Client com privilégio total, para de facto criar/apagar o login.
  const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  try {
    const body = await req.json();

    if (body.action === 'create') {
      const { email, password, username, name, roles } = body;
      if (!email || !password || !username || !name || !Array.isArray(roles)) {
        return jsonResponse({ error: 'Campos obrigatórios: email, password, username, name, roles[].' }, 400);
      }

      const { data: created, error: createError } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
      if (createError || !created.user) {
        return jsonResponse({ error: createError?.message || 'Erro ao criar usuário.' }, 400);
      }

      const { error: profileError } = await adminClient.from('profiles').insert({
        id: created.user.id,
        username,
        name,
        email,
        roles,
        blocked: false,
      });
      if (profileError) {
        // Reverte a criação do login se o perfil não puder ser gravado, para não deixar órfão.
        await adminClient.auth.admin.deleteUser(created.user.id);
        return jsonResponse({ error: profileError.message }, 400);
      }

      return jsonResponse({ id: created.user.id });
    }

    if (body.action === 'delete') {
      const { userId } = body;
      if (!userId) return jsonResponse({ error: 'Campo obrigatório: userId.' }, 400);
      if (userId === caller.id) return jsonResponse({ error: 'Não é possível remover o próprio usuário logado.' }, 400);

      await adminClient.from('profiles').delete().eq('id', userId);
      const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);
      if (deleteError) return jsonResponse({ error: deleteError.message }, 400);

      return jsonResponse({ ok: true });
    }

    return jsonResponse({ error: 'Ação desconhecida. Use "create" ou "delete".' }, 400);
  } catch (error) {
    return jsonResponse({ error: String(error) }, 500);
  }
});
