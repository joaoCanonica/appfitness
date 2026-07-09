/* VITALIS — supabase.js
   ⚠️ ARQUIVO LOCAL - NÃO VERSIONADO NO GIT (protegido por .gitignore)
   
   Instruções:
   1. Substitua os valores placeholder pelos seus valores reais do Supabase
   2. Nunca faça commit deste arquivo com chaves reais
   3. Este arquivo está em .gitignore - é seguro
   
   ⚠️ SEGURANÇA:
   - Usar apenas chave ANON (não service_role!)
   - RLS deve estar ativado no Supabase para proteger os dados
   - A service_role key NUNCA fica no frontend
*/

// ❗ SUBSTITUA PELOS SEUS VALORES DO SUPABASE DASHBOARD
// Settings → API → Project URL e anon public key
const SUPABASE_URL  = 'https://SEU_PROJECT_ID.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...SUA_ANON_KEY_AQUI...';

// Validação de segurança
if (SUPABASE_URL.includes('SEU_PROJECT_ID')) {
  console.error('❌ ERRO: Substitua os valores placeholder em js/supabase.js!');
  console.error('📖 Leia SECURITY.md ou README.md para instruções');
}

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON);

// Token de avaliação (quando aluno acessa via link)
const urlParams  = new URLSearchParams(window.location.search);
const LINK_TOKEN = urlParams.get('token') || null;