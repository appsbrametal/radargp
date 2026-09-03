// --- CAMADA DE COMPATIBILIDADE COM A API DO FIREBASE/FIRESTORE, SOBRE O SUPABASE ---
//
// O app original (feito no Gemini Canvas) foi escrito inteiramente contra a
// API do `firebase/firestore` (doc, collection, setDoc, deleteDoc, onSnapshot).
// Em vez de reescrever dezenas de pontos de chamada espalhados pelo App.tsx,
// este módulo expõe as MESMAS funções, com a MESMA assinatura, mas
// implementadas sobre tabelas do Supabase (Postgres) — cada "coleção" do
// Firestore vira uma tabela `id text primary key, data jsonb`.
//
// Isso preserva 100% da lógica de negócio do App.tsx e troca só o backend.
// O esquema das tabelas está em `supabase/schema.sql`.

import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from './supabase';

export const db = { __brand: 'supabase-shim' as const };

interface CollectionRef {
  table: string;
}

interface DocRef {
  table: string;
  id: string;
}

function genId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

// A tabela `profiles` é a única exceção ao formato genérico (id, data jsonb):
// ela tem colunas reais (username, name, roles, etc — ver supabase/schema.sql),
// porque é ligada ao Supabase Auth. As funções abaixo tratam essa exceção.
const FLAT_TABLES = new Set(['profiles']);
function isFlatTable(table: string): boolean {
  return FLAT_TABLES.has(table);
}

// O app sempre chama collection()/doc() com o mesmo prefixo fixo:
//   collection(db, 'artifacts', appId, 'public', 'data', <tabela>)
//   doc(db, 'artifacts', appId, 'public', 'data', <tabela>, <id>)
// Então a "tabela" é sempre o 5º segmento (índice 4), e o id (se houver) o 6º.
export function collection(_db: unknown, ...segments: string[]): CollectionRef {
  const table = segments[4] ?? segments[segments.length - 1];
  return { table };
}

export function doc(dbOrRef: unknown, ...segments: string[]): DocRef {
  // doc(collectionRef) -> gera um id novo (equivalente ao addDoc do Firestore)
  // doc(collectionRef, id) -> referencia um documento específico dessa coleção
  if (dbOrRef && typeof dbOrRef === 'object' && 'table' in (dbOrRef as CollectionRef) && segments.length <= 1) {
    const table = (dbOrRef as CollectionRef).table;
    const id = segments[0] ?? genId();
    return { table, id };
  }
  const table = segments[4] ?? segments[segments.length - 2];
  const id = segments[5] ?? segments[segments.length - 1];
  return { table, id };
}

export async function setDoc(ref: DocRef, data: Record<string, unknown>, opts?: { merge?: boolean }): Promise<void> {
  if (!isSupabaseConfigured) throw new Error('Supabase não configurado.');

  if (isFlatTable(ref.table)) {
    // Tabela com colunas reais: grava os campos diretamente, sem envelope "data".
    let row: Record<string, unknown> = { ...data, id: ref.id };
    if (opts?.merge) {
      const { data: existing } = await supabase.from(ref.table).select('*').eq('id', ref.id).maybeSingle();
      row = { ...(existing ?? {}), ...data, id: ref.id };
    }
    const { error } = await supabase.from(ref.table).upsert(row);
    if (error) throw error;
    return;
  }

  let payloadData: Record<string, unknown> = data;
  if (opts?.merge) {
    const { data: existing } = await supabase.from(ref.table).select('data').eq('id', ref.id).maybeSingle();
    payloadData = { ...((existing?.data as Record<string, unknown>) ?? {}), ...data };
  }
  const { error } = await supabase
    .from(ref.table)
    .upsert({ id: ref.id, data: payloadData, updated_at: new Date().toISOString() });
  if (error) throw error;
}

export async function deleteDoc(ref: DocRef): Promise<void> {
  if (!isSupabaseConfigured) throw new Error('Supabase não configurado.');
  const { error } = await supabase.from(ref.table).delete().eq('id', ref.id);
  if (error) throw error;
}

interface SnapshotDoc {
  id: string;
  data: () => Record<string, unknown>;
}
interface Snapshot {
  empty: boolean;
  docs: SnapshotDoc[];
}
type Unsubscribe = () => void;

// Equivalente ao onSnapshot do Firestore: busca os dados imediatamente e
// depois re-busca sempre que a tabela mudar (via Supabase Realtime).
// Não faz diffing fino linha-a-linha — refaz o SELECT inteiro a cada evento,
// o que é simples e correto para o volume de dados deste app; pode ser
// otimizado depois se necessário.
export function onSnapshot(
  ref: CollectionRef,
  onNext: (snap: Snapshot) => void,
  onError?: (err: unknown) => void
): Unsubscribe {
  if (!isSupabaseConfigured) {
    onError?.(new Error('Supabase não configurado.'));
    return () => {};
  }

  let cancelled = false;

  const flat = isFlatTable(ref.table);

  const fetchAll = async () => {
    const { data, error } = await supabase.from(ref.table).select(flat ? '*' : 'id, data');
    if (cancelled) return;
    if (error) {
      onError?.(error);
      return;
    }
    const docs: SnapshotDoc[] = (data ?? []).map((row) => ({
      id: row.id as string,
      data: () => (flat ? (row as Record<string, unknown>) : ((row.data as Record<string, unknown>) ?? {})),
    }));
    onNext({ empty: docs.length === 0, docs });
  };

  fetchAll();

  let channel: RealtimeChannel | null = null;
  try {
    channel = supabase
      .channel(`realtime:${ref.table}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: ref.table }, () => {
        fetchAll();
      })
      .subscribe();
  } catch (e) {
    onError?.(e);
  }

  return () => {
    cancelled = true;
    if (channel) supabase.removeChannel(channel);
  };
}
