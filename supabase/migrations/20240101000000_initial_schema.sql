-- ==============================================================================
-- MIGRATION: 20240101000000_initial_schema.sql
-- Descrição: Estrutura inicial das tabelas do AutoLava no PostgreSQL / Supabase
-- Tabelas: company_profile, services, clients, goals_config, service_launches
-- ==============================================================================

-- 0. Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. TABELA DE DADOS DA EMPRESA (Configurações, PIX, Banco e Logo)
CREATE TABLE IF NOT EXISTS public.company_profile (
  id TEXT PRIMARY KEY DEFAULT 'default',
  cnpj TEXT NOT NULL DEFAULT '',
  razao_social TEXT NOT NULL DEFAULT '',
  nome_fantasia TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  telefone TEXT NOT NULL DEFAULT '',
  endereco TEXT NOT NULL DEFAULT '',
  dados_bancarios JSONB NOT NULL DEFAULT '{
    "banco": "",
    "agencia": "",
    "conta": "",
    "tipoConta": "Conta Corrente",
    "chavePix": "",
    "tipoChavePix": "CNPJ"
  }'::jsonb,
  logo_url TEXT DEFAULT '',
  is_configured BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

COMMENT ON TABLE public.company_profile IS 'Dados cadastrais, fiscais e bancários da empresa proprietária do sistema';

-- 2. TABELA DE SERVIÇOS (Catálogo de Serviços Automotivos)
CREATE TABLE IF NOT EXISTS public.services (
  id TEXT PRIMARY KEY,
  codigo TEXT NOT NULL DEFAULT '',
  nome TEXT NOT NULL,
  categoria TEXT NOT NULL DEFAULT 'Passeio / Leve',
  preco_padrao NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (preco_padrao >= 0),
  descricao TEXT DEFAULT '',
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

COMMENT ON TABLE public.services IS 'Catálogo central de serviços oferecidos com preço base de balcão';

-- 3. TABELA DE CLIENTES (Pessoa Física e Jurídica com Tabela de Preço por Contrato)
CREATE TABLE IF NOT EXISTS public.clients (
  id TEXT PRIMARY KEY,
  cnpj TEXT NOT NULL DEFAULT '',
  razao_social TEXT NOT NULL DEFAULT '',
  nome_fantasia TEXT NOT NULL,
  email TEXT NOT NULL DEFAULT '',
  telefone TEXT NOT NULL DEFAULT '',
  endereco TEXT DEFAULT '',
  tabela_precos JSONB NOT NULL DEFAULT '{}'::jsonb,
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TEXT DEFAULT TO_CHAR(NOW(), 'YYYY-MM-DD'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

COMMENT ON TABLE public.clients IS 'Clientes cadastrados e tabelas de preços personalizadas para frotas corporativas';

-- 4. TABELA DE METAS OPERACIONAIS E FINANCEIRAS
CREATE TABLE IF NOT EXISTS public.goals_config (
  id TEXT PRIMARY KEY DEFAULT 'default',
  meta_diaria NUMERIC(10, 2) NOT NULL DEFAULT 800.00 CHECK (meta_diaria >= 0),
  meta_semanal NUMERIC(10, 2) NOT NULL DEFAULT 4800.00 CHECK (meta_semanal >= 0),
  meta_mensal NUMERIC(10, 2) NOT NULL DEFAULT 22000.00 CHECK (meta_mensal >= 0),
  meta_diaria_qtd INTEGER NOT NULL DEFAULT 12 CHECK (meta_diaria_qtd >= 0),
  meta_semanal_qtd INTEGER NOT NULL DEFAULT 70 CHECK (meta_semanal_qtd >= 0),
  meta_mensal_qtd INTEGER NOT NULL DEFAULT 300 CHECK (meta_mensal_qtd >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

COMMENT ON TABLE public.goals_config IS 'Metas operacionais e financeiras de faturamento e quantidade de veículos';

-- 5. TABELA DE LANÇAMENTOS / ORDENS DE SERVIÇO (OS)
CREATE TABLE IF NOT EXISTS public.service_launches (
  id TEXT PRIMARY KEY,
  numero_os TEXT NOT NULL,
  data_hora TEXT NOT NULL,
  cliente_id TEXT REFERENCES public.clients(id) ON DELETE SET NULL,
  cliente_nome TEXT NOT NULL,
  cliente_cnpj TEXT DEFAULT '',
  placa TEXT NOT NULL,
  modelo TEXT NOT NULL,
  km TEXT DEFAULT '',
  responsavel TEXT NOT NULL,
  nome_condutor TEXT NOT NULL,
  matricula_condutor TEXT NOT NULL,
  servicos JSONB NOT NULL DEFAULT '[]'::jsonb,
  valor_total NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (valor_total >= 0),
  assinatura TEXT DEFAULT '',
  observacoes TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'Concluído',
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

COMMENT ON TABLE public.service_launches IS 'Ordens de serviço executadas com detalhes de condutor, serviços e assinatura digital';
