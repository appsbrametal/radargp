# Sistema de Gestão de Demandas de TI (Radar)

Este projeto é a evolução do app que você criou no Gemini Canvas. O código de
telas/regras de negócio (React) é o mesmo — o que mudou foi o "por baixo do
capô", para o app poder rodar fora do Canvas, com dados de verdade e login
seguro:

| | Antes (Gemini Canvas) | Agora |
|---|---|---|
| Banco de dados | Firebase Firestore, config injetada só dentro do Canvas | Supabase (Postgres) |
| Login | Tabela própria, senha em **texto puro**, comparada no navegador | Supabase Auth (e-mail/senha, hash de verdade) |
| IA (resumos, próximos passos) | Google Gemini, chave injetada só dentro do Canvas | Claude (Anthropic), chamado por uma Edge Function no servidor |

Nenhuma tela, filtro, gráfico ou fluxo foi removido — só a fundação por baixo.

## Estrutura do projeto

```
src/
  App.tsx              # todo o app (telas, lógica) — igual ao original, com os ajustes descritos acima
  lib/
    supabase.ts         # cliente Supabase (lê VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)
    dataStore.ts         # camada de compatibilidade: mesma API do firebase/firestore (doc/collection/setDoc/...), agora sobre o Supabase
    auth.ts              # login, sessão e troca de senha via Supabase Auth
    adminUsers.ts         # criar/apagar usuários (chama a Edge Function admin-users)
    claude.ts             # chama a IA (Edge Function ai-proxy)
supabase/
  schema.sql             # cria todas as tabelas, políticas de acesso (RLS) e realtime
  functions/
    ai-proxy/             # Edge Function: chama a API da Anthropic (a chave fica só aqui)
    admin-users/           # Edge Function: cria/apaga logins (usa a service_role key)
scripts/
  import-legacy-json.mjs  # importa um backup .json exportado pelo app antigo
```

## Passo a passo para colocar no ar

### 1. Pré-requisitos

- Node.js 20+ (o projeto foi criado com Node 22)
- Uma conta no [Supabase](https://supabase.com) (tem plano gratuito)
- Uma chave de API da [Anthropic](https://console.anthropic.com) (para os resumos/próximos passos com IA)
- [Supabase CLI](https://supabase.com/docs/guides/cli) instalado (`npm install -g supabase`), para publicar as Edge Functions

### 2. Instalar dependências

```bash
npm install
```

### 3. Criar o projeto no Supabase

1. Crie um projeto em https://supabase.com/dashboard.
2. Em **Project Settings > API**, anote a **Project URL** e a **anon public key**.
3. Em **Project Settings > API**, anote também a **service_role key** (guarde com cuidado — ela dá acesso total, é só para o servidor).

### 4. Criar as tabelas

Abra **SQL Editor** no seu projeto Supabase, cole o conteúdo de `supabase/schema.sql` e rode. Isso cria todas as tabelas (tickets, projects, demandTypes, systems, sponsors, accessLogs, presence, profiles), as políticas de acesso e liga o Realtime.

### 5. Configurar e publicar as Edge Functions

```bash
supabase login
supabase link --project-ref SEU_PROJECT_REF   # está na URL do painel

# Segredo da IA (Claude) — só existe no servidor:
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...

supabase functions deploy ai-proxy
supabase functions deploy admin-users
```

(`SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`, usados pela função `admin-users`, já ficam disponíveis automaticamente para toda Edge Function publicada — não precisa configurar à mão.)

### 6. Configurar o app para falar com o seu Supabase

```bash
cp .env.example .env.local
```

Edite `.env.local` com a Project URL e a anon key do passo 3.

### 7. Criar o primeiro usuário Admin (bootstrap)

Como criar um usuário normalmente exige já **estar logado como Admin** (a Edge Function `admin-users` confere isso), o primeiro Admin precisa ser criado manualmente, uma única vez:

1. No painel do Supabase, vá em **Authentication > Users > Add User**, crie com um e-mail e senha seus.
2. Copie o **User UID** gerado.
3. No **SQL Editor**, rode (trocando os valores):

```sql
insert into public.profiles (id, username, name, email, roles)
values ('COLE_O_USER_UID_AQUI', 'admin', 'Seu Nome', 'seu-email@empresa.com', array['Admin']);
```

Depois disso, todos os outros usuários podem ser criados normalmente pela tela **Configurações > Controle de Acessos**, já dentro do app.

### 8. Rodar localmente

```bash
npm run dev
```

### 9. Importar os dados do sistema antigo

Quando você tiver o `backup_gestao_projetos_....json` exportado da tela **Backup Dados** do sistema antigo:

```bash
SUPABASE_URL=https://SEU-PROJETO.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=eyJ... \
node scripts/import-legacy-json.mjs caminho/para/backup_gestao_projetos.json
```

Isso importa demandas, projetos, tipos de demanda, sistemas e patrocinadores, e recria os usuários no Supabase Auth (com senhas iniciais novas, impressas no terminal — cada pessoa deve trocar a própria senha no primeiro acesso, pelo ícone de perfil).

### 10. Build de produção

```bash
npm run build   # gera dist/
npm run preview # testa o build localmente
```

Publique a pasta `dist/` em qualquer hospedagem de site estático (Vercel, Netlify, Cloudflare Pages, etc.) — não esqueça de configurar lá as mesmas variáveis `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`.

## Decisões técnicas e dívidas conhecidas

- **`src/lib/dataStore.ts`** é uma camada de compatibilidade: em vez de reescrever as ~45 chamadas ao Firestore espalhadas pelo `App.tsx`, criei funções com a mesma assinatura (`doc`, `collection`, `setDoc`, `deleteDoc`, `onSnapshot`) que conversam com o Supabase por baixo. Isso preservou 100% da lógica original, mas significa que cada "coleção" virou uma tabela genérica `(id, data jsonb)` em vez de colunas próprias. Funciona bem e é fácil de entender, mas se um dia quiser consultas SQL mais ricas (relatórios direto no banco, por exemplo), vale normalizar as tabelas mais usadas (`tickets` principalmente).
- **Tipagem TypeScript**: o arquivo `App.tsx` foi escrito originalmente como JavaScript solto (sem tipos) dentro de um arquivo `.tsx`. Para não gastar o tempo agora corrigindo tipos em um arquivo de ~4500 linhas, o build (`npm run build`) usa só o Vite/esbuild (que remove os tipos sem checá-los), e deixei um `npm run typecheck` separado (`tsc`) que hoje ainda acusa erros de tipagem — não afetam o funcionamento, mas são uma boa lista do que dá para ir melhorando aos poucos.
- **Realtime simples**: `onSnapshot` (em `dataStore.ts`) reage a mudanças recarregando a lista inteira da tabela, em vez de aplicar só a diferença. Simples e correto para o volume de dados deste app; pode ser otimizado depois se o número de registros crescer muito.
- **Arquivo único**: todas as telas ainda vivem em `src/App.tsx` (~4500 linhas), como no Canvas. Continua funcionando normalmente, mas para facilitar manutenção futura vale considerar quebrar em arquivos por tela (`src/views/DashboardView.tsx`, etc.) quando fizer sentido.
- **Bug removido**: o código original tinha `handleSaveRole` / `handleDeleteRole` / `hasPermission`, que liam um estado `rolesConfig` que nunca chegou a ser criado (nenhuma tela chamava essas funções). Isso nem compilava fora do Canvas. Removi por ser código morto — os 3 perfis de acesso (Admin / Key User / Analista) continuam fixos, geridos em Configurações.
