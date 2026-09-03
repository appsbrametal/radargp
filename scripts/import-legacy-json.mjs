// Importa um backup JSON gerado pela tela "Backup Dados" do sistema
// (formato: { tickets, projects, demandTypes, systems, appUsers, sponsors })
// para o Supabase.
//
// Uso:
//   SUPABASE_URL=https://SEU-PROJETO.supabase.co \
//   SUPABASE_SERVICE_ROLE_KEY=eyJ...  \
//   node scripts/import-legacy-json.mjs caminho/para/backup.json
//
// A SUPABASE_SERVICE_ROLE_KEY é a chave "service_role" (Project Settings > API)
// — NUNCA a anon key, e NUNCA rode este script no navegador. Ela é necessária
// para criar usuários no Supabase Auth (appUsers -> profiles) e para escrever
// direto nas tabelas ignorando RLS.
//
// O script é idempotente para tickets/projects/demandTypes/systems/sponsors
// (upsert por id). Para usuários (appUsers), ele PULA quem já existe
// (checagem por username em profiles) para não duplicar logins a cada rodada.

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

const [, , jsonPathArg] = process.argv;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!jsonPathArg) {
  console.error('Uso: node scripts/import-legacy-json.mjs caminho/para/backup.json');
  process.exit(1);
}
if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY nas variáveis de ambiente antes de rodar.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const raw = readFileSync(jsonPathArg, 'utf-8');
const backup = JSON.parse(raw);

// Tabelas "documento" simples: upsert direto, { id, data: <objeto inteiro> }.
async function importDocCollection(table, items, idField = 'id') {
  if (!Array.isArray(items) || items.length === 0) {
    console.log(`- ${table}: nada para importar.`);
    return;
  }
  const rows = items
    .filter((item) => item && item[idField])
    .map((item) => ({ id: String(item[idField]), data: item, updated_at: new Date().toISOString() }));

  const { error } = await supabase.from(table).upsert(rows);
  if (error) {
    console.error(`- ${table}: ERRO ao importar —`, error.message);
  } else {
    console.log(`- ${table}: ${rows.length} registro(s) importado(s).`);
  }
}

// appUsers -> cria login real no Supabase Auth + linha em profiles.
// Como o formato antigo não tinha e-mail (só username/password), sintetiza um
// e-mail em EMAIL_DOMAIN. Ajuste a variável abaixo antes de rodar, se quiser
// outro domínio, ou edite o JSON antes de importar para incluir "email" em
// cada usuário.
const EMAIL_DOMAIN = process.env.IMPORT_EMAIL_DOMAIN || 'empresa.local';

async function importUsers(appUsers) {
  if (!Array.isArray(appUsers) || appUsers.length === 0) {
    console.log('- appUsers: nada para importar.');
    return;
  }

  for (const u of appUsers) {
    if (!u.username) continue;

    const { data: existing } = await supabase.from('profiles').select('id').eq('username', u.username).maybeSingle();
    if (existing) {
      console.log(`  · usuário "${u.username}" já existe, pulando.`);
      continue;
    }

    const email = u.email || `${u.username}@${EMAIL_DOMAIN}`;
    const password = u.password && String(u.password).length >= 6 ? String(u.password) : `Troc@r${Math.floor(Math.random() * 100000)}`;

    const { data: created, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (createError || !created.user) {
      console.error(`  · ERRO ao criar login para "${u.username}":`, createError?.message);
      continue;
    }

    const { error: profileError } = await supabase.from('profiles').insert({
      id: created.user.id,
      username: u.username,
      name: u.name || u.username,
      email,
      roles: u.roles || (u.role ? [u.role] : ['Analista']),
      blocked: !!u.blocked,
    });
    if (profileError) {
      console.error(`  · ERRO ao gravar perfil de "${u.username}":`, profileError.message);
      await supabase.auth.admin.deleteUser(created.user.id);
      continue;
    }

    console.log(`  · usuário "${u.username}" criado (${email} / senha inicial: ${password}).`);
  }
}

async function main() {
  console.log('Importando backup para o Supabase...\n');
  await importDocCollection('tickets', backup.tickets);
  await importDocCollection('projects', backup.projects);
  await importDocCollection('demandTypes', backup.demandTypes);
  await importDocCollection('systems', backup.systems);
  await importDocCollection('sponsors', backup.sponsors);
  console.log('- appUsers:');
  await importUsers(backup.appUsers);
  console.log('\nImportação concluída. Guarde as senhas iniciais impressas acima — cada usuário deve trocá-la no primeiro acesso.');
}

main().catch((err) => {
  console.error('Falha na importação:', err);
  process.exit(1);
});
