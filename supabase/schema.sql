-- ============================================================================
-- SCHEMA DO SISTEMA DE GESTÃO DE PROJETOS / DEMANDAS DE TI
-- ============================================================================
-- Execute este ficheiro no SQL Editor do seu projeto Supabase
-- (https://supabase.com/dashboard/project/_/sql/new), de uma vez só.
--
-- DESENHO: em vez de recriar um esquema relacional totalmente normalizado
-- (o que exigiria reescrever toda a lógica do app), cada "coleção" que
-- existia no Firestore vira uma tabela no formato:
--
--     id          text (ou uuid, no caso de profiles) primary key
--     data        jsonb  -- o documento inteiro (campos aninhados como logs,
--                            schedule, statusHistory continuam como estavam)
--     updated_at  timestamptz
--
-- Isso preserva 100% da estrutura de dados que o app já usa (tickets com
-- logs[], schedule{}, customSteps[] etc.) sem precisar migrar tudo para
-- colunas/tabelas separadas agora. Uma normalização mais fina pode vir depois,
-- se fizer sentido (ex.: separar tickets.logs numa tabela própria).
-- ============================================================================

-- --- Função utilitária: papel (role) do usuário logado é Admin? ------------
-- Usada nas policies de RLS abaixo.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and 'Admin' = any(roles)
  );
$$;

-- ============================================================================
-- PROFILES (substitui a antiga tabela "appUsers" com senha em texto puro)
-- ============================================================================
-- 1 para 1 com auth.users. Criado/editado via:
--  - Edge Function `admin-users` (novo usuário e exclusão — precisa da
--    service_role key, por isso não é feito direto pelo browser)
--  - Update direto nesta tabela (editar nome/roles de usuário existente)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  name text not null,
  email text not null,
  roles text[] not null default '{}',
  blocked boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles: leitura para autenticados" on public.profiles;
create policy "profiles: leitura para autenticados" on public.profiles
  for select using (auth.role() = 'authenticated');

drop policy if exists "profiles: admin atualiza qualquer perfil" on public.profiles;
create policy "profiles: admin atualiza qualquer perfil" on public.profiles
  for update using (public.is_admin());

drop policy if exists "profiles: usuário atualiza o próprio perfil" on public.profiles;
create policy "profiles: usuário atualiza o próprio perfil" on public.profiles
  for update using (auth.uid() = id);

-- Inserção/exclusão de profiles só pela Edge Function admin-users, que usa a
-- service_role key (que ignora RLS) — por isso não há policy de insert/delete
-- para usuários comuns aqui.

-- ============================================================================
-- TABELAS NO FORMATO "DOCUMENTO" (id + data jsonb)
-- ============================================================================
-- OBS: "demandTypes" e "accessLogs" ficam com nome entre aspas (camelCase)
-- porque é assim que o código do app (src/lib/dataStore.ts) chama
-- supabase.from(...) — o Postgres é case-sensitive para identificadores
-- entre aspas.

create table if not exists public.tickets (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.reports (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.projects (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public."demandTypes" (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.systems (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.sponsors (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public."accessLogs" (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.presence (
  id text primary key, -- id = username
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ============================================================================
-- RLS: para todas as tabelas "documento", qualquer usuário autenticado pode
-- ler/escrever. É o mesmo nível de proteção que o app tinha no Firestore
-- (regras abertas para qualquer usuário logado) — ajuste depois se quiser
-- regras mais finas por role.
-- ============================================================================
do $$
declare
  t text;
begin
  for t in select unnest(array['tickets','reports','projects','"demandTypes"','systems','sponsors','"accessLogs"','presence'])
  loop
    execute format('alter table public.%s enable row level security;', t);
    execute format('drop policy if exists "autenticados: acesso total" on public.%s;', t);
    execute format(
      'create policy "autenticados: acesso total" on public.%s for all using (auth.role() = %L) with check (auth.role() = %L);',
      t, 'authenticated', 'authenticated'
    );
  end loop;
end $$;

-- ============================================================================
-- REALTIME: habilita a publicação usada pelo supabase-js (.channel(...).on('postgres_changes', ...))
-- ============================================================================
do $$
declare
  t text;
begin
  for t in select unnest(array['tickets','reports','projects','"demandTypes"','systems','sponsors','"accessLogs"','presence','profiles'])
  loop
    begin
      execute format('alter publication supabase_realtime add table public.%s;', t);
    exception when duplicate_object then
      -- já estava na publicação, ignora
      null;
    end;
  end loop;
end $$;

-- ============================================================================
-- Pronto. Depois de rodar este script:
--  1. Crie o primeiro usuário Admin (veja README.md, seção "Primeiro acesso").
--  2. Configure as Edge Functions (supabase/functions) — veja README.md.
-- ============================================================================
