// --- GESTÃO DE USUÁRIOS PELO ADMIN ---
//
// Criar ou apagar um login (usuário no Supabase Auth) exige a service_role
// key, que NUNCA pode ir para o navegador. Por isso essas duas operações
// passam por uma Supabase Edge Function (`supabase/functions/admin-users`),
// que roda no servidor e confere que quem está a chamar é mesmo um Admin.
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
