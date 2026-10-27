# AutoLava · Sistema de Gestão Operacional de Serviços Automotivos e Frotas

Sistema completo de controle para lava jato, estética automotiva e frotas corporativas, com suporte a ordens de serviço com assinatura digital, tabelas de preços customizadas por cliente corporativo, controle de metas e emissão de relatórios profissionais em PDF e Excel.

---

## 🚀 Arquitetura & Infraestrutura (GitHub + Vercel + Supabase)

O sistema foi preparado para rodar com alta performance e confiabilidade usando a seguinte stack:

1. **GitHub**: Controle de versão e hospedagem do código-fonte.
2. **Vercel**: Deploy contínuo (CI/CD) com certificado SSL automático e configuração SPA (`vercel.json`).
3. **Supabase (PostgreSQL + RLS)**: Banco de dados relacional na nuvem para persistência multiusuário e armazenamento de assinaturas.

---

## 🛠️ Passo a Passo para Configurar a Infraestrutura

### 1. Banco de Dados no Supabase

Você pode configurar o banco de dados de duas formas:

#### Opção A: Via Migrations (Supabase CLI / CI/CD)
O projeto inclui a pasta oficial `supabase/migrations/`:
- `20240101000000_initial_schema.sql`: Estrutura das 5 tabelas com JSONB e FKs
- `20240101000001_indexes_and_performance.sql`: Índices otimizados e trigger automático de `updated_at`
- `20240101000002_rls_security_policies.sql`: Políticas de segurança Row Level Security (RLS)
- `20240101000003_storage_and_seed.sql`: Bucket de imagens e catálogo padrão de 6 serviços automotivos

Comando para aplicar via terminal:
```bash
npx supabase login
npx supabase link --project-ref SEU_PROJECT_ID
npx supabase db push
```

#### Opção B: Via SQL Editor (Cópia Direta)
1. Crie uma conta gratuita em [supabase.com](https://supabase.com).
2. Clique em **New Project** e escolha uma região (ex.: São Paulo `sa-east-1` ou US East).
3. Após o projeto ser provisionado, vá em **SQL Editor** no menu lateral esquerdo.
4. Abra o arquivo `supabase_schema.sql` deste projeto, copie todo o conteúdo e cole no SQL Editor do Supabase.
5. Clique em **Run** (Executar). Todas as 5 tabelas (`company_profile`, `services`, `clients`, `goals_config`, `service_launches`), índices e políticas RLS serão criadas instantaneamente.
6. Vá em **Project Settings > API** e copie:
   - **Project URL**
   - **anon public API Key**

---

### 2. Repositório no GitHub
1. Inicialize o repositório local e envie seus arquivos:
```bash
git init
git add .
git commit -m "AutoLava: Sistema completo integrado com GitHub, Vercel e Supabase"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/autolava.git
git push -u origin main
```

---

### 3. Deploy Contínuo na Vercel
1. Acesse [vercel.com](https://vercel.com) e conecte com seu GitHub.
2. Clique em **Add New... > Project** e importe o repositório `autolava`.
3. Na seção **Environment Variables**, adicione as seguintes variáveis obtidas no Supabase:
   - `VITE_SUPABASE_URL`: sua URL do projeto (ex.: `https://xyzcompany.supabase.co`)
   - `VITE_SUPABASE_ANON_KEY`: sua chave pública `anon`
4. Clique em **Deploy**.
5. Em menos de 1 minuto, seu sistema estará online com domínio HTTPS gratuito e atualizações automáticas a cada `git push`!

---

## 💡 Recursos do Sistema

- **Primeiro Acesso**: Cadastro dos dados da sua empresa (CNPJ, Razão Social, Nome Fantasia, E-mail, Telefone, Endereço, Logotipo e Dados Bancários com PIX).
- **Lançamentos & O.S.**:
  - Placa, modelo, KM, responsável, condutor e matrícula.
  - Tabela dinâmica de serviços e cálculo de valores totais.
  - **Canvas de assinatura digital** na tela (touch / mouse).
- **Cadastro de Clientes**:
  - CNPJ, Razão Social, Nome Fantasia, contato.
  - **Tabela de Preços Personalizada por Cliente** (preços contratuais diferenciados para frotas).
- **Cadastro de Serviços**:
  - Nome, código, categoria e preço base de balcão.
- **Planejamento de Metas**:
  - Metas diárias, semanais e mensais (em R$ e quantidade de veículos).
  - Barras de progresso e previsões.
- **Relatórios Gerenciais**:
  - Filtros por período pré-definido (Hoje, Esta Semana, Este Mês) ou datas customizadas.
  - Filtro por cliente e busca por placa/OS.
  - Cabeçalho padronizado com os dados cadastrais da sua empresa.
  - Exportação direta para **PDF** (com formatação limpa e assinaturas) e planilha **Excel (.xlsx)**.
- **Sincronização Nuvem & Offline First**:
  - Funciona imediatamente no navegador com salvamento local.
  - Conecta ao Supabase com 1 clique para sincronização em nuvem e backup seguro.
