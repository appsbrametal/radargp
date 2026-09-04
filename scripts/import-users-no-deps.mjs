// Importa só os USUÁRIOS (appUsers) do backup para o Supabase — sem depender
// de nenhum pacote npm (não precisa de "npm install" pra rodar isso). Usa só
// recursos nativos do Node.js (fetch, fs), chamando a API REST do Supabase
// diretamente.
//
// Uso (PowerShell), dentro da pasta do projeto:
//   $env:SUPABASE_URL="https://SEU-PROJETO.supabase.co"
//   $env:SUPABASE_SERVICE_ROLE_KEY="sua-secret-key"
//   node scripts/import-users-no-deps.mjs "caminho\para\backup.json"
//
// Se sua rede tiver inspeção de HTTPS corporativa (mesmo problema do
// certificado que travou o npm), rode antes:
//   $env:NODE_TLS_REJECT_UNAUTHORIZED="0"
// (desliga a checagem de certificado só para esta execução do script —
// aceitável aqui porque é uma chamada pontual, sua, para o seu próprio
// projeto Supabase; não deixe essa variável configurada permanentemente.)

import { readFileSync } from 'node:fs';

const [, , jsonPathArg] = process.argv;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const EMAIL_DOMAIN = process.env.IMPORT_EMAIL_DOMAIN || 'brametal.com.br';

if (!jsonPathArg || !SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Uso: defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY e rode:');
  console.error('  node scripts/import-users-no-deps.mjs caminho\\para\\backup.json');
  process.exit(1);
}

const backup = JSON.parse(readFileSync(jsonPathArg, 'utf-8'));
const appUsers = backup.appUsers || [];

const headers = {
  apikey: SERVICE_ROLE_KEY,
  Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
  'Content-Type': 'application/json',
};

async function userExists(username) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/profiles?username=eq.${encodeURIComponent(username)}&select=id`, { headers });
  if (!res.ok) return false;
  const data = await res.json();
  return Array.isArray(data) && data.length > 0;
}

async function createAuthUser(email, password) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ email, password, email_confirm: true }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.msg || data.error_description || JSON.stringify(data));
  return data; // { id, email, ... }
}

async function createProfile(profile) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
    method: 'POST',
    headers: { ...headers, Prefer: 'return=minimal' },
    body: JSON.stringify(profile),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text);
  }
}

async function deleteAuthUser(id) {
  try {
    await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${id}`, { method: 'DELETE', headers });
  } catch {
    /* melhor esforço: se o perfil falhar, tenta desfazer o login criado */
  }
}

async function main() {
  console.log(`Importando ${appUsers.length} usuário(s)...\n`);
  let ok = 0;
  let skipped = 0;
  let failed = 0;

  for (const u of appUsers) {
    if (!u.username) continue;

    if (await userExists(u.username)) {
      console.log(`  · "${u.username}" já existe, pulando.`);
      skipped++;
      continue;
    }

    const email = u.email || `${u.username}@${EMAIL_DOMAIN}`;
    const password = u.password && String(u.password).length >= 6 ? String(u.password) : `Troc@r${Math.floor(Math.random() * 100000)}`;

    try {
      const created = await createAuthUser(email, password);
      try {
        await createProfile({
          id: created.id,
          username: u.username,
          name: u.name || u.username,
          email,
          roles: u.roles || (u.role ? [u.role] : ['Analista']),
          blocked: !!u.blocked,
        });
      } catch (profileErr) {
        await deleteAuthUser(created.id);
        throw profileErr;
      }
      console.log(`  · "${u.username}" criado (${email} / senha inicial: ${password})`);
      ok++;
    } catch (err) {
      console.error(`  · ERRO ao criar "${u.username}":`, err.message);
      failed++;
    }
  }

  console.log(`\nConcluído. ${ok} criado(s), ${skipped} já existia(m), ${failed} com erro.`);
  console.log('Guarde as senhas iniciais impressas acima — cada usuário deve trocá-la no primeiro acesso (ícone de perfil, dentro do app).');
}

main();
