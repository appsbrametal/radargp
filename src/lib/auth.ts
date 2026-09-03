// --- AUTENTICAÇÃO (Supabase Auth) ---
//
// Substitui o esquema anterior (tabela `appUsers` própria, com senha em
// texto puro comparada no cliente) pelo Supabase Auth de verdade: login por
// e-mail/senha, sessão de fato, e senhas com hash gerenciadas pelo Supabase.
//
// Perfil de aplicação (nome, roles) fica na tabela `profiles`, com o mesmo
// id do usuário em auth.users (1 para 1).

import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';

export interface AppProfile {
  id: string;
  username: string;
  name: string;
  roles: string[];
  email: string;
  blocked?: boolean;
}

export async function fetchProfile(userId: string): Promise<AppProfile | null> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
  if (error || !data) return null;
  return {
    id: data.id,
    username: data.username,
    name: data.name,
    roles: data.roles || [],
    email: data.email,
  };
}

export async function signInWithPassword(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signOut() {
  return supabase.auth.signOut();
}

export function getSession(): Promise<Session | null> {
  return supabase.auth.getSession().then(({ data }) => data.session);
}

export function onAuthStateChange(callback: (session: Session | null) => void) {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => callback(session));
  return () => data.subscription.unsubscribe();
}

// Troca a própria senha. Reautentica primeiro com a senha atual (o Supabase
// não permite ler/comparar a senha salva — diferente do esquema antigo que
// guardava a senha em texto puro).
export async function updateOwnPassword(email: string, oldPassword: string, newPassword: string) {
  const { error: reauthError } = await supabase.auth.signInWithPassword({ email, password: oldPassword });
  if (reauthError) throw new Error('Senha atual incorreta.');
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}
