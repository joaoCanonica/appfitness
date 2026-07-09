# 🏋️ Vitalis — Fitness OS v2

Plataforma inteligente de avaliação e planejamento fitness com integração Supabase.

## ✨ Características

- **Dashboard do Profissional**: Gerencie alunos, avaliações e planos de treino
- **Avaliação Inteligente**: Formulário com 9 etapas para coleta completa de dados
- **Análise Automática**: Cálculo de IMC, TMB, TDEE e recomendações personalizadas
- **Plano de Treino Adaptado**: Gerado automaticamente conforme objetivo e disponibilidade
- **PDF Export**: Exporte resultados e planos em PDF
- **Tema Claro/Escuro**: Interface adaptável com armazenamento local
- **Responsive**: Otimizado para desktop e mobile

---

## 🔐 Segurança e Setup

### ⚠️ IMPORTANTE: Proteger Chaves de API

Este projeto usa Supabase. As chaves de API **NÃO** devem ser commitadas no GitHub.

### Passo 1: Configurar Arquivo Local de Segurança

```bash
# 1. Copie o arquivo de exemplo
cp js/supabase.example.js js/supabase.js

# 2. Abra js/supabase.js e substitua os valores:
# - SUPABASE_URL: da sua console Supabase
# - SUPABASE_ANON: da sua console Supabase (chave anon, não service_role!)
```

### Passo 2: Verificar .gitignore

O arquivo `.gitignore` já protege:
- ✅ `js/supabase.js` (não será versionado)
- ✅ `.env` e `.env.local`
- ✅ `node_modules/`, `.vscode/`, `.DS_Store`

### Passo 3: Verificar Row Level Security no Supabase

Sua segurança depende de RLS correto:

```sql
-- Exemplo: Tabela de alunos - apenas o profissional acessa seus alunos
ALTER TABLE students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso próprio dos alunos"
  ON students
  FOR SELECT
  USING (professional_id = auth.uid());
```

**Nunca** use sua `service_role key` no frontend!

---

## 📦 Instalação

### Requisitos
- Navegador moderno (Chrome, Firefox, Safari, Edge)
- Conta Supabase (gratuita em https://supabase.com)

### Setup Local

```bash
# 1. Clone o repositório
git clone https://github.com/joaoCanonica/appfitness.git
cd appfitness

# 2. Configure suas credenciais Supabase
cp js/supabase.example.js js/supabase.js
# Edite js/supabase.js com seus valores

# 3. Abra no navegador
# Opção A: Abra index.html diretamente
open index.html

# Opção B: Use um servidor local (recomendado)
python3 -m http.server 8000
# Acesse http://localhost:8000
```

---

## 🏗️ Estrutura do Projeto

```
appfitness/
├── index.html           # HTML principal com todas as telas
├── css/
│   └── style.css       # Estilos (light/dark theme)
├── js/
│   ├── app.js          # Lógica principal da app
│   ├── supabase.js     # ⚠️ Configuração (NÃO commitado - crie localmente)
│   └── supabase.example.js # Exemplo com instruções
├── .gitignore          # Arquivos ignorados no git
└── README.md           # Este arquivo
```

---

## 🔑 Variáveis de Ambiente

Se em o futuro implementar build process (Vite, Webpack), use:

```bash
# .env.example
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
```

```bash
# .env (local, nunca commitar!)
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua_chave_aqui
```

---

## 📚 Documentação Supabase

- [Criar Projeto](https://supabase.com/docs/guides/getting-started/setup)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Autenticação](https://supabase.com/docs/guides/auth)
- [Supabase JS Client](https://supabase.com/docs/reference/javascript)

---

## 🚀 Deploy

### Opção 1: Vercel (Recomendado)
```bash
npm install -g vercel
vercel
# Configure variáveis de ambiente no painel: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
```

### Opção 2: Netlify
```bash
npm run build
# Drag & drop a pasta 'dist' no Netlify
# Configure variáveis de ambiente no painel Netlify
```

### Opção 3: GitHub Pages
```bash
# Ativar GitHub Pages nas configurações do repo
# Apontar para branch 'main', pasta 'root'
# Configurar secrets: SUPABASE_URL, SUPABASE_ANON_KEY
```

---

## 🛡️ Checklist de Segurança

- [ ] Copiar `js/supabase.example.js` → `js/supabase.js`
- [ ] Adicionar credenciais reais do Supabase em `js/supabase.js`
- [ ] Confirmar que `js/supabase.js` está em `.gitignore`
- [ ] Rodar `git status` e verificar que supabase.js NÃO aparece
- [ ] Ativar RLS em todas as tabelas Supabase
- [ ] Testar que dados são isolados por usuário
- [ ] Nunca commitar `.env` ou credenciais
- [ ] Em caso de vazamento, regenerar chaves no Supabase Dashboard

---

## 🐛 Troubleshooting

### "Supabase não está definido"
- Verifique se `index.html` carrega o script Supabase: `<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/..."></script>`

### "Erro de origem (CORS)"
- Supabase deve ter sua origem configurada em Settings → Security → Redirect Pattern

### "Erro RLS: Acesso negado"
- Verifique policies no Supabase. Às vezes é `auth.uid()` vs `auth.user().id`

### "localStorage erro em incógnito"
- Código já tem try/catch para este caso

---

## 📝 Licença

Este projeto é de uso livre. Credite Vitalis.

---

## 👨‍💻 Autor

João Canônica | Desenvolvedor

---

## 🆘 Suporte

Dúvidas sobre segurança? Consulte:
- [OWASP: API Security](https://owasp.org/API-Security/)
- [Supabase Security Best Practices](https://supabase.com/docs/guides/auth/row-level-security)

---

**Última atualização**: 9 de julho de 2026  
**Versão**: 2.0
