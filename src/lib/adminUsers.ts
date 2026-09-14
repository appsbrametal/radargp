// --- GESTÃO DE USUÁRIOS PELO ADMIN ---
//
// Criar, apagar ou redefinir a senha de um login (usuário no Supabase Auth)
// exige a service_role key, que NUNCA pode ir para o navegador. Por isso
// essas operações passam por uma Supabase Edge Function
// (`supabase/functions/admin-users`), que roda no servidor e confere que
// quem está a chamar é mesmo um Admin.
//
// Editar nome/roles de um usuário já existente não precisa disso — é só uma
// atualização normal na tabela `profiles` (feita via dataStore, como as
// outras coleções).

import { supabase } from './supabase';

// Quando a Edge Function responde com um status não-2xx, o supabase-js
// lança um `FunctionsHttpError` cuja `.message` é sempre o texto genérico
// "Edge Function returned a non-2xx status code" — o corpo JSON de verdade
// que a função devolveu (ex.: "A nova senha deve ter pelo menos 6
// caracteres.", ou "Ação desconhecida...") fica escondido em
// `error.context`, que é a própria Response HTTP crua. Sem isso, qualquer
// erro específico do servidor aparecia pro usuário só como essa mensagem
// genérica, sem pista nenhuma do que de facto deu errado (inclusive
// mascarando, por exemplo, a função ainda não ter sido reimplantada com uma
// ação nova). Esta função tenta ler esse corpo e usa a mensagem genérica
// apenas como último recurso.
async function extractFunctionErrorMessage(error: any): Promise<string> {
  const response: Response | undefined = error?.context;
  if (response && typeof response.json === 'function') {
    try {
      // A Response só pode ser lida uma vez — clona por segurança caso
      // algo mais (ex.: um log) também tente lê-la.
      const body = await response.clone().json();
      if (body?.error) return body.error;
    } catch {
      // Corpo não era JSON (ex.: erro de rede/gateway) — cai no fallback abaixo.
    }
  }
  return error?.message || 'Erro desconhecido ao chamar a função administrativa.';
}

async function invokeAdminUsers(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke('admin-users', { body });
  if (error) throw new Error(await extractFunctionErrorMessage(error));
  return data;
}

export async function adminCreateUser(input: {
  email: string;
  password: string;
  username: string;
  name: string;
  roles: string[];
}) {
  return invokeAdminUsers({ action: 'create', ...input });
}

export async function adminDeleteUser(userId: string) {
  return invokeAdminUsers({ action: 'delete', userId });
}

// Redefine a senha de QUALQUER usuário direto pelo sistema (usado pelo Admin
// na tela "Controle de Acessos") — não exige a senha atual do usuário-alvo.
// Diferente de `updateOwnPassword` (src/lib/auth.ts), que é o próprio usuário
// trocando a própria senha e por isso reautentica com a senha antiga.
export async function adminResetUserPassword(userId: string, newPassword: string) {
  return invokeAdminUsers({ action: 'reset-password', userId, newPassword });
}
