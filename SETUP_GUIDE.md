# 📝 PRÓXIMAS ETAPAS - Vitalis App

Seu projeto foi enviado com segurança para: **https://github.com/joaoCanonica/appfitness.git**

---

## 🔧 Configuração Final (Essencial)

### 1️⃣ Prepare as Credenciais Supabase Localmente

```bash
# Clone seu repositório
git clone https://github.com/joaoCanonica/appfitness.git
cd appfitness

# Copie o template para arquivo local
cp js/supabase.example.js js/supabase.js

# Edite com suas credenciais reais
nano js/supabase.js
# ou
code js/supabase.js
```

### 2️⃣ Obter Credenciais do Supabase

1. Acesse **https://app.supabase.com**
2. Selecione seu projeto
3. Vá para **Settings → API**
4. Copie:
   - `Project URL` → `SUPABASE_URL`
   - `anon public` → `SUPABASE_ANON`

### 3️⃣ Editar `js/supabase.js`

```javascript
// js/supabase.js (ARQUIVO LOCAL - NÃO COMMITAR)
const SUPABASE_URL  = 'https://seu-projeto-abc123.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
// ... resto do arquivo
```

### 4️⃣ Testar Localmente

```bash
# Use um servidor local (não abra arquivo direto)
python3 -m http.server 8000

# Abra http://localhost:8000 no navegador
```

---

## 🛠️ Próximas Tarefas

### A) Configurar Supabase Database

Crie as tabelas necessárias no Supabase:

#### Tabela: `professionals`
```sql
create table professionals (
  id uuid primary key default auth.uid(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  academy_name text,
  email text unique,
  phone text,
  primary_color text default '#6366F1',
  created_at timestamp default now(),
  updated_at timestamp default now()
);

alter table professionals enable row level security;
create policy "Users can view and edit their own data"
  on professionals for all
  using (auth.uid() = user_id);
```

#### Tabela: `students`
```sql
create table students (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid references professionals(id) on delete cascade,
  name text not null,
  email text,
  phone text,
  birth_date date,
  notes text,
  active boolean default true,
  created_at timestamp default now()
);

alter table students enable row level security;
create policy "Pros can view their own students"
  on students for select
  using (professional_id = auth.uid());
```

#### Tabela: `assessments`
```sql
create table assessments (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid references professionals(id),
  student_id uuid references students(id),
  link_token text unique,
  nome text,
  idade int,
  genero text,
  altura numeric,
  peso numeric,
  imc numeric,
  tmb numeric,
  tdee int,
  agua_ml int,
  objetivo text,
  nivel text,
  -- ... outros campos
  created_at timestamp default now()
);

alter table assessments enable row level security;
```

#### Tabela: `assessment_links`
```sql
create table assessment_links (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid references professionals(id),
  student_id uuid references students(id),
  token text unique not null,
  used boolean default false,
  expires_at timestamp default now() + interval '7 days',
  created_at timestamp default now()
);
```

#### Tabela: `workout_plans`
```sql
create table workout_plans (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid references assessments(id),
  professional_id uuid references professionals(id),
  student_id uuid references students(id),
  plan jsonb,
  edited_manually boolean default false,
  created_at timestamp default now(),
  updated_at timestamp default now()
);
```

### B) Ativar Autenticação

1. Vá para **Supabase → Authentication**
2. Ative **Email/Password**
3. Configure **SMTP** para emails (opcional mas recomendado)
4. Ative **Social Login** (Google, GitHub) se desejar

### C) Configurar Row Level Security (RLS)

⚠️ **CRÍTICO PARA SEGURANÇA!**

```sql
-- Exemplo: Students - profissional acessa apenas seus alunos
create policy "read own students" on students for select
  using (professional_id = auth.uid());

create policy "create own students" on students for insert
  with check (professional_id = auth.uid());

create policy "update own students" on students for update
  using (professional_id = auth.uid());
```

---

## 🚀 Deploy em Produção

### Opção 1: Vercel (Recomendado)

```bash
npm install -g vercel
vercel

# Configurar Environment Variables no painel Vercel:
# VITE_SUPABASE_URL
# VITE_SUPABASE_ANON_KEY
```

### Opção 2: Netlify

1. Conecte seu repo GitHub
2. Branch: `main`
3. Build command: (deixe vazio, é static HTML)
4. Publish directory: `.` (raiz)
5. Adicione variáveis de ambiente

### Opção 3: GitHub Pages

```bash
# Settings → Pages
# Source: Deploy from a branch
# Branch: main
# Folder: / (root)
```

---

## ✅ Checklist de Segurança Final

- [ ] `js/supabase.js` contém suas credenciais (localmente, não versionado)
- [ ] `.gitignore` está funcionando (`git status` não mostra supabase.js)
- [ ] RLS está ativado em todas as tabelas
- [ ] Testou que usuário A não vê dados de usuário B
- [ ] Service_role key **NUNCA** está no código
- [ ] HTTPS está ativado em produção
- [ ] Email verification está ativado
- [ ] Backups do Supabase estão configurados

---

## 📞 Troubleshooting

### "Erro: Substitua os valores placeholder..."
```bash
# Significa que js/supabase.js ainda tem valores padrão
# Edite o arquivo com suas credenciais reais
```

### "Supabase retorna 403 Forbidden"
- Verifique RLS em Supabase Dashboard
- Confirme que `professional_id` corresponde a `auth.uid()`

### "CORS error"
- Vá para Supabase: **Settings → Security → Redirect patterns**
- Adicione seu domínio: `https://seu-dominio.com/*`

---

## 📚 Recursos Úteis

- [Supabase Documentation](https://supabase.com/docs)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [JavaScript Client Docs](https://supabase.com/docs/reference/javascript)
- [OWASP Security Best Practices](https://owasp.org)

---

## 🎯 Resumo

✅ **Feito:**
- Git setup com segurança
- .gitignore protegendo credenciais
- README e docs criados
- Enviado para GitHub com segurança

⏳ **Próximo:**
- Criar tabelas no Supabase
- Configurar RLS
- Adicionar `js/supabase.js` localmente
- Testar e fazer deploy

---

**Data**: 9 de julho de 2026  
**Status**: ✅ Pronto para desenvolvimento

