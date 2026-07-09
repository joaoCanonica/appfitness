# 🔐 Guia de Segurança - Vitalis

## ⚠️ Segurança Crítica

Este documento descreve como manter as credenciais seguras.

### 1. Proteção de Chaves de API

**NUNCA** faça commit dos seguintes arquivos:
- ❌ `js/supabase.js` (com chaves reais)
- ❌ `.env` (com credenciais)
- ❌ Qualquer arquivo com tokens

**SEMPRE** use:
- ✅ `.env.example` - Template com placeholders
- ✅ `js/supabase.example.js` - Template com instruções
- ✅ `.gitignore` - Protege os arquivos acima

### 2. Verificar que Arquivo Está Protegido

```bash
# Verificar que supabase.js NÃO aparece no git
git status
# Não deve listar: js/supabase.js

# Se já foi commitado por erro, remova do histórico:
git rm --cached js/supabase.js
git commit -m "Remover credenciais expostas"
# IMPORTANTE: Regenerar chaves no Supabase Dashboard!
```

### 3. Configuração Local Segura

**Passo 1**: Clone o repositório
```bash
git clone https://github.com/joaoCanonica/appfitness.git
cd appfitness
```

**Passo 2**: Crie arquivo de configuração local
```bash
cp js/supabase.example.js js/supabase.js
```

**Passo 3**: Edite `js/supabase.js` com suas credenciais
```javascript
// js/supabase.js (local, não versionado)
const SUPABASE_URL  = 'https://seu-projeto-real.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'; // Chave real
```

**Passo 4**: Confirme que git ignora o arquivo
```bash
git status
# Não deve aparecer: js/supabase.js ✓
```

---

## 🛡️ Row Level Security (RLS) - CRÍTICO

**SUA SEGURANÇA DEPENDE DISTO!**

O arquivo `supabase.js` contém apenas a chave ANON (não service_role). A proteção real vem do RLS no banco:

### Exemplo: Tabela `professionals`

```sql
-- 1. Ativar RLS
ALTER TABLE professionals ENABLE ROW LEVEL SECURITY;

-- 2. Usuários veem apenas seu próprio perfil
CREATE POLICY "Ver próprio perfil"
  ON professionals
  FOR SELECT
  USING (auth.uid() = user_id);

-- 3. Usuários atualizam apenas seu perfil
CREATE POLICY "Atualizar próprio perfil"
  ON professionals
  FOR UPDATE
  USING (auth.uid() = user_id);

-- 4. Apenas sistema pode fazer INSERT (via trigger)
CREATE POLICY "Admin pode inserir"
  ON professionals
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');
```

### Exemplo: Tabela `students`

```sql
ALTER TABLE students ENABLE ROW LEVEL SECURITY;

-- Profissional vê apenas seus alunos
CREATE POLICY "Ver alunos própios"
  ON students
  FOR SELECT
  USING (professional_id = auth.uid());

-- Profissional atualiza apenas seus alunos
CREATE POLICY "Atualizar alunos própios"
  ON students
  FOR UPDATE
  USING (professional_id = auth.uid());
```

---

## 🔑 Gerenciando Chaves no Supabase

### Onde Encontrar Suas Chaves

1. Acesse **https://app.supabase.com**
2. Selecione seu projeto
3. Vá para **Settings → API**
4. Copie:
   - ✅ `Project URL` → SUPABASE_URL
   - ✅ `anon public` → SUPABASE_ANON (usar no frontend)
   - ❌ `service_role secret` → NUNCA NO FRONTEND!

### Rotar Chaves (Se Vazar)

1. Vá para **Settings → API**
2. Clique em **Rotate Key** na anon key
3. Todas as conexões antigas invalidam
4. Atualize seu arquivo `js/supabase.js` localmente
5. **NÃO commitar**

---

## 🚨 Se Credenciais Vazarem

**AÇÃO IMEDIATA:**

1. Vá ao Supabase Dashboard
2. **Settings → API → Rotate Key** (regenerar chave)
3. Espere 1-2 minutos para propagar
4. No GitHub:
   ```bash
   # Remover do histórico (se foi commitado)
   git filter-branch --tree-filter 'rm -f js/supabase.js' HEAD
   git push origin --force-with-lease main
   ```
5. Avisar usuários se houve acesso não autorizado

---

## ✅ Checklist de Segurança

Antes de fazer push:

- [ ] `js/supabase.js` **NÃO** está no git (`git status` não mostra)
- [ ] `.gitignore` existe e contém `js/supabase.js`
- [ ] `js/supabase.example.js` tem instruções claras
- [ ] README.md tem guia de setup com segurança
- [ ] RLS está ativado em todas as tabelas
- [ ] Testou que um usuário não acessa dados de outro
- [ ] Service_role key **NUNCA** está no código
- [ ] Não há logs com credenciais no repositório

---

## 📖 Referências

- [Supabase: Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase: API Keys](https://supabase.com/docs/learn/auth/auth-deep-dive/auth-api-keys)
- [OWASP: API Security](https://owasp.org/API-Security/)
- [GitHub: Managing Sensitive Data](https://docs.github.com/en/code-security/secret-scanning)

---

## 🆘 Suporte Segurança

Dúvidas de segurança? Consulte antes de fazer deploy em produção!
