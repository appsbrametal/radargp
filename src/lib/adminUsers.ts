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

export async function adminCreateUser(input: {
  email: string;
  password: string;
  username: string;
  name: string;
  roles: string[];
}) {
  const { data, error } = await supabase.functions.invoke('admin-users', {
    body: { action: 'create', ...input },
  });
  if (error) throw error;
  return data;
}

export async function adminDeleteUser(userId: string) {
  const { data, error } = await supabase.functions.invoke('admin-users', {
    body: { action: 'delete', userId },
  });
  if (error) throw error;
  return data;
}

// Redefine a senha de QUALQUER usuário direto pelo sistema (usado pelo Admin
// na tela "Controle de Acessos") — não exige a senha atual do usuário-alvo.
// Diferente de `updateOwnPassword` (src/lib/auth.ts), que é o próprio usuário
// trocando a própria senha e por isso reautentica com a senha antiga.
export async function adminResetUserPassword(userId: string, newPassword: string) {
  const { data, error } = await supabase.functions.invoke('admin-users', {
    body: { action: 'reset-password', userId, newPassword },
  });
  if (error) throw error;
  return data;
}
