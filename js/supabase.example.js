/* VITALIS — supabase.js
   ⚠️ ARQUIVO DE EXEMPLO - NÃO FAZER COMMIT DE supabase.js COM CHAVES REAIS
   
   Instruções de Setup:
   1. Copie este arquivo para 'supabase.js' (na mesma pasta)
   2. Substitua os valores placeholder pelos seus valores reais do Supabase
   3. O arquivo 'supabase.js' está no .gitignore e NÃO será versionado no GitHub
   
   ⚠️ SEGURANÇA:
   - Sua chave anon deve estar protegida por Row Level Security (RLS) no Supabase
   - Nunca faça commit de supabase.js com chaves reais
   - A service_role key NUNCA fica no frontend
*/

// Substitua pelos seus valores do Supabase Dashboard
const SUPABASE_URL  = 'https://SEU_PROJECT_ID.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...SUA_ANON_KEY_AQUI...';

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON);

// Token de avaliação (quando aluno acessa via link)
const urlParams  = new URLSearchParams(window.location.search);
const LINK_TOKEN = urlParams.get('token') || null;
